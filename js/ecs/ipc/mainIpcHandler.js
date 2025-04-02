/**
 * IPC handlers for the main process to communicate with the renderer
 * Bridges the gap between Electron IPC and the ECS world
 */

import { ipcMain, screen } from 'electron';
import ecsIntegration from '../integration.js';

// IPC channels
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

/**
 * Sets up IPC handlers for Electron
 * @param {BrowserWindow} mainWindow - The main Electron window
 */
function setupIpcHandlers(mainWindow) {
  if (!mainWindow) {
    console.error('Cannot set up IPC handlers: No main window provided');
    return;
  }
  
  // Handler to get current pet state
  ipcMain.handle(IPC_CHANNELS.GET_PET_STATE, () => {
    return ecsIntegration.getPetState();
  });
  
  // Handler for actions (feed, play, sleep, etc.)
  ipcMain.handle(IPC_CHANNELS.PERFORM_ACTION, (event, actionType, payload) => {
    console.log(`Performing action: ${actionType}`, payload);
    const success = ecsIntegration.applyAction(actionType, payload);
    return success;
  });
  
  // Handler to update pet position
  ipcMain.handle(IPC_CHANNELS.UPDATE_POSITION, (event, position) => {
    return ecsIntegration.updatePosition(position.x, position.y);
  });
  
  // Handler to start walking
  ipcMain.handle(IPC_CHANNELS.START_WALKING, (event, data) => {
    return ecsIntegration.startWalking(data.targetX, data.targetY);
  });
  
  // Handler to stop walking
  ipcMain.handle(IPC_CHANNELS.STOP_WALKING, () => {
    return ecsIntegration.stopWalking();
  });
  
  // Handler to start dragging
  ipcMain.handle(IPC_CHANNELS.START_DRAGGING, () => {
    return ecsIntegration.startDragging();
  });
  
  // Handler to stop dragging
  ipcMain.handle(IPC_CHANNELS.STOP_DRAGGING, () => {
    return ecsIntegration.stopDragging();
  });
  
  // Handler to move window
  ipcMain.handle(IPC_CHANNELS.MOVE_WINDOW, (event, position) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setPosition(Math.floor(position.x), Math.floor(position.y));
      return true;
    }
    return false;
  });
  
  // Handler to get display info
  ipcMain.handle(IPC_CHANNELS.GET_DISPLAYS_INFO, () => {
    return {
      displays: screen.getAllDisplays(),
      primaryDisplay: screen.getPrimaryDisplay()
    };
  });
  
  console.log('ECS IPC handlers initialized');
}

/**
 * Sends an event to the renderer process
 * @param {string} eventType - Type of event
 * @param {*} payload - Event payload
 */
function sendEvent(eventType, payload) {
  const mainWindow = global.mainWindow;
  
  if (!mainWindow || mainWindow.isDestroyed()) {
    return false;
  }
  
  mainWindow.webContents.send(IPC_CHANNELS.ECS_EVENT, {
    type: eventType,
    payload
  });
  
  return true;
}

/**
 * Sends pet state to the renderer
 * @param {Object} state - Current pet state
 */
function sendPetState(state) {
  const mainWindow = global.mainWindow;
  
  if (!mainWindow || mainWindow.isDestroyed()) {
    return false;
  }
  
  mainWindow.webContents.send(IPC_CHANNELS.PET_STATE_UPDATED, state);
  return true;
}

// Export the handlers
export default {
  setupIpcHandlers,
  sendEvent,
  sendPetState,
  IPC_CHANNELS
};