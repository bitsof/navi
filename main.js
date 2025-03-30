const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

// Use require for the CommonJS Pet module
const Pet = require('./js/state/petState.js');

let mainWindow;
let currentPet; // Instance of the Pet class

async function createWindow() {
  // Ensure Pet class is loaded (now synchronous with require)

  // Initialize with a window that spans all screens
  const displays = screen.getAllDisplays();
  const externalDisplay = displays.find((display) => {
    return display.bounds.x !== 0 || display.bounds.y !== 0;
  });
  
  // Calculate the total display area
  let totalBounds = {
    x: 0,
    y: 0,
    width: 0,
    height: 0
  };
  
  displays.forEach(display => {
    totalBounds.width = Math.max(totalBounds.width, display.bounds.x + display.bounds.width);
    totalBounds.height = Math.max(totalBounds.height, display.bounds.y + display.bounds.height);
  });
  
  // Start position - use primary display initially
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const initialX = width - 350;
  const initialY = height - 450; // Adjusted for new height
  
  // Create the Pet instance
  currentPet = new Pet('Buddy', initialX, initialY);

  mainWindow = new BrowserWindow({
    width: 250,
    height: 400, // Increased height
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false, // Recommended for security
      contextIsolation: true, // Recommended for security
      preload: path.join(__dirname, 'js', 'preload.js')
    },
    x: initialX,
    y: initialY
  });

  mainWindow.loadFile('index.html');
  
  // Open DevTools in development mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
  
  // Share display info with renderer
  ipcMain.handle('get-displays-info', () => {
    return {
      displays: screen.getAllDisplays(),
      primaryDisplay: screen.getPrimaryDisplay(),
      totalBounds
    };
  });

  // Start periodic state updates
  startPeriodicUpdates();
}

function startPeriodicUpdates() {
  // Update stats over time every minute
  setInterval(() => {
      if (currentPet) {
          const stateChanged = currentPet.updateStatsOverTime();
          // If state changed due to time, notify the renderer
          if (stateChanged && mainWindow && !mainWindow.isDestroyed()) {
              sendStateUpdate();
          }
      }
  }, 10 * 1000); // Check every 10 seconds for testing
}

// Helper function to send the current state to the renderer
function sendStateUpdate() {
    if (currentPet && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('pet-state-updated', currentPet.getState());
    }
}

app.whenReady().then(createWindow);

app.on('activate', function () {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// --- IPC Handlers using the Pet instance --- 

ipcMain.handle('get-pet-state', () => {
  if (!currentPet) return null; 
  return currentPet.getState();
});

ipcMain.handle('feed-pet', () => {
  if (!currentPet) return null;
  currentPet.feed();
  sendStateUpdate(); // Notify renderer of potential status/mood change
  return currentPet.getState();
});

ipcMain.handle('play-with-pet', () => {
  if (!currentPet) return null;
  currentPet.play();
  sendStateUpdate(); // Notify renderer
  return currentPet.getState();
});

ipcMain.handle('pet-sleep', () => {
  if (!currentPet) return null;
  currentPet.sleep();
  sendStateUpdate(); // Notify renderer
  return currentPet.getState();
});

// Set pet status
ipcMain.handle('set-pet-status', (event, newStatus) => {
  if (!currentPet) return false;
  const changed = currentPet.setStatus(newStatus);
  if (changed) {
      sendStateUpdate(); // Notify renderer if status actually changed
  }
  return changed;
});

// Update pet position (and move window)
ipcMain.handle('update-pet-position', (event, position) => {
  if (!currentPet) return false;
  currentPet.setPosition(position.x, position.y);
  
  // Move the window to the new position
  if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setPosition(position.x, position.y);
  }
  // We don't send a full state update on every position change during walk/drag
  // But the main process now knows the correct position.
  return true; 
});

// Move window programmatically (used by walking plugin)
ipcMain.handle('move-window', (event, position) => {
  if (!currentPet) return false;
  currentPet.setPosition(position.x, position.y);
  if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setPosition(position.x, position.y);
  }
  // Don't send state update here, let the walking plugin manage it
  return true; 
}); 