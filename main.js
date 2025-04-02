import { app, BrowserWindow, screen } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

// Recreate __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import config loader and ECS integration
import * as configLoader from './js/main/configLoader.js';
import ecsIntegration from './js/ecs/integration.js';
import mainIpcHandler from './js/ecs/ipc/mainIpcHandler.js';

// Store a global reference to the main window
let mainWindow;
global.mainWindow = null;

async function createWindow() {
  // Start position - use primary display initially
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  
  // Position in center of screen initially
  const initialX = Math.floor(width / 2 - 150);
  const initialY = Math.floor(height / 2 - 250);
  
  // Load configurations
  const appConfig = configLoader.loadAppConfig();
  const petConfig = await configLoader.loadPetConfig(appConfig.currentPetType);
  
  // Configure app config with pet config for ECS initialization
  const fullConfig = {
    ...appConfig,
    petConfig,
    initialPosition: { x: initialX, y: initialY }
  };

  mainWindow = new BrowserWindow({
    width: 300,
    height: 500, 
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false, 
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'js', 'preload.cjs'),
      // Enable dev tools in development mode
      devTools: process.argv.includes('--dev')
    },
    x: initialX,
    y: initialY
  });
  
  // Store reference to main window globally so ECS systems can access it
  global.mainWindow = mainWindow;

  // Set up IPC handlers for communication with renderer
  mainIpcHandler.setupIpcHandlers(mainWindow);

  // Initialize the ECS architecture (with async plugin loading)
  const { mainPetEntity } = await ecsIntegration.initializeMainProcess(fullConfig);

  // Set up event forwarding between processes
  ecsIntegration.setEventForwarder((eventType, payload) => {
    mainIpcHandler.sendEvent(eventType, payload);
  });

  // Set up state forwarding
  ecsIntegration.setStateUpdateListener((state) => {
    console.log('[Main Process] Pet state updated:', JSON.stringify(state, null, 2));
    mainIpcHandler.sendPetState(state);
  });

  // Log initialization success
  console.log(`ECS world initialized with main pet entity: ${mainPetEntity?.id || 'none'}`);

  // Load the main HTML file
  mainWindow.loadFile('index.html');
  
  // Open DevTools in development mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
  
  // Handle window closing
  mainWindow.on('closed', () => {
    global.mainWindow = null;
    mainWindow = null;
  });
}

// App lifecycle events
app.whenReady().then(createWindow);

app.on('activate', function () {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
}); 