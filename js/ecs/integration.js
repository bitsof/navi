/**
 * Integration module for connecting the ECS world to the existing Electron app.
 * This bridges the gap between the ECS architecture and the existing codebase.
 */

import World from './world.js';
import PositionComponent from './components/position.js';
import StatsComponent from './components/stats.js';
import AppearanceComponent from './components/appearance.js';
import IdentityComponent from './components/identity.js';
import MenuRegistryComponent from './components/menuRegistry.js';

import StatsSystem from './systems/statsSystem.js';
import MovementSystem from './systems/movementSystem.js';
import ContextMenuSystem from './systems/contextMenuSystem.js';

// Global ECS world instance
let world = null;
let mainPetEntity = null;
let isMainProcess = false;

// Callback functions for event handling
let eventForwarder = null;
let stateUpdateListener = null;

/**
 * Sets a callback function to forward events to the renderer
 * @param {Function} callback - Function to call with event data
 */
function setEventForwarder(callback) {
  eventForwarder = callback;
}

/**
 * Sets a callback function to notify about state updates
 * @param {Function} callback - Function to call with state data
 */
function setStateUpdateListener(callback) {
  stateUpdateListener = callback;
}

/**
 * Initialize the ECS world in the main process
 * @param {Object} config - Application configuration
 * @returns {Object} World and entity references
 */
async function initializeMainProcess(config) {
  isMainProcess = true;
  world = new World();
  
  // Register core systems
  world.registerSystem('stats', StatsSystem);
  world.registerSystem('movement', MovementSystem);
  world.registerSystem('contextMenu', ContextMenuSystem);
  
  // Load pet configurations
  if (config.petConfig) {
    // Set the configs for the stats system
    StatsSystem.petConfigs.set(config.currentPetType, config.petConfig);
    
    // Notify systems that config is loaded
    world.emitEvent('configLoaded', {
      petConfigs: { [config.currentPetType]: config.petConfig }
    });
  }
  
  // Load plugin systems for the main process
  await loadMainProcessPlugins(config.activePlugins || [], world);
  
  // Create the main pet entity
  createPetEntity(config);
  
  // Setup event listeners for communication
  setupMainProcessEventHandlers();
  
  // Start update loop
  startMainProcessUpdateLoop();
  
  return {
    world,
    mainPetEntity
  };
}

/**
 * Load main process plugin systems
 * @param {string[]} pluginIds - IDs of plugins to load
 * @param {World} world - The ECS world
 */
async function loadMainProcessPlugins(pluginIds, world) {
  for (const pluginId of pluginIds) {
    try {
      // Import the main process plugin module
      const pluginModule = await import(`../plugins/${pluginId}/main.js`);
      
      // Initialize the plugin if it has an initialize function
      if (pluginModule.initialize) {
        const success = await pluginModule.initialize(world);
        if (success) {
          console.log(`Main process plugin ${pluginId} loaded successfully`);
        } else {
          console.warn(`Main process plugin ${pluginId} failed to initialize`);
        }
      } else {
        console.warn(`Main process plugin ${pluginId} has no initialize function`);
      }
    } catch (error) {
      console.error(`Error loading main process plugin ${pluginId}:`, error);
    }
  }
}

/**
 * Create the main pet entity 
 * @param {Object} config - Application configuration
 */
function createPetEntity(config) {
  const petConfig = config.petConfig;
  const initialPosition = config.initialPosition || { x: 0, y: 0 };
  
  if (!petConfig) return null;
  
  // Create the entity
  mainPetEntity = world.createEntity('mainPet');
  
  // Add components
  
  // Identity component
  world.addComponent('mainPet', 'identity', IdentityComponent.create(
    petConfig.name || 'Buddy',
    config.currentPetType || 'defaultCat'
  ));
  
  // Position component
  world.addComponent('mainPet', 'position', PositionComponent.create(
    initialPosition.x,
    initialPosition.y
  ));
  
  // Stats component
  world.addComponent('mainPet', 'stats', StatsComponent.create(
    petConfig.initialStats?.hunger || 50,
    petConfig.initialStats?.happiness || 50, 
    petConfig.initialStats?.energy || 50
  ));
  
  // Appearance component - create with initial graphic based on mood
  const initialMood = 'neutral'; // Default mood
  const initialStatus = 'idle'; // Default status
  
  // Get initial graphic from config based on status and mood
  let initialGraphic = '🐱'; // Default fallback
  if (petConfig.graphicsMap?.[initialStatus]?.[initialMood]) {
    initialGraphic = petConfig.graphicsMap[initialStatus][initialMood];
  }
  
  world.addComponent('mainPet', 'appearance', AppearanceComponent.create(
    initialGraphic,
    initialStatus,
    initialMood
  ));
  
  return mainPetEntity;
}

