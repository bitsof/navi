/**
 * js/plugins/dragging/renderer.js - Dragging plugin for renderer
 * Using the ECS architecture
 */

// Plugin state
let isPetDragging = false;
let initialClickOffset = { x: 0, y: 0 };
let unsubscribeFunctions = [];

/**
 * Initialize the dragging plugin with ECS
 * @param {Object} api - The ECS plugin API
 */
export function initialize(api) {
  console.log('Dragging plugin initialized in renderer with ECS');
  
  // Get a container for our UI 
  const container = api.getPluginContainer();
  container.className = 'dragging-container';
  
  // Register a dragging component for this plugin
  api.registerComponent('dragging', {
    isDragging: false,
    offset: { x: 0, y: 0 }
  });
  
  // Set up event listeners for the pet element
  setupDragListeners(api);
  
  // Register context menu items
  registerContextMenuItems(api);
  
  // Listen for pet component changes
  const unsubscribePetComponent = api.onPetComponentChange('dragging', (newData, oldData) => {
    isPetDragging = newData.isDragging;
  });
  
  unsubscribeFunctions.push(unsubscribePetComponent);
}

/**
 * Clean up the plugin
 */
export function cleanup() {
  console.log('Dragging plugin cleanup');
  
  // Unsubscribe from all events
  unsubscribeFunctions.forEach(fn => fn());
  unsubscribeFunctions = [];
  
  // Remove event listeners from the window
  window.removeEventListener('mousemove', onWindowMouseMove);
  window.removeEventListener('mouseup', onWindowMouseUp);
  
  // The pet element will be handled by the core display system
}

/**
 * Register context menu items for this plugin
 * @param {Object} api - The ECS plugin API
 */
function registerContextMenuItems(api) {
  // Add a separator before the position controls
  api.registerMenuItem('──────────', () => {}, { 
    order: 150 
  });
  
  // Register center pet menu item
  api.registerMenuItem('Center on Screen', () => {
    // Get the screen dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate center position
    const centerX = window.screenX + Math.floor(viewportWidth / 2);
    const centerY = window.screenY + Math.floor(viewportHeight / 2);
    
    // Update pet position to center of screen
    window.api.updatePosition(centerX, centerY);
  }, { 
    icon: '🎯',
    order: 160
  });
  
  // Register toggle dragging menu item
  api.registerMenuItem('Start Dragging', () => {
    // Start dragging mode
    window.api.startDragging();
  }, { 
    icon: '✋',
    order: 170,
    condition: () => {
      // Only show when not dragging
      return !isPetDragging;
    }
  });
}

/**
 * Sets up event listeners for dragging
 * @param {Object} api - The ECS plugin API
 */
function setupDragListeners(api) {
  // Find the pet element
  const petElement = document.getElementById('pet');
  if (!petElement) {
    console.error('Dragging plugin: Pet element not found');
    
    // Try again in a second - it might not be created yet
    setTimeout(() => setupDragListeners(api), 1000);
    return;
  }
  
  // Set up pet element event listeners
  petElement.addEventListener('mousedown', (event) => onPetMouseDown(event, api));
  
  // Set up window event listeners
  window.addEventListener('mousemove', (event) => onWindowMouseMove(event, api));
  window.addEventListener('mouseup', (event) => onWindowMouseUp(event, api));
  
  console.log('Dragging plugin: Drag listeners set up');
}

/**
 * Mouse down handler for the pet element
 * @param {MouseEvent} event - The mouse event
 * @param {Object} api - The ECS plugin API
 */
function onPetMouseDown(event, api) {
  if (event.button !== 0) return; // Only left click
  
  // Start dragging
  isPetDragging = true;
  
  // Update the component
  api.addComponentToPet('dragging', {
    isDragging: true,
    offset: initialClickOffset
  });
  
  // Tell the main process we're dragging
  window.api.startDragging();
  
  // Calculate the click offset from the pet's position
  const petRect = event.target.getBoundingClientRect();
  initialClickOffset = { 
    x: event.clientX - petRect.left, 
    y: event.clientY - petRect.top 
  };
  
  // Prevent default behavior and text selection
  event.preventDefault();
}

/**
 * Mouse move handler for the window
 * @param {MouseEvent} event - The mouse event
 * @param {Object} api - The ECS plugin API
 */
function onWindowMouseMove(event, api) {
  if (!isPetDragging) return;
  
  // Calculate the new position based on mouse position and initial click offset
  const newX = event.screenX - initialClickOffset.x;
  const newY = event.screenY - initialClickOffset.y;
  
  // Update the pet position in the main process through the ECS API
  window.api.updatePosition(newX, newY);
  
  // Prevent default behavior
  event.preventDefault();
}

/**
 * Mouse up handler for the window
 * @param {MouseEvent} event - The mouse event
 * @param {Object} api - The ECS plugin API
 */
function onWindowMouseUp(event, api) {
  if (!isPetDragging) return;
  
  // Stop dragging
  isPetDragging = false;
  
  // Update the component
  api.addComponentToPet('dragging', {
    isDragging: false,
    offset: { x: 0, y: 0 }
  });
  
  // Tell the main process we stopped dragging through the ECS API
  window.api.stopDragging();
  
  // Prevent default behavior
  event.preventDefault();
} 