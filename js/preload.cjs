/**
 * Preload script for Electron.
 * Creates a bridge between the renderer and main processes.
 */
const { ipcRenderer, contextBridge } = require('electron');

// Define IPC event channels
const IPC_CHANNELS = {
  // From renderer to main
  GET_PET_STATE: 'ecs:get-pet-state',
  PERFORM_ACTION: 'ecs:perform-action',
  UPDATE_POSITION: 'ecs:update-position',
  START_WALKING: 'ecs:start-walking',
  STOP_WALKING: 'ecs:stop-walking',
  START_DRAGGING: 'ecs:start-dragging',
  STOP_DRAGGING: 'ecs:stop-dragging',
  MOVE_WINDOW: 'ecs:move-window',
  GET_DISPLAYS_INFO: 'ecs:get-displays-info',
  
  // From main to renderer
  PET_STATE_UPDATED: 'ecs:pet-state-updated',
  ENTITY_UPDATED: 'ecs:entity-updated',
  ECS_EVENT: 'ecs:event'
};

// Define constants inline
const constants = {
  IPC_CHANNELS: {
    GET_PET_STATE: 'get-pet-state',
    PERFORM_ACTION: 'perform-action',
    UPDATE_PET_POSITION: 'update-pet-position',
    MOVE_WINDOW: 'move-window',
    GET_DISPLAYS_INFO: 'get-displays-info',
    REGISTER_PLUGIN: 'register-plugin',
    PET_STATE_UPDATED: 'pet-state-updated',
    PLUGIN_EVENT: 'plugin-event',
    ECS_EVENT: 'ecs-event'
  },
  ACTION_TYPES: {
    FEED: 'feed',
    PLAY: 'play',
    SLEEP: 'sleep',
    WALK: 'walk',
    SET_STATUS: 'set-status'
  },
  PET_STATUSES: {
    IDLE: 'idle',
    WALKING: 'walking',
    INTERACTING: 'interacting',
    SLEEPING: 'sleeping',
    DRAGGING: 'dragging'
  }
};

// Track event listeners for cleanup
const stateUpdateListeners = new Set();
const ecsEventListeners = new Map();

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // ECS-specific pet state access
  getPetState: () => ipcRenderer.invoke(IPC_CHANNELS.GET_PET_STATE),
  
  // Action handlers
  performAction: (actionType, payload) => 
    ipcRenderer.invoke(IPC_CHANNELS.PERFORM_ACTION, actionType, payload),
  
  // Position management
  updatePosition: (x, y) => 
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_POSITION, { x, y }),
  
  // Movement
  startWalking: (targetX, targetY) => 
    ipcRenderer.invoke(IPC_CHANNELS.START_WALKING, { targetX, targetY }),
  stopWalking: () => 
    ipcRenderer.invoke(IPC_CHANNELS.STOP_WALKING),
  
  // Dragging
  startDragging: () => 
    ipcRenderer.invoke(IPC_CHANNELS.START_DRAGGING),
  stopDragging: () => 
    ipcRenderer.invoke(IPC_CHANNELS.STOP_DRAGGING),
  
  // Window management
  moveWindow: (position) => 
    ipcRenderer.invoke(IPC_CHANNELS.MOVE_WINDOW, position),
  getDisplaysInfo: () => 
    ipcRenderer.invoke(IPC_CHANNELS.GET_DISPLAYS_INFO),
  
  // Legacy plugin support - these will be deprecated eventually
  registerPlugin: (pluginId) => 
    ipcRenderer.invoke(constants.IPC_CHANNELS.REGISTER_PLUGIN, pluginId),
  invoke: (channel, ...args) => 
    ipcRenderer.invoke(channel, ...args),
  
  // Event listeners
  onPetStateUpdate: (callback) => {
    if (typeof callback !== 'function') return;
    
    // Create a wrapper that we can track
    const wrappedCallback = (_event, value) => callback(value);
    wrappedCallback._original = callback;
    stateUpdateListeners.add(wrappedCallback);
    
    ipcRenderer.on(IPC_CHANNELS.PET_STATE_UPDATED, wrappedCallback);
    
    // Return a function to remove the listener
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.PET_STATE_UPDATED, wrappedCallback);
      stateUpdateListeners.delete(wrappedCallback);
    };
  },
  
  // ECS event system - allows listening to specific event types
  onEcsEvent: (eventType, callback) => {
    if (typeof callback !== 'function') return () => {};
    
    // Create a wrapper that filters by event type
    const wrappedCallback = (_event, data) => {
      if (data.type === eventType) {
        callback(data.payload);
      }
    };
    wrappedCallback._original = callback;
    
    // Store the callback by event type
    if (!ecsEventListeners.has(eventType)) {
      ecsEventListeners.set(eventType, new Set());
    }
    ecsEventListeners.get(eventType).add(wrappedCallback);
    
    // Listen for ECS events from main
    ipcRenderer.on(IPC_CHANNELS.ECS_EVENT, wrappedCallback);
    
    // Return a function to remove the listener
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ECS_EVENT, wrappedCallback);
      const listeners = ecsEventListeners.get(eventType);
      if (listeners) {
        listeners.delete(wrappedCallback);
      }
    };
  },
  
  // Legacy event handlers - will be deprecated
  onPluginEvent: (callback) => {
    if (typeof callback !== 'function') return;
    
    // Create a wrapper that we can track
    const wrappedCallback = (_event, value) => callback(value);
    wrappedCallback._original = callback;
    
    ipcRenderer.on(constants.IPC_CHANNELS.PLUGIN_EVENT, wrappedCallback);
    
    // Return a function to remove the listener
    return () => {
      ipcRenderer.removeListener(constants.IPC_CHANNELS.PLUGIN_EVENT, wrappedCallback);
    };
  },
  
  // Expose constants to renderer
  ACTION_TYPES: constants.ACTION_TYPES,
  PET_STATUSES: constants.PET_STATUSES,
  
  // New ECS-specific constants
  ECS_CHANNELS: IPC_CHANNELS
}); 