/**
 * Setup event handlers for main process
 */
function setupMainProcessEventHandlers() {
  // Listen for ECS events that need to be forwarded to renderer
  
  // Position updates
  world.on('positionUpdated', (data) => {
    if (data.entityId === 'mainPet') {
      // Forward event to renderer if we have a forwarder
      if (eventForwarder) {
        eventForwarder('positionUpdated', data);
      }
      
      // Also update our global state
      notifyStateUpdate();
    }
  });
  
  // Appearance updates
  world.on('appearanceUpdated', (data) => {
    if (data.entityId === 'mainPet') {
      // Forward event to renderer
      if (eventForwarder) {
        eventForwarder('appearanceUpdated', data);
      }
      
      // Also update our global state
      notifyStateUpdate();
    }
  });
  
  // Stats updates
  world.on('statsUpdated', (data) => {
    if (data.entityId === 'mainPet') {
      // Forward event to renderer
      if (eventForwarder) {
        eventForwarder('statsUpdated', data);
      }
      
      // Also update our global state
      notifyStateUpdate();
    }
  });
  
  // Other important events to forward
  ['targetReached', 'actionApplied', 'walkingStarted', 'walkingStopped', 
   'draggingStarted', 'draggingStopped'].forEach(eventName => {
    world.on(eventName, (data) => {
      if (data.entityId === 'mainPet' && eventForwarder) {
        eventForwarder(eventName, data);
      }
    });
  });
  
  // Window move requests from render system
  world.on('moveWindowRequested', ({ entityId, x, y }) => {
    if (entityId === 'mainPet') {
      // This will be handled by the IPC handler
      if (eventForwarder) {
        eventForwarder('moveWindowRequested', { entityId, x, y });
      }
    }
  });
}

/**
 * Notify listeners about state updates
 */
function notifyStateUpdate() {
  if (stateUpdateListener) {
    const state = getPetState();
    if (state) {
      stateUpdateListener(state);
    }
  }
}

/**
 * Start the update loop for the ECS world in main process
 */
function startMainProcessUpdateLoop() {
  let lastUpdateTime = Date.now();
  
  const updateLoop = () => {
    const now = Date.now();
    const deltaTime = now - lastUpdateTime;
    
    // Update the world
    world.update(deltaTime);
    
    // Save the time for next update
    lastUpdateTime = now;
    
    // Schedule next update
    setTimeout(updateLoop, 100); // 10 FPS for now, can be adjusted
  };
  
  // Start the loop
  updateLoop();
}

/**
 * Initialize the renderer-side ECS world
 * @param {Object} rendererApi - API for renderer
 * @returns {Object} Initialized world and main entity
 */
function initializeRenderer(rendererApi) {
  isMainProcess = false;
  
  // Create a new world
  world = new World();
  
  // Dynamically import renderer-specific modules (ESM-compatible)
  import('./systems/renderSystem.js').then(RenderSystemModule => {
    const RenderSystem = RenderSystemModule.default;
    
    // Register the render and context menu systems
    world.registerSystem('render', RenderSystem);
    world.registerSystem('contextMenu', ContextMenuSystem);
    
    // Create the main pet entity (will be populated from main process state)
    mainPetEntity = createRendererPetEntity();
    
    // Set up handlers to keep in sync with the main process state
    setupRendererEventHandlers(rendererApi);
    
    // Start update loop specific to renderer
    startRendererUpdateLoop();
    
    // Create the initial UI
    RenderSystem.createPetElement('mainPet');
  });
  
  return {
    world,
    getMainPetEntity: () => mainPetEntity
  };
}

