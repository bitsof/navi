const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
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
  
  mainWindow = new BrowserWindow({
    width: 250,
    height: 300,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'js', 'preload.js')
    },
    x: width - 350,
    y: height - 350
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
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Pet state
let petState = {
  name: 'Buddy',
  hunger: 50,
  happiness: 50,
  energy: 50,
  lastInteraction: Date.now(),
  x: null,
  y: null
};

// IPC handlers for pet interactions
ipcMain.handle('get-pet-state', () => {
  updatePetState();
  return petState;
});

ipcMain.handle('feed-pet', () => {
  petState.hunger = Math.max(0, petState.hunger - 20);
  petState.energy = Math.min(100, petState.energy + 10);
  petState.lastInteraction = Date.now();
  return petState;
});

ipcMain.handle('play-with-pet', () => {
  petState.happiness = Math.min(100, petState.happiness + 20);
  petState.hunger = Math.min(100, petState.hunger + 10);
  petState.energy = Math.max(0, petState.energy - 15);
  petState.lastInteraction = Date.now();
  return petState;
});

ipcMain.handle('pet-sleep', () => {
  petState.energy = 100;
  petState.lastInteraction = Date.now();
  return petState;
});

// Update pet position
ipcMain.handle('update-pet-position', (event, position) => {
  petState.x = position.x;
  petState.y = position.y;
  
  // Move the window to the new position
  mainWindow.setPosition(position.x, position.y);
  return true;
});

// IPC handler to move window programmatically
ipcMain.handle('move-window', (event, position) => {
  mainWindow.setPosition(position.x, position.y);
  return true;
});

// Update pet state based on time passed
function updatePetState() {
  const now = Date.now();
  const hoursPassed = (now - petState.lastInteraction) / (1000 * 60 * 60);
  
  if (hoursPassed > 0) {
    petState.hunger = Math.min(100, petState.hunger + hoursPassed * 5);
    petState.happiness = Math.max(0, petState.happiness - hoursPassed * 5);
    petState.energy = Math.max(0, petState.energy - hoursPassed * 3);
    petState.lastInteraction = now;
  }
} 