import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newCharacter, setNewCharacter] = useState({
    name: "",
    level: 1,
    base_attributes: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10
    }
  });
  const [showCreateCharacter, setShowCreateCharacter] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [selectedEnemy, setSelectedEnemy] = useState(null);
  const [showStatEditor, setShowStatEditor] = useState(false);
  const [editingStat, setEditingStat] = useState(null);

  // Load projects on component mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await axios.get(`${API}/projects`);
      setProjects(response.data);
    } catch (error) {
      console.error("Error loading projects:", error);
    }
  };

  const createProject = async () => {
    if (!newProjectName.trim()) return;
    
    try {
      const response = await axios.post(`${API}/projects`, {
        name: newProjectName,
        description: "Game balancing project"
      });
      
      setProjects([...projects, response.data]);
      setNewProjectName("");
      setShowCreateProject(false);
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  const selectProject = async (projectId) => {
    try {
      const response = await axios.get(`${API}/projects/${projectId}`);
      setCurrentProject(response.data);
      setSelectedCharacter(null);
      setSelectedEnemy(null);
    } catch (error) {
      console.error("Error loading project:", error);
    }
  };

  const createCharacter = async () => {
    if (!currentProject || !newCharacter.name.trim()) return;

    try {
      const response = await axios.post(
        `${API}/projects/${currentProject.id}/characters`,
        newCharacter
      );
      
      // Refresh project data
      await selectProject(currentProject.id);
      
      setNewCharacter({
        name: "",
        level: 1,
        base_attributes: {
          strength: 10,
          dexterity: 10,
          constitution: 10,
          intelligence: 10
        }
      });
      setShowCreateCharacter(false);
    } catch (error) {
      console.error("Error creating character:", error);
    }
  };

  const updateCharacterLevel = async (characterId, newLevel) => {
    try {
      await axios.put(
        `${API}/projects/${currentProject.id}/characters/${characterId}/level`,
        null,
        { params: { level: newLevel } }
      );
      
      // Refresh project data
      await selectProject(currentProject.id);
    } catch (error) {
      console.error("Error updating character level:", error);
    }
  };

  const createSampleEnemy = async () => {
    if (!currentProject) return;

    const enemyData = {
      name: "Goblin Warrior",
      enemy_type: "common",
      level: 1,
      base_stats: {
        health: 80,
        mana: 20,
        power: 15,
        initiative: 12
      }
    };

    try {
      await axios.post(`${API}/projects/${currentProject.id}/enemies`, enemyData);
      await selectProject(currentProject.id);
    } catch (error) {
      console.error("Error creating enemy:", error);
    }
  };

  const updateEnemyLevel = async (enemyId, newLevel) => {
    try {
      await axios.put(
        `${API}/projects/${currentProject.id}/enemies/${enemyId}/level`,
        null,
        { params: { level: newLevel } }
      );
      
      await selectProject(currentProject.id);
    } catch (error) {
      console.error("Error updating enemy level:", error);
    }
  };

  const editStatModifiers = (stat) => {
    setEditingStat({
      name: stat.name,
      base_value: stat.base_value,
      per_level_bonus: stat.per_level_bonus,
      modifiers: stat.modifiers.map(mod => ({
        attribute: mod.attribute,
        multiplier: mod.multiplier,
        base_bonus: mod.base_bonus
      }))
    });
    setShowStatEditor(true);
  };

  const updateStatDefinition = async () => {
    if (!currentProject || !editingStat) return;

    try {
      await axios.put(
        `${API}/projects/${currentProject.id}/stats/${editingStat.name}`,
        editingStat
      );
      
      // Refresh project data to get updated character stats
      await selectProject(currentProject.id);
      setShowStatEditor(false);
      setEditingStat(null);
    } catch (error) {
      console.error("Error updating stat definition:", error);
    }
  };

  const updateModifier = (modifierIndex, field, value) => {
    const updatedModifiers = [...editingStat.modifiers];
    updatedModifiers[modifierIndex] = {
      ...updatedModifiers[modifierIndex],
      [field]: field === 'attribute' ? value : parseFloat(value) || 0
    };
    setEditingStat({
      ...editingStat,
      modifiers: updatedModifiers
    });
  };

  const addModifier = () => {
    const availableAttributes = currentProject.attributes.filter(
      attr => !editingStat.modifiers.some(mod => mod.attribute === attr)
    );
    
    if (availableAttributes.length > 0) {
      setEditingStat({
        ...editingStat,
        modifiers: [...editingStat.modifiers, {
          attribute: availableAttributes[0],
          multiplier: 1.0,
          base_bonus: 0.0
        }]
      });
    }
  };

  const removeModifier = (modifierIndex) => {
    setEditingStat({
      ...editingStat,
      modifiers: editingStat.modifiers.filter((_, index) => index !== modifierIndex)
    });
  };

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-white mb-4">
              ⚔️ Game Balance Studio
            </h1>
            <p className="text-xl text-purple-200">
              Design and test your game's character progression system
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-white">Your Projects</h2>
                <button
                  onClick={() => setShowCreateProject(true)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 font-medium"
                >
                  ➕ New Project
                </button>
              </div>

              {showCreateProject && (
                <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Project name..."
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      onKeyPress={(e) => e.key === "Enter" && createProject()}
                    />
                    <button
                      onClick={createProject}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => setShowCreateProject(false)}
                      className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="grid gap-4">
                {projects.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎮</div>
                    <p className="text-white/60 text-lg">No projects yet. Create your first game balancing project!</p>
                  </div>
                ) : (
                  projects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => selectProject(project.id)}
                      className="p-6 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 cursor-pointer transition-all duration-200 hover:border-purple-400/50"
                    >
                      <h3 className="text-xl font-semibold text-white mb-2">{project.name}</h3>
                      <p className="text-white/60">{project.description}</p>
                      <div className="mt-3 flex gap-4 text-sm text-purple-200">
                        <span>📊 {project.characters?.length || 0} Characters</span>
                        <span>👹 {project.enemies?.length || 0} Enemies</span>
                        <span>⚡ {project.stat_definitions?.length || 0} Stats</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <button
              onClick={() => setCurrentProject(null)}
              className="text-purple-200 hover:text-white mb-2 flex items-center gap-2"
            >
              ← Back to Projects
            </button>
            <h1 className="text-3xl font-bold text-white">{currentProject.name}</h1>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Stat Configuration Panel */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                ⚙️ Stat Configuration
              </h2>
              <span className="text-sm text-purple-200">Click to edit modifiers</span>
            </div>

            <div className="space-y-3">
              {currentProject.stat_definitions?.map((stat) => (
                <div
                  key={stat.name}
                  onClick={() => editStatModifiers(stat)}
                  className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 cursor-pointer transition-all duration-200"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-white capitalize">{stat.name}</h3>
                    <span className="text-sm text-blue-300">Base: {stat.base_value}</span>
                  </div>
                  
                  <div className="text-xs text-white/70 space-y-1">
                    <div>Per Level: +{stat.per_level_bonus}</div>
                    {stat.modifiers.map((modifier, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span className="capitalize">{modifier.attribute}:</span>
                        <span className="text-yellow-300">
                          ×{modifier.multiplier} {modifier.base_bonus > 0 && `+${modifier.base_bonus}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {(!currentProject.stat_definitions || currentProject.stat_definitions.length === 0) && (
                <div className="text-center py-8 text-white/60">
                  <div className="text-4xl mb-2">⚙️</div>
                  <p>No stat definitions</p>
                </div>
              )}
            </div>
          </div>

          {/* Characters Panel */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                👤 Characters
              </h2>
              <button
                onClick={() => setShowCreateCharacter(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                ➕ Add
              </button>
            </div>

            {showCreateCharacter && (
              <div className="mb-4 p-4 bg-white/5 rounded-lg border border-white/10">
                <input
                  type="text"
                  placeholder="Character name..."
                  value={newCharacter.name}
                  onChange={(e) => setNewCharacter({...newCharacter, name: e.target.value})}
                  className="w-full px-3 py-2 mb-3 bg-white/10 border border-white/20 rounded text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {Object.keys(newCharacter.base_attributes).map((attr) => (
                    <div key={attr}>
                      <label className="text-white/80 text-sm capitalize">{attr}:</label>
                      <input
                        type="number"
                        value={newCharacter.base_attributes[attr]}
                        onChange={(e) => setNewCharacter({
                          ...newCharacter,
                          base_attributes: {
                            ...newCharacter.base_attributes,
                            [attr]: parseInt(e.target.value) || 0
                          }
                        })}
                        className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={createCharacter}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowCreateCharacter(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {currentProject.characters?.map((character) => (
                <div
                  key={character.id}
                  onClick={() => setSelectedCharacter(character)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                    selectedCharacter?.id === character.id
                      ? 'bg-purple-600/30 border-purple-400'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-white">{character.name}</h3>
                    <span className="px-2 py-1 bg-blue-600/50 text-blue-100 rounded text-sm">
                      Lv {character.level}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white/80 text-sm">Level:</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateCharacterLevel(character.id, character.level - 1);
                        }}
                        className="px-2 py-1 bg-red-600/50 text-white rounded hover:bg-red-600/70 text-sm"
                      >
                        -
                      </button>
                      <span className="text-white font-mono w-8 text-center">{character.level}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateCharacterLevel(character.id, character.level + 1);
                        }}
                        className="px-2 py-1 bg-green-600/50 text-white rounded hover:bg-green-600/70 text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {Object.entries(character.calculated_stats || {}).map(([stat, value]) => (
                      <div key={stat} className="text-white/70">
                        <span className="capitalize">{stat}:</span> <span className="text-yellow-300">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {(!currentProject.characters || currentProject.characters.length === 0) && (
                <div className="text-center py-8 text-white/60">
                  <div className="text-4xl mb-2">👤</div>
                  <p>No characters yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Stats Panel */}
          {selectedCharacter && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                📊 {selectedCharacter.name}'s Stats
              </h2>

              <div className="mb-6">
                <h3 className="text-lg font-medium text-white mb-3">Base Attributes</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(selectedCharacter.base_attributes).map(([attr, value]) => (
                    <div key={attr} className="bg-white/5 p-3 rounded-lg">
                      <div className="text-purple-200 text-sm capitalize">{attr}</div>
                      <div className="text-2xl font-bold text-white">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-white mb-3">Calculated Stats</h3>
                <div className="space-y-2">
                  {Object.entries(selectedCharacter.calculated_stats || {}).map(([stat, value]) => (
                    <div key={stat} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <span className="text-white capitalize">{stat}</span>
                      <span className="text-2xl font-bold text-yellow-300">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Enemies Panel */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                👹 Enemies
              </h2>
              <button
                onClick={createSampleEnemy}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                ➕ Add Enemy
              </button>
            </div>

            <div className="space-y-3">
              {currentProject.enemies?.map((enemy) => (
                <div
                  key={enemy.id}
                  onClick={() => setSelectedEnemy(enemy)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                    selectedEnemy?.id === enemy.id
                      ? 'bg-red-600/30 border-red-400'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-white">{enemy.name}</h3>
                    <span className="px-2 py-1 bg-red-600/50 text-red-100 rounded text-sm">
                      Lv {enemy.level}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white/80 text-sm">Level:</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateEnemyLevel(enemy.id, enemy.level - 1);
                        }}
                        className="px-2 py-1 bg-red-600/50 text-white rounded hover:bg-red-600/70 text-sm"
                      >
                        -
                      </button>
                      <span className="text-white font-mono w-8 text-center">{enemy.level}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateEnemyLevel(enemy.id, enemy.level + 1);
                        }}
                        className="px-2 py-1 bg-green-600/50 text-white rounded hover:bg-green-600/70 text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {Object.entries(enemy.calculated_stats || {}).map(([stat, value]) => (
                      <div key={stat} className="text-white/70">
                        <span className="capitalize">{stat}:</span> <span className="text-orange-300">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {(!currentProject.enemies || currentProject.enemies.length === 0) && (
                <div className="text-center py-8 text-white/60">
                  <div className="text-4xl mb-2">👹</div>
                  <p>No enemies yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stat Editor Modal */}
        {showStatEditor && editingStat && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-white">
                  Edit {editingStat.name} Modifiers
                </h2>
                <button
                  onClick={() => setShowStatEditor(false)}
                  className="text-white hover:text-red-300 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Base Values */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Base Value</label>
                    <input
                      type="number"
                      value={editingStat.base_value}
                      onChange={(e) => setEditingStat({
                        ...editingStat,
                        base_value: parseFloat(e.target.value) || 0
                      })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Per Level Bonus</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editingStat.per_level_bonus}
                      onChange={(e) => setEditingStat({
                        ...editingStat,
                        per_level_bonus: parseFloat(e.target.value) || 0
                      })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Attribute Modifiers */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-white">Attribute Modifiers</h3>
                    <button
                      onClick={addModifier}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      ➕ Add Modifier
                    </button>
                  </div>

                  <div className="space-y-3">
                    {editingStat.modifiers.map((modifier, index) => (
                      <div key={index} className="p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="grid grid-cols-4 gap-3 items-center">
                          <div>
                            <label className="block text-white/80 text-xs mb-1">Attribute</label>
                            <select
                              value={modifier.attribute}
                              onChange={(e) => updateModifier(index, 'attribute', e.target.value)}
                              className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                            >
                              {currentProject.attributes.map(attr => (
                                <option key={attr} value={attr} className="bg-gray-800">
                                  {attr}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-white/80 text-xs mb-1">Multiplier</label>
                            <input
                              type="number"
                              step="0.1"
                              value={modifier.multiplier}
                              onChange={(e) => updateModifier(index, 'multiplier', e.target.value)}
                              className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-white/80 text-xs mb-1">Base Bonus</label>
                            <input
                              type="number"
                              step="0.1"
                              value={modifier.base_bonus}
                              onChange={(e) => updateModifier(index, 'base_bonus', e.target.value)}
                              className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                          </div>
                          <button
                            onClick={() => removeModifier(index)}
                            className="px-2 py-1 bg-red-600/50 text-white rounded hover:bg-red-600/70 transition-colors text-sm"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="mt-2 text-xs text-purple-200">
                          Formula: {modifier.attribute} × {modifier.multiplier} + {modifier.base_bonus}
                        </div>
                      </div>
                    ))}
                    
                    {editingStat.modifiers.length === 0 && (
                      <div className="text-center py-6 text-white/60">
                        No modifiers. Click "Add Modifier" to create attribute relationships.
                      </div>
                    )}
                  </div>
                </div>

                {/* Preview */}
                <div className="p-4 bg-blue-600/20 rounded-lg border border-blue-400/30">
                  <h4 className="text-white font-medium mb-2">📊 Formula Preview</h4>
                  <div className="text-blue-200 text-sm">
                    <div className="font-mono">
                      {editingStat.name} = {editingStat.base_value}
                      {editingStat.modifiers.map((mod, idx) => (
                        <span key={idx}> + ({mod.attribute} × {mod.multiplier}{mod.base_bonus !== 0 && ` + ${mod.base_bonus}`})</span>
                      ))}
                      {editingStat.per_level_bonus !== 0 && ` + ((level - 1) × ${editingStat.per_level_bonus})`}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={updateStatDefinition}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 font-medium"
                  >
                    💾 Save Changes
                  </button>
                  <button
                    onClick={() => setShowStatEditor(false)}
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Balance Comparison */}
        {selectedCharacter && selectedEnemy && (
          <div className="mt-6 bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              ⚖️ Balance Comparison
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-blue-600/20 p-4 rounded-lg border border-blue-400/30">
                <h3 className="font-semibold text-white mb-3">
                  👤 {selectedCharacter.name} (Level {selectedCharacter.level})
                </h3>
                <div className="space-y-2">
                  {Object.entries(selectedCharacter.calculated_stats || {}).map(([stat, value]) => (
                    <div key={stat} className="flex justify-between">
                      <span className="text-blue-200 capitalize">{stat}:</span>
                      <span className="text-white font-bold">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-red-600/20 p-4 rounded-lg border border-red-400/30">
                <h3 className="font-semibold text-white mb-3">
                  👹 {selectedEnemy.name} (Level {selectedEnemy.level})
                </h3>
                <div className="space-y-2">
                  {Object.entries(selectedEnemy.calculated_stats || {}).map(([stat, value]) => (
                    <div key={stat} className="flex justify-between">
                      <span className="text-red-200 capitalize">{stat}:</span>
                      <span className="text-white font-bold">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-white/5 rounded-lg">
              <h4 className="text-white font-medium mb-2">🔍 Quick Analysis</h4>
              <div className="text-white/80 text-sm">
                Level difference: {Math.abs(selectedCharacter.level - selectedEnemy.level)} levels
                {selectedCharacter.level > selectedEnemy.level ? " (Player advantage)" : 
                 selectedCharacter.level < selectedEnemy.level ? " (Enemy advantage)" : " (Equal level)"}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;