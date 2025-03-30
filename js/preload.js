const { ipcRenderer, contextBridge } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    getPetState: () => ipcRenderer.invoke('get-pet-state'),
    feedPet: () => ipcRenderer.invoke('feed-pet'),
    playWithPet: () => ipcRenderer.invoke('play-with-pet'),
    petSleep: () => ipcRenderer.invoke('pet-sleep'),
    setPetStatus: (status) => ipcRenderer.invoke('set-pet-status', status),
    updatePetPosition: (position) => ipcRenderer.invoke('update-pet-position', position),
    getDisplaysInfo: () => ipcRenderer.invoke('get-displays-info'),
    moveWindow: (position) => ipcRenderer.invoke('move-window', position),
    onPetStateUpdate: (callback) => ipcRenderer.on('pet-state-updated', (_event, value) => callback(value))
  }
); 