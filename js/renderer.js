// js/renderer.js - Main renderer process entry point
// Using the ECS (Entity-Component-System) architecture for state management

// Set development mode if loaded with ?dev in URL
window.DEV_MODE = window.location.search.includes('dev');

// Import ECS integration for renderer
import ecsIntegration from './ecs/integration.js';
import pluginSystem from './ecs/plugins/pluginSystem.js';

// Global state 
let ecsWorld = null;
let mainPetEntity = null;

// Show debug panel in dev mode and initialize ECS
document.addEventListener('DOMContentLoaded', () => {
  if (window.DEV_MODE) {
    const debugPanel = document.getElementById('debug-info');
    if (debugPanel) {
      debugPanel.style.display = 'block';
      updateDebugPanel('Development mode enabled');
    }
  }
  
  // Initialize the ECS system when DOM is ready
  initializeEcs();
});

/**
 * Initializes the ECS world in the renderer process
 */
async function initializeEcs() {
  console.log('>>> initializeEcs called');
  console.log('Initializing ECS in renderer process...');
  updateDebugPanel('Initializing ECS world...');
  
  try {
    if (!window.api) {
      throw new Error('API not available - preload script may have failed to load');
    }
    
    // Initialize the ECS world
    const ecs = ecsIntegration.initializeRenderer(window.api);
    ecsWorld = ecs.world;
    
    // The main pet entity will be available after initialization
    // It's handled inside the ECS initialization process
    
    // Log initialization success
    console.log('ECS world initialized in renderer');
    updateDebugPanel('ECS world initialized successfully');
    
    // Initialize the context menu system UI
    // We'll use a slightly longer delay to ensure the pet element is created first
    setTimeout(() => {
      const contextMenuSystem = ecsWorld.systems.get('contextMenu');
      if (contextMenuSystem) {
        contextMenuSystem.createMenuElement();
        updateDebugPanel('Context menu system initialized');
        console.log('Context menu system initialized and ready');
      } else {
        console.error('Context menu system not found');
        updateDebugPanel('Error: Context menu system not found');
      }
    }, 1000); // Add a delay to ensure systems are registered and pet element exists
    
    // Setup UI event listeners for interacting with the pet
    setupUiEventListeners();
    
    // Load plugins using our new ECS-based plugin system
    await loadPlugins(ecsWorld);
  } catch (error) {
    console.error('Error initializing ECS:', error);
    updateDebugPanel(`Error initializing ECS: ${error.message}`);
  }
}

/**
 * Load plugins using the ECS plugin system
 */
async function loadPlugins(world) {
  try {
    // Get initial pet state to find which plugins to load
    const petState = await window.api.getPetState();
    
    // Determine active plugins
    const activePlugins = petState?.pluginSettings?.active || 
                          ['coreDisplay', 'walking', 'dragging', 'interactions'];
    
    updateDebugPanel(`Loading plugins: ${activePlugins.join(', ')}`);
    
    // Load all active plugins
    const loadedPlugins = await pluginSystem.loadPlugins(activePlugins, world);
    
    updateDebugPanel(`Successfully loaded ${loadedPlugins.length} plugins`);
  } catch (error) {
    console.error('Error loading plugins:', error);
    updateDebugPanel(`Error loading plugins: ${error.message}`);
  }
}

/**
 * Setup UI event listeners for pet interactions
 */
function setupUiEventListeners() {
  // Listen for window clicks for walking
  // TODO: Verify if walking plugin handles background clicks.
  document.addEventListener('click', (event) => {
    // Skip if clicking on UI elements instead of the window
    if (event.target.closest('.pet-button') || 
        event.target.closest('#pet') ||
        event.target.closest('#pet-stats') ||
        event.target.closest('.plugin-container')) { // Added check for any plugin container
      return;
    }
    
    // Convert client coordinates to screen coordinates for walking
    const screenX = window.screenX + event.clientX;
    const screenY = window.screenY + event.clientY;
    
    // Let the ECS integration handle the walk command
    ecsIntegration.startWalking(screenX, screenY); 
    updateDebugPanel(`Walking to: ${screenX}, ${screenY}`);
  });
  
  // Setup ECS event listeners
  window.api.onEcsEvent('appearanceUpdated', (data) => {
    updateDebugPanel(`Pet appearance updated: ${data.appearance.status}`);
  });
  
  window.api.onEcsEvent('positionUpdated', (data) => {
    updateDebugPanel(`Pet position updated: ${Math.round(data.x)}, ${Math.round(data.y)}`);
  });
  
  window.api.onEcsEvent('targetReached', (data) => {
    updateDebugPanel(`Pet reached target position: ${Math.round(data.x)}, ${Math.round(data.y)}`);
  });
}

/**
 * Helper to update the debug panel
 * @param {string} message - Message to display
 */
function updateDebugPanel(message) {
  if (!window.DEV_MODE) return;
  
  const debugPanel = document.getElementById('debug-info');
  if (debugPanel) {
    const timestamp = new Date().toLocaleTimeString();
    const msgElement = document.createElement('p');
    msgElement.textContent = `[${timestamp}] ${message}`;
    debugPanel.appendChild(msgElement);
    
    // Scroll to bottom
    debugPanel.scrollTop = debugPanel.scrollHeight;
  }
} 