/**
 * Create the main pet entity in the renderer
 */
function createRendererPetEntity() {
  // Create an initial placeholder entity - will be updated with data from main process
  const entity = world.createEntity('mainPet');
  
  // Add empty components that will be populated later
  world.addComponent('mainPet', 'identity', IdentityComponent.create());
  world.addComponent('mainPet', 'position', PositionComponent.create());
  world.addComponent('mainPet', 'stats', StatsComponent.create());
  world.addComponent('mainPet', 'appearance', AppearanceComponent.create());
  
  return entity;
}

/**
 * Setup event handlers specific to the renderer
 * @param {Object} rendererApi - API for the renderer
 */
function setupRendererEventHandlers(rendererApi) {
  // Listen for state updates from main process
  rendererApi.onPetStateUpdate((state) => {
    if (!world || !mainPetEntity) return;
    
    // Update identity component
    if (state.name) {
      const identity = mainPetEntity.getComponent('identity');
      if (identity) {
        identity.name = state.name;
      }
    }
    
    // Update position component
    if (state.x !== undefined && state.y !== undefined) {
      const position = mainPetEntity.getComponent('position');
      if (position) {
        position.x = state.x;
        position.y = state.y;
      }
    }
    
    // Update stats component
    const stats = mainPetEntity.getComponent('stats');
    if (stats) {
      if (state.hunger !== undefined) stats.hunger = state.hunger;
      if (state.happiness !== undefined) stats.happiness = state.happiness;
      if (state.energy !== undefined) stats.energy = state.energy;
      if (state.lastInteraction !== undefined) stats.lastInteraction = state.lastInteraction;
      
      // Emit event for UI updates
      world.emitEvent('statsUpdated', { 
        entityId: 'mainPet', 
        stats 
      });
    }
    
    // Update appearance component
    const appearance = mainPetEntity.getComponent('appearance');
    if (appearance) {
      if (state.status !== undefined) appearance.status = state.status;
      if (state.mood !== undefined) appearance.mood = state.mood;
      if (state.graphic !== undefined) appearance.graphic = state.graphic;
      
      // Emit event for UI updates
      world.emitEvent('appearanceUpdated', { 
        entityId: 'mainPet', 
        appearance 
      });
    }
  });
  
  // Listen for ECS events from main
  rendererApi.onEcsEvent('appearanceUpdated', (data) => {
    if (data.entityId === 'mainPet' && world && mainPetEntity) {
      const appearance = mainPetEntity.getComponent('appearance');
      if (appearance && data.appearance) {
        // Update appearance with data from main process
        Object.assign(appearance, data.appearance);
      }
    }
  });
  
  rendererApi.onEcsEvent('positionUpdated', (data) => {
    if (data.entityId === 'mainPet' && world && mainPetEntity) {
      const position = mainPetEntity.getComponent('position');
      if (position) {
        position.x = data.x;
        position.y = data.y;
      }
    }
  });
  
  rendererApi.onEcsEvent('statsUpdated', (data) => {
    if (data.entityId === 'mainPet' && world && mainPetEntity) {
      const stats = mainPetEntity.getComponent('stats');
      if (stats && data.stats) {
        // Update stats with data from main process
        Object.assign(stats, data.stats);
      }
    }
  });
}

/**
 * Start the update loop for the ECS world in renderer
 */
function startRendererUpdateLoop() {
  let lastUpdateTime = Date.now();
  let animationFrameId = null;
  
  const updateLoop = () => {
    const now = Date.now();
    const deltaTime = now - lastUpdateTime;
    
    // Update the world
    world.update(deltaTime);
    
    // Save the time for next update
    lastUpdateTime = now;
    
    // Request next frame
    animationFrameId = requestAnimationFrame(updateLoop);
  };
  
  // Start the loop
  animationFrameId = requestAnimationFrame(updateLoop);
  
  // Add cleanup for when the window unloads
  window.addEventListener('unload', () => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
    }
    
    // Clean up the context menu system
    const contextMenuSystem = world.systems.get('contextMenu');
    if (contextMenuSystem && contextMenuSystem.cleanup) {
      contextMenuSystem.cleanup();
    }
  });
}

