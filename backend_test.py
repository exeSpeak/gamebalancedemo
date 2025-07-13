#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Game Balance Studio
Tests all backend APIs including project management, character management, 
stat calculation engine, enemy management, and balance comparison.
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Backend URL from environment
BACKEND_URL = "https://14a0b620-94ea-4700-8c17-8812e952b2dc.preview.emergentagent.com/api"

class GameBalanceStudioTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.test_project_id = None
        self.test_character_id = None
        self.test_enemy_id = None
        self.results = {
            "project_management": {"passed": 0, "failed": 0, "details": []},
            "character_management": {"passed": 0, "failed": 0, "details": []},
            "stat_calculation": {"passed": 0, "failed": 0, "details": []},
            "enemy_management": {"passed": 0, "failed": 0, "details": []},
            "balance_comparison": {"passed": 0, "failed": 0, "details": []}
        }

    def log_result(self, category: str, test_name: str, passed: bool, details: str = ""):
        """Log test result"""
        if passed:
            self.results[category]["passed"] += 1
            status = "✅ PASS"
        else:
            self.results[category]["failed"] += 1
            status = "❌ FAIL"
        
        self.results[category]["details"].append(f"{status}: {test_name} - {details}")
        print(f"{status}: {test_name} - {details}")

    def test_project_management(self):
        """Test Project Management API"""
        print("\n=== Testing Project Management API ===")
        
        # Test 1: Create a new project
        try:
            project_data = {
                "name": "Test RPG Project",
                "description": "A test project for character balancing"
            }
            response = requests.post(f"{self.base_url}/projects", json=project_data)
            
            if response.status_code == 200:
                project = response.json()
                self.test_project_id = project["id"]
                
                # Verify project has default stat definitions
                if len(project["stat_definitions"]) >= 4:
                    self.log_result("project_management", "Create Project", True, 
                                  f"Project created with ID {self.test_project_id} and {len(project['stat_definitions'])} default stats")
                else:
                    self.log_result("project_management", "Create Project", False, 
                                  f"Project created but missing default stat definitions (got {len(project['stat_definitions'])})")
            else:
                self.log_result("project_management", "Create Project", False, 
                              f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("project_management", "Create Project", False, f"Exception: {str(e)}")

        # Test 2: Get all projects
        try:
            response = requests.get(f"{self.base_url}/projects")
            if response.status_code == 200:
                projects = response.json()
                if len(projects) > 0:
                    self.log_result("project_management", "Get All Projects", True, 
                                  f"Retrieved {len(projects)} projects")
                else:
                    self.log_result("project_management", "Get All Projects", False, 
                                  "No projects returned")
            else:
                self.log_result("project_management", "Get All Projects", False, 
                              f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("project_management", "Get All Projects", False, f"Exception: {str(e)}")

        # Test 3: Get specific project
        if self.test_project_id:
            try:
                response = requests.get(f"{self.base_url}/projects/{self.test_project_id}")
                if response.status_code == 200:
                    project = response.json()
                    self.log_result("project_management", "Get Specific Project", True, 
                                  f"Retrieved project: {project['name']}")
                else:
                    self.log_result("project_management", "Get Specific Project", False, 
                                  f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_result("project_management", "Get Specific Project", False, f"Exception: {str(e)}")

    def test_character_management(self):
        """Test Character Management System"""
        print("\n=== Testing Character Management System ===")
        
        if not self.test_project_id:
            self.log_result("character_management", "Character Tests", False, 
                          "No test project available")
            return

        # Test 1: Create a character with custom attributes
        try:
            character_data = {
                "name": "Warrior Gandalf",
                "level": 1,
                "base_attributes": {
                    "strength": 15,
                    "dexterity": 12,
                    "constitution": 14,
                    "intelligence": 10
                },
                "character_class": "Warrior"
            }
            response = requests.post(f"{self.base_url}/projects/{self.test_project_id}/characters", 
                                   json=character_data)
            
            if response.status_code == 200:
                character = response.json()
                self.test_character_id = character["id"]
                
                # Verify calculated stats exist
                if character["calculated_stats"]:
                    expected_health = 100 + (14 * 5)  # base 100 + constitution(14) * 5
                    actual_health = character["calculated_stats"].get("health", 0)
                    
                    if abs(actual_health - expected_health) < 0.1:
                        self.log_result("character_management", "Create Character", True, 
                                      f"Character created with correct health: {actual_health}")
                    else:
                        self.log_result("character_management", "Create Character", False, 
                                      f"Health calculation incorrect. Expected: {expected_health}, Got: {actual_health}")
                else:
                    self.log_result("character_management", "Create Character", False, 
                                  "Character created but no calculated stats")
            else:
                self.log_result("character_management", "Create Character", False, 
                              f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("character_management", "Create Character", False, f"Exception: {str(e)}")

    def test_stat_calculation_engine(self):
        """Test Stat Calculation Engine - Core Feature"""
        print("\n=== Testing Stat Calculation Engine (Core Feature) ===")
        
        if not self.test_project_id or not self.test_character_id:
            self.log_result("stat_calculation", "Stat Calculation Tests", False, 
                          "No test project or character available")
            return

        # Test 1: Level up character and verify stat increases
        try:
            # Update character to level 5
            response = requests.put(f"{self.base_url}/projects/{self.test_project_id}/characters/{self.test_character_id}/level?level=5")
            
            if response.status_code == 200:
                # Get updated project to check character stats
                project_response = requests.get(f"{self.base_url}/projects/{self.test_project_id}")
                if project_response.status_code == 200:
                    project = project_response.json()
                    character = next((c for c in project["characters"] if c["id"] == self.test_character_id), None)
                    
                    if character:
                        # Verify level is updated
                        if character["level"] == 5:
                            # Calculate expected stats for level 5
                            # Health: base(100) + constitution(14)*5 + (level-1)*10 = 100 + 70 + 40 = 210
                            expected_health = 100 + (14 * 5) + (5 - 1) * 10
                            actual_health = character["calculated_stats"].get("health", 0)
                            
                            if abs(actual_health - expected_health) < 0.1:
                                self.log_result("stat_calculation", "Level Up Stat Calculation", True, 
                                              f"Level 5 health correct: {actual_health}")
                            else:
                                self.log_result("stat_calculation", "Level Up Stat Calculation", False, 
                                              f"Level 5 health incorrect. Expected: {expected_health}, Got: {actual_health}")
                        else:
                            self.log_result("stat_calculation", "Level Up Stat Calculation", False, 
                                          f"Character level not updated. Expected: 5, Got: {character['level']}")
                    else:
                        self.log_result("stat_calculation", "Level Up Stat Calculation", False, 
                                      "Character not found after level update")
                else:
                    self.log_result("stat_calculation", "Level Up Stat Calculation", False, 
                                  f"Failed to get project after level update: {project_response.status_code}")
            else:
                self.log_result("stat_calculation", "Level Up Stat Calculation", False, 
                              f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("stat_calculation", "Level Up Stat Calculation", False, f"Exception: {str(e)}")

        # Test 2: Verify all stat calculations are working
        try:
            project_response = requests.get(f"{self.base_url}/projects/{self.test_project_id}")
            if project_response.status_code == 200:
                project = project_response.json()
                character = next((c for c in project["characters"] if c["id"] == self.test_character_id), None)
                
                if character and character["calculated_stats"]:
                    stats = character["calculated_stats"]
                    level = character["level"]
                    attrs = character["base_attributes"]
                    
                    # Verify all expected stats exist
                    expected_stats = ["health", "mana", "power", "initiative"]
                    missing_stats = [stat for stat in expected_stats if stat not in stats]
                    
                    if not missing_stats:
                        # Verify power calculation: base(20) + strength(15)*2 + (level-1)*2
                        expected_power = 20 + (attrs["strength"] * 2) + (level - 1) * 2
                        actual_power = stats.get("power", 0)
                        
                        if abs(actual_power - expected_power) < 0.1:
                            self.log_result("stat_calculation", "All Stat Calculations", True, 
                                          f"All stats calculated correctly. Power: {actual_power}")
                        else:
                            self.log_result("stat_calculation", "All Stat Calculations", False, 
                                          f"Power calculation incorrect. Expected: {expected_power}, Got: {actual_power}")
                    else:
                        self.log_result("stat_calculation", "All Stat Calculations", False, 
                                      f"Missing stats: {missing_stats}")
                else:
                    self.log_result("stat_calculation", "All Stat Calculations", False, 
                                  "Character or calculated stats not found")
            else:
                self.log_result("stat_calculation", "All Stat Calculations", False, 
                              f"Failed to get project: {project_response.status_code}")
        except Exception as e:
            self.log_result("stat_calculation", "All Stat Calculations", False, f"Exception: {str(e)}")

    def test_enemy_management(self):
        """Test Enemy Management System"""
        print("\n=== Testing Enemy Management System ===")
        
        if not self.test_project_id:
            self.log_result("enemy_management", "Enemy Tests", False, 
                          "No test project available")
            return

        # Test 1: Create an enemy
        try:
            enemy_data = {
                "name": "Orc Warrior",
                "enemy_type": "Humanoid",
                "level": 1,
                "base_stats": {
                    "health": 80,
                    "power": 25,
                    "defense": 15
                }
            }
            response = requests.post(f"{self.base_url}/projects/{self.test_project_id}/enemies", 
                                   json=enemy_data)
            
            if response.status_code == 200:
                enemy = response.json()
                self.test_enemy_id = enemy["id"]
                
                # Verify calculated stats match base stats for level 1
                if enemy["calculated_stats"] == enemy["base_stats"]:
                    self.log_result("enemy_management", "Create Enemy", True, 
                                  f"Enemy created with correct initial stats")
                else:
                    self.log_result("enemy_management", "Create Enemy", False, 
                                  f"Enemy stats mismatch. Base: {enemy['base_stats']}, Calculated: {enemy['calculated_stats']}")
            else:
                self.log_result("enemy_management", "Create Enemy", False, 
                              f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("enemy_management", "Create Enemy", False, f"Exception: {str(e)}")

        # Test 2: Level up enemy and verify scaling
        if self.test_enemy_id:
            try:
                response = requests.put(f"{self.base_url}/projects/{self.test_project_id}/enemies/{self.test_enemy_id}/level?level=3")
                
                if response.status_code == 200:
                    # Get updated project to check enemy stats
                    project_response = requests.get(f"{self.base_url}/projects/{self.test_project_id}")
                    if project_response.status_code == 200:
                        project = project_response.json()
                        enemy = next((e for e in project["enemies"] if e["id"] == self.test_enemy_id), None)
                        
                        if enemy and enemy["level"] == 3:
                            # Level 3 should have 1 + (3-1)*0.1 = 1.2 multiplier
                            expected_health = 80 * 1.2  # 96
                            actual_health = enemy["calculated_stats"].get("health", 0)
                            
                            if abs(actual_health - expected_health) < 0.1:
                                self.log_result("enemy_management", "Enemy Level Scaling", True, 
                                              f"Level 3 enemy health scaled correctly: {actual_health}")
                            else:
                                self.log_result("enemy_management", "Enemy Level Scaling", False, 
                                              f"Enemy scaling incorrect. Expected: {expected_health}, Got: {actual_health}")
                        else:
                            self.log_result("enemy_management", "Enemy Level Scaling", False, 
                                          "Enemy not found or level not updated")
                    else:
                        self.log_result("enemy_management", "Enemy Level Scaling", False, 
                                      f"Failed to get project after enemy level update")
                else:
                    self.log_result("enemy_management", "Enemy Level Scaling", False, 
                                  f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_result("enemy_management", "Enemy Level Scaling", False, f"Exception: {str(e)}")

    def test_balance_comparison(self):
        """Test Balance Comparison API"""
        print("\n=== Testing Balance Comparison API ===")
        
        if not self.test_project_id or not self.test_character_id or not self.test_enemy_id:
            self.log_result("balance_comparison", "Balance Comparison", False, 
                          "Missing test project, character, or enemy")
            return

        # Test: Get balance comparison between character and enemy
        try:
            response = requests.get(f"{self.base_url}/projects/{self.test_project_id}/balance/{self.test_character_id}/{self.test_enemy_id}")
            
            if response.status_code == 200:
                comparison = response.json()
                
                # Verify response structure
                required_keys = ["character", "enemy", "comparison"]
                missing_keys = [key for key in required_keys if key not in comparison]
                
                if not missing_keys:
                    comp_data = comparison["comparison"]
                    if all(key in comp_data for key in ["character_level", "enemy_level", "character_stats", "enemy_stats"]):
                        self.log_result("balance_comparison", "Balance Comparison API", True, 
                                      f"Comparison successful - Character L{comp_data['character_level']} vs Enemy L{comp_data['enemy_level']}")
                    else:
                        self.log_result("balance_comparison", "Balance Comparison API", False, 
                                      "Comparison data incomplete")
                else:
                    self.log_result("balance_comparison", "Balance Comparison API", False, 
                                  f"Missing response keys: {missing_keys}")
            else:
                self.log_result("balance_comparison", "Balance Comparison API", False, 
                              f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("balance_comparison", "Balance Comparison API", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Game Balance Studio Backend Tests")
        print(f"Testing backend at: {self.base_url}")
        
        # Run tests in order
        self.test_project_management()
        self.test_character_management()
        self.test_stat_calculation_engine()
        self.test_enemy_management()
        self.test_balance_comparison()
        
        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("🎯 BACKEND TEST SUMMARY")
        print("="*60)
        
        total_passed = 0
        total_failed = 0
        
        for category, results in self.results.items():
            passed = results["passed"]
            failed = results["failed"]
            total_passed += passed
            total_failed += failed
            
            status = "✅" if failed == 0 else "❌"
            print(f"{status} {category.replace('_', ' ').title()}: {passed} passed, {failed} failed")
            
            # Print details for failed tests
            if failed > 0:
                for detail in results["details"]:
                    if "❌ FAIL" in detail:
                        print(f"   {detail}")
        
        print("-" * 60)
        print(f"TOTAL: {total_passed} passed, {total_failed} failed")
        
        if total_failed == 0:
            print("🎉 ALL BACKEND TESTS PASSED!")
        else:
            print(f"⚠️  {total_failed} TESTS FAILED - See details above")
        
        return total_failed == 0

if __name__ == "__main__":
    tester = GameBalanceStudioTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)