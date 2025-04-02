/**
 * js/plugins/walking/renderer.js - Walking plugin for renderer
 * Using the ECS architecture
 */

// Plugin state
let walkingContainer = null;
let isWalking = false;
let targetMarker = null;
let unsubscribeFunctions = [];

/**
 * Initialize the walking plugin with ECS
 * @param {Object} api - The ECS plugin API
 */
export function initialize(api) {
  console.log('Walking plugin initialized in renderer with ECS');
  
  // Register a walking component for this plugin
  api.registerComponent('walking', {
    isWalking: false,
    target: null,
    lastTargetReached: null
  });
  
  // Create UI elements (for backward compatibility)
  createWalkingUI(api);
  
  // Register context menu items
  registerContextMenuItems(api);
  
  // Set up event listeners
  setupEventListeners(api);
  
  // Listen for appearance changes to detect walking state
  const unsubscribeAppearance = api.onPetComponentChange('appearance', (newAppearance) => {
    isWalking = newAppearance.status === 'walking';
    // No longer need to update button
  });
  
  unsubscribeFunctions.push(unsubscribeAppearance);
  
  // We no longer need to listen for stats changes for button updates
  // But we might need stats for context menu condition checks later
  
  // Listen for target reached events
  const unsubscribeTargetReached = api.on('targetReached', (data) => {
    // Hide target marker when target is reached
    if (targetMarker) {
      targetMarker.style.display = 'none';
    }
  });
  
  unsubscribeFunctions.push(unsubscribeTargetReached);
  
  // Listen for walking started events
  const unsubscribeWalkingStarted = api.on('walkingStarted', (data) => {
    isWalking = true;
    
    // Show target marker if target exists
    if (data.targetX !== undefined && data.targetY !== undefined) {
      updateTargetMarker(data.targetX, data.targetY);
    }
  });
  
  unsubscribeFunctions.push(unsubscribeWalkingStarted);
  
  // Listen for walking stopped events
  const unsubscribeWalkingStopped = api.on('walkingStopped', (data) => {
    isWalking = false;
    
    // Hide target marker
    if (targetMarker) {
      targetMarker.style.display = 'none';
    }
  });
  
  unsubscribeFunctions.push(unsubscribeWalkingStopped);
}

/**
 * Clean up the plugin
 */
export function cleanup() {
  console.log('Walking plugin cleanup');
  
  // Unsubscribe from all events
  unsubscribeFunctions.forEach(fn => fn());
  unsubscribeFunctions = [];
  
  // Remove UI elements
  if (walkingContainer) {
    walkingContainer.remove();
    walkingContainer = null;
  }
  
  // Remove target marker if present
  if (targetMarker) {
    targetMarker.remove();
    targetMarker = null;
  }
}

/**
 * Register context menu items for this plugin
 * @param {Object} api - The ECS plugin API
 */
function registerContextMenuItems(api) {
  // Add a separator before the walking controls
  api.registerMenuItem('──────────', () => {}, { 
    order: 90 
  });
  
  // Register Toggle Walking menu item
  api.registerMenuItem('Start Walking', () => {
    // Start walking mode but don't set a target yet
    window.api.startWalking(0, 0);
  }, { 
    icon: '👣',
    order: 100,
    condition: () => {
      // Only show when not walking
      return !isWalking;
    }
  });
  
  // Register Stop Walking menu item
  api.registerMenuItem('Stop Walking', () => {
    window.api.stopWalking();
    if (targetMarker) {
      targetMarker.style.display = 'none';
    }
  }, { 
    icon: '🛑',
    order: 100,
    condition: () => {
      // Only show when walking
      return isWalking;
    }
  });
  
  // Random Walk option
  api.registerMenuItem('Random Walk', () => {
    // Calculate a random position on screen
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Translate to screen coordinates (accounting for window position)
    const screenX = window.screenX + Math.floor(Math.random() * viewportWidth);
    const screenY = window.screenY + Math.floor(Math.random() * viewportHeight);
    
    // Start walking to random position
    window.api.startWalking(screenX, screenY);
    updateTargetMarker(screenX, screenY);
  }, { 
    icon: '🎲',
    order: 110,
    condition: () => {
      // Always available
      const mainPet = api.getWorld().getEntity('mainPet');
      return mainPet?.getComponent('stats')?.energy > 10;
    }
  });
}

/**
 * Creates the walking UI (now just the target marker, no buttons)
 * @param {Object} api - The ECS plugin API
 */
function createWalkingUI(api) {
  // Get a container for the walking UI but keep it empty
  walkingContainer = api.getPluginContainer();
  walkingContainer.className = 'walking-container';
  walkingContainer.style.display = 'none'; // Hide the container completely
  
  // Create target marker (hidden initially)
  targetMarker = document.createElement('div');
  targetMarker.id = 'walk-target-marker';
  targetMarker.className = 'walk-target-marker';
  targetMarker.style.display = 'none';
  document.body.appendChild(targetMarker);
}

/**
 * Sets up event listeners
 * @param {Object} api - The ECS plugin API
 */
function setupEventListeners(api) {
  // Click on document to set walk target
  document.addEventListener('click', (event) => handleDocumentClick(event, api));
}

// updateWalkButton function removed since we no longer have UI buttons

/**
 * Toggles walking mode
 * @param {Object} api - The ECS plugin API
 */
function toggleWalking(api) {
  if (isWalking) {
    // Stop walking
    window.api.stopWalking();
    
    // Hide target marker
    if (targetMarker) {
      targetMarker.style.display = 'none';
    }
  } else {
    // Start walking but don't set a target yet
    // The user will click somewhere to set the target
    window.api.startWalking(0, 0);
  }
}

/**
 * Handles clicks on the document to set walk targets
 * @param {MouseEvent} event - The mouse event
 * @param {Object} api - The ECS plugin API
 */
function handleDocumentClick(event, api) {
  // Ignore if not walking or clicked on UI elements
  if (!isWalking || 
      event.target.closest('.pet') ||
      event.target.closest('.walking-container') ||
      event.target.closest('.interaction-button') ||
      event.target.closest('.core-display-container')) {
    return;
  }
  
  // Convert client coordinates to screen coordinates (for Electron window position)
  const screenX = window.screenX + event.clientX;
  const screenY = window.screenY + event.clientY;
  
  // Update target marker
  updateTargetMarker(screenX, screenY);
  
  // Send target to main process through the ECS API
  window.api.startWalking(screenX, screenY);
}

/**
 * Updates the target marker position
 * @param {number} x - X coordinate (screen position)
 * @param {number} y - Y coordinate (screen position)
 */
function updateTargetMarker(x, y) {
  if (!targetMarker) return;
  
  // Convert screen coordinates back to client coordinates
  const clientX = x - window.screenX;
  const clientY = y - window.screenY;
  
  // Position the marker
  targetMarker.style.left = `${clientX}px`;
  targetMarker.style.top = `${clientY}px`;
  targetMarker.style.display = 'block';
} 