// js/shared/constants.js - Shared constants across main and renderer processes

// Pet Statuses
export const PET_STATUSES = {
  IDLE: 'idle',
  WALKING: 'walking',
  INTERACTING: 'interacting',
  SLEEPING: 'sleeping',
  DRAGGING: 'dragging'
};

// IPC Channels
export const IPC_CHANNELS = {
  // From renderer to main
  GET_PET_STATE: 'get-pet-state',
  PERFORM_ACTION: 'perform-action', // Generic action channel
  UPDATE_PET_POSITION: 'update-pet-position',
  MOVE_WINDOW: 'move-window',
  GET_DISPLAYS_INFO: 'get-displays-info',
  REGISTER_PLUGIN: 'register-plugin',
  
  // From main to renderer
  PET_STATE_UPDATED: 'pet-state-updated',
  PLUGIN_EVENT: 'plugin-event'
};

// Action Types
export const ACTION_TYPES = {
  FEED: 'feed',
  PLAY: 'play',
  SLEEP: 'sleep',
  SET_STATUS: 'set-status'
}; 