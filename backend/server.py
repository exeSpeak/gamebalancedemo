from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
import uuid
from datetime import datetime


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models for Game Balancing System
class AttributeModifier(BaseModel):
    attribute: str  # e.g., "strength", "dexterity"
    multiplier: float = 1.0  # how much this attribute affects the stat
    base_bonus: float = 0.0  # flat bonus per point

class StatDefinition(BaseModel):
    name: str
    base_value: float
    modifiers: List[AttributeModifier] = []
    per_level_bonus: float = 0.0

class Character(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    level: int = 1
    base_attributes: Dict[str, float]  # e.g., {"strength": 10, "dexterity": 10}
    calculated_stats: Dict[str, float] = {}  # calculated from attributes and level
    character_class: Optional[str] = None

class Enemy(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    enemy_type: str
    level: int = 1
    base_stats: Dict[str, float]
    calculated_stats: Dict[str, float] = {}

class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    attributes: List[str] = ["strength", "dexterity", "constitution", "intelligence"]
    stat_definitions: List[StatDefinition] = []
    characters: List[Character] = []
    enemies: List[Enemy] = []
    features_enabled: Dict[str, bool] = {
        "attributes": True,
        "stats": True,
        "perks": True,
        "classes": True
    }
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ProjectCreate(BaseModel):
    name: str
    description: str = ""

class CharacterCreate(BaseModel):
    name: str
    level: int = 1
    base_attributes: Dict[str, float]
    character_class: Optional[str] = None

class EnemyCreate(BaseModel):
    name: str
    enemy_type: str
    level: int = 1
    base_stats: Dict[str, float]

class StatDefinitionCreate(BaseModel):
    name: str
    base_value: float
    modifiers: List[AttributeModifier] = []
    per_level_bonus: float = 0.0

# Helper function to calculate stats
def calculate_character_stats(character: Character, stat_definitions: List[StatDefinition]) -> Dict[str, float]:
    calculated = {}
    
    for stat_def in stat_definitions:
        # Start with base value
        total = stat_def.base_value
        
        # Add modifiers from attributes
        for modifier in stat_def.modifiers:
            attribute_value = character.base_attributes.get(modifier.attribute, 0)
            total += (attribute_value * modifier.multiplier) + modifier.base_bonus
        
        # Add level bonus
        total += (character.level - 1) * stat_def.per_level_bonus
        
        calculated[stat_def.name] = round(total, 1)
    
    return calculated

# Project Management Routes
@api_router.post("/projects", response_model=Project)
async def create_project(project_data: ProjectCreate):
    # Create default stat definitions
    default_stats = [
        StatDefinition(
            name="health",
            base_value=100,
            modifiers=[
                AttributeModifier(attribute="constitution", multiplier=5.0, base_bonus=0)
            ],
            per_level_bonus=10.0
        ),
        StatDefinition(
            name="mana",
            base_value=50,
            modifiers=[
                AttributeModifier(attribute="intelligence", multiplier=3.0, base_bonus=0)
            ],
            per_level_bonus=5.0
        ),
        StatDefinition(
            name="power",
            base_value=20,
            modifiers=[
                AttributeModifier(attribute="strength", multiplier=2.0, base_bonus=0)
            ],
            per_level_bonus=2.0
        ),
        StatDefinition(
            name="initiative",
            base_value=10,
            modifiers=[
                AttributeModifier(attribute="dexterity", multiplier=1.5, base_bonus=0)
            ],
            per_level_bonus=1.0
        )
    ]
    
    project = Project(
        **project_data.dict(),
        stat_definitions=default_stats
    )
    
    await db.projects.insert_one(project.dict())
    return project

@api_router.get("/projects", response_model=List[Project])
async def get_projects():
    projects = await db.projects.find().to_list(1000)
    return [Project(**project) for project in projects]

@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return Project(**project)

# Character Management Routes
@api_router.post("/projects/{project_id}/characters", response_model=Character)
async def create_character(project_id: str, character_data: CharacterCreate):
    # Get project to access stat definitions
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project_obj = Project(**project)
    
    character = Character(**character_data.dict())
    # Calculate initial stats
    character.calculated_stats = calculate_character_stats(character, project_obj.stat_definitions)
    
    # Add character to project
    project_obj.characters.append(character)
    await db.projects.replace_one({"id": project_id}, project_obj.dict())
    
    return character

@api_router.put("/projects/{project_id}/characters/{character_id}/level")
async def update_character_level(project_id: str, character_id: str, level: int):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project_obj = Project(**project)
    
    # Find and update character
    character_found = False
    for character in project_obj.characters:
        if character.id == character_id:
            character.level = max(1, level)  # Ensure level is at least 1
            character.calculated_stats = calculate_character_stats(character, project_obj.stat_definitions)
            character_found = True
            break
    
    if not character_found:
        raise HTTPException(status_code=404, detail="Character not found")
    
    await db.projects.replace_one({"id": project_id}, project_obj.dict())
    return {"message": "Character level updated", "level": level}

# Enemy Management Routes
@api_router.post("/projects/{project_id}/enemies", response_model=Enemy)
async def create_enemy(project_id: str, enemy_data: EnemyCreate):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project_obj = Project(**project)
    
    enemy = Enemy(**enemy_data.dict())
    # For enemies, calculated stats are the same as base stats for now
    enemy.calculated_stats = enemy.base_stats.copy()
    
    project_obj.enemies.append(enemy)
    await db.projects.replace_one({"id": project_id}, project_obj.dict())
    
    return enemy

@api_router.put("/projects/{project_id}/enemies/{enemy_id}/level")
async def update_enemy_level(project_id: str, enemy_id: str, level: int):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project_obj = Project(**project)
    
    # Find and update enemy
    enemy_found = False
    for enemy in project_obj.enemies:
        if enemy.id == enemy_id:
            enemy.level = max(1, level)
            # Simple scaling for enemies - multiply base stats by level factor
            level_multiplier = 1 + (enemy.level - 1) * 0.1  # 10% increase per level
            enemy.calculated_stats = {
                stat: round(value * level_multiplier, 1) 
                for stat, value in enemy.base_stats.items()
            }
            enemy_found = True
            break
    
    if not enemy_found:
        raise HTTPException(status_code=404, detail="Enemy not found")
    
    await db.projects.replace_one({"id": project_id}, project_obj.dict())
    return {"message": "Enemy level updated", "level": level}

# Stat Definition Management
@api_router.post("/projects/{project_id}/stats", response_model=StatDefinition)
async def create_stat_definition(project_id: str, stat_data: StatDefinitionCreate):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project_obj = Project(**project)
    
    stat_def = StatDefinition(**stat_data.dict())
    project_obj.stat_definitions.append(stat_def)
    
    # Recalculate all character stats
    for character in project_obj.characters:
        character.calculated_stats = calculate_character_stats(character, project_obj.stat_definitions)
    
    await db.projects.replace_one({"id": project_id}, project_obj.dict())
    return stat_def

@api_router.put("/projects/{project_id}/stats/{stat_name}")
async def update_stat_definition(project_id: str, stat_name: str, stat_data: StatDefinitionCreate):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project_obj = Project(**project)
    
    # Find and update the stat definition
    stat_found = False
    for i, stat_def in enumerate(project_obj.stat_definitions):
        if stat_def.name == stat_name:
            project_obj.stat_definitions[i] = StatDefinition(**stat_data.dict())
            stat_found = True
            break
    
    if not stat_found:
        raise HTTPException(status_code=404, detail="Stat definition not found")
    
    # Recalculate all character stats with new modifiers
    for character in project_obj.characters:
        character.calculated_stats = calculate_character_stats(character, project_obj.stat_definitions)
    
    await db.projects.replace_one({"id": project_id}, project_obj.dict())
    return {"message": "Stat definition updated successfully"}

@api_router.get("/projects/{project_id}/stats")
async def get_stat_definitions(project_id: str):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project_obj = Project(**project)
    return project_obj.stat_definitions

# Balance Comparison Route
@api_router.get("/projects/{project_id}/balance/{character_id}/{enemy_id}")
async def get_balance_comparison(project_id: str, character_id: str, enemy_id: str):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project_obj = Project(**project)
    
    character = next((c for c in project_obj.characters if c.id == character_id), None)
    enemy = next((e for e in project_obj.enemies if e.id == enemy_id), None)
    
    if not character or not enemy:
        raise HTTPException(status_code=404, detail="Character or enemy not found")
    
    return {
        "character": character,
        "enemy": enemy,
        "comparison": {
            "character_level": character.level,
            "enemy_level": enemy.level,
            "character_stats": character.calculated_stats,
            "enemy_stats": enemy.calculated_stats
        }
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()