/**
 * Apply an action to the main pet entity
 * @param {string} actionType - Type of action to apply
 * @param {Object} payload - Additional action data
 * @returns {boolean} Whether the action was applied
 */
function applyAction(actionType, payload = {}) {
  if (!world || !mainPetEntity) return false;
  
  const success = StatsSystem.applyAction('mainPet', actionType);
  
  if (success) {
    // Notify that an action was applied
    world.emitEvent('actionApplied', { 
      entityId: 'mainPet', 
      actionType, 
      payload 
    });
    
    // Notify any state listeners
    notifyStateUpdate();
  }
  
  return success;
}

/**
 * Update the position of the main pet entity
 * @param {number} x - New X position
 * @param {number} y - New Y position
 * @returns {boolean} Whether the position was updated
 */
function updatePosition(x, y) {
  if (!world) return false;
  
  // Emit position update request
  world.emitEvent('positionUpdateRequested', { 
    entityId: 'mainPet', 
    x, 
    y 
  });
  
  return true;
}

/**
 * Start walking the main pet entity to a target
 * @param {number} targetX - Target X position
 * @param {number} targetY - Target Y position
 * @returns {boolean} Whether walking was started
 */
function startWalking(targetX, targetY) {
  if (!world) return false;
  
  // Emit walk request
  world.emitEvent('walkRequested', { 
    entityId: 'mainPet', 
    targetX, 
    targetY 
  });
  
  return true;
}

/**
 * Stop the main pet entity from walking
 * @returns {boolean} Whether walking was stopped
 */
function stopWalking() {
  if (!world) return false;
  
  // Emit stop walking request
  world.emitEvent('stopWalkRequested', 'mainPet');
  
  return true;
}

/**
 * Start dragging the main pet entity
 * @returns {boolean} Whether dragging was started
 */
function startDragging() {
  if (!world) return false;
  
  // Emit drag start request
  world.emitEvent('dragStarted', 'mainPet');
  
  return true;
}

/**
 * Stop dragging the main pet entity
 * @returns {boolean} Whether dragging was stopped
 */
function stopDragging() {
  if (!world) return false;
  
  // Emit drag end request
  world.emitEvent('dragEnded', 'mainPet');
  
  return true;
}

/**
 * Get the current state of the main pet entity
 * @returns {Object} Current pet state
 */
function getPetState() {
  if (!world || !mainPetEntity) return null;
  
  const state = {};
  
  // Get identity component
  const identity = mainPetEntity.getComponent('identity');
  if (identity) {
    state.name = identity.name;
    state.type = identity.type;
  }
  
  // Get position component
  const position = mainPetEntity.getComponent('position');
  if (position) {
    state.x = position.x;
    state.y = position.y;
  }
  
  // Get stats component
  const stats = mainPetEntity.getComponent('stats');
  if (stats) {
    state.hunger = stats.hunger;
    state.happiness = stats.happiness;
    state.energy = stats.energy;
    state.lastInteraction = stats.lastInteraction;
  }
  
  // Get appearance component
  const appearance = mainPetEntity.getComponent('appearance');
  if (appearance) {
    state.status = appearance.status;
    state.mood = appearance.mood;
    state.graphic = appearance.graphic;
  }
  
  return state;
}

// Export functions for both environments
const exportedFunctions = {
  // Main process functions
  initializeMainProcess,
  setEventForwarder,
  setStateUpdateListener,
  
  // Renderer process functions
  initializeRenderer,
  
  // Shared functions
  applyAction,
  updatePosition,
  startWalking,
  stopWalking,
  startDragging,
  stopDragging,
  getPetState
};

// Export for both CommonJS and ESM
export default exportedFunctions;