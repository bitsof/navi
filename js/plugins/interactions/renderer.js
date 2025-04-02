/**
 * js/plugins/interactions/renderer.js - Interactions plugin for renderer
 * Using the ECS architecture
 */

// Plugin state
let interactionsContainer = null;
let interactionCooldown = false;
let unsubscribeFunctions = [];

/**
 * Initialize the interactions plugin with ECS
 * @param {Object} api - The ECS plugin API
 */
export function initialize(api) {
  console.log('Interactions plugin initialized in renderer with ECS');
  
  // Register an interactions component for this plugin
  api.registerComponent('interactions', {
    lastInteraction: null,
    interactionCount: {
      pet: 0,
      dance: 0,
      trick: 0,
      treat: 0
    }
  });
  
  // Create UI elements (for backward compatibility)
  createInteractionsUI(api);
  
  // Register context menu items - this is the only UI we'll use now
  registerContextMenuItems(api);
  
  // Set up event listeners
  setupEventListeners(api);
  
  // No need to subscribe to stats for button updates since we're not showing buttons anymore
  // But we'll keep listening for stats to update menu items via the condition functions
  
  // Listen for interaction events
  const unsubscribeInteraction = api.on('interactionApplied', (data) => {
    // Show the right animation for the interaction type
    showInteractionAnimation(data.type);
  });
  
  unsubscribeFunctions.push(unsubscribeInteraction);
}

/**
 * Clean up the plugin
 */
export function cleanup() {
  console.log('Interactions plugin cleanup');
  
  // Unsubscribe from all events
  unsubscribeFunctions.forEach(fn => fn());
  unsubscribeFunctions = [];
  
  // Remove UI elements
  if (interactionsContainer) {
    interactionsContainer.remove();
    interactionsContainer = null;
  }
}

/**
 * Register context menu items for this plugin
 * @param {Object} api - The ECS plugin API
 */
function registerContextMenuItems(api) {
  // Register Pet menu item
  api.registerMenuItem('Pet', () => {
    // This interactionType should match one from the pet config's statModifiers
    api.getWorld().emitEvent('interactionRequested', {
      entityId: 'mainPet',
      interactionType: 'feed', // Changed to match config
      data: {}
    });
    console.log('Pet context menu item clicked - feed interaction'); // Debug log
    showInteractionAnimation('petting');
  }, { 
    icon: '✋',
    order: 10,
    condition: () => {
      // Always available
      return true;
    }
  });
  
  // Register Play menu item
  api.registerMenuItem('Play', () => {
    // This interactionType should match one from the pet config's statModifiers
    api.getWorld().emitEvent('interactionRequested', {
      entityId: 'mainPet',
      interactionType: 'play', // This is correct since it's in the config
      data: {}
    });
    console.log('Play context menu item clicked - play interaction'); // Debug log
    showInteractionAnimation('play');
  }, { 
    icon: '🎮',
    order: 20,
    condition: () => {
      // Only available if the pet has enough energy
      const mainPet = api.getWorld().getEntity('mainPet');
      return mainPet?.getComponent('stats')?.energy > 15;
    }
  });
  
  // Register Feed menu item
  api.registerMenuItem('Feed', () => {
    // This interactionType should match one from the pet config's statModifiers
    api.getWorld().emitEvent('interactionRequested', {
      entityId: 'mainPet',
      interactionType: 'feed', // This is correct since it's in the config
      data: {}
    });
    console.log('Feed context menu item clicked - feed interaction'); // Debug log
    showInteractionAnimation('feed');
  }, { 
    icon: '🍔',
    order: 30,
    condition: () => {
      // Only available if the pet is hungry enough
      const mainPet = api.getWorld().getEntity('mainPet');
      return mainPet?.getComponent('stats')?.hunger > 20;
    }
  });
  
  // Register Sleep menu item (with condition)
  api.registerMenuItem('Sleep', () => {
    // This interactionType should match one from the pet config's statModifiers
    api.getWorld().emitEvent('interactionRequested', {
      entityId: 'mainPet',
      interactionType: 'sleep', // This is correct since it's in the config
      data: {}
    });
    console.log('Sleep context menu item clicked - sleep interaction'); // Debug log
    showInteractionAnimation('sleep');
  }, { 
    icon: '💤',
    order: 40,
    condition: () => {
      // Only available if the pet has low energy
      const mainPet = api.getWorld().getEntity('mainPet');
      return mainPet?.getComponent('stats')?.energy < 90;
    }
  });
}

/**
 * Creates the interactions UI (now empty as we've moved to context menus)
 * @param {Object} api - The ECS plugin API
 */
function createInteractionsUI(api) {
  // Get a container for the interactions UI, but we won't add buttons
  interactionsContainer = api.getPluginContainer();
  interactionsContainer.className = 'interactions-container';
  
  // We no longer create buttons here since we're using the context menu system
  // The container still exists for compatibility but is empty
  
  // Set it to hidden
  interactionsContainer.style.display = 'none';
}

/**
 * Creates an interaction button
 * @param {string} id - Button ID
 * @param {string} text - Button text
 * @param {Function} onClick - Click handler
 * @param {HTMLElement} container - Container element
 */
function createInteractionButton(id, text, onClick, container) {
  const button = document.createElement('button');
  button.id = id;
  button.className = 'interaction-button';
  button.textContent = text;
  button.addEventListener('click', onClick);
  container.appendChild(button);
}

/**
 * Sets up event listeners
 * @param {Object} api - The ECS plugin API
 */
function setupEventListeners(api) {
  // Double-click on pet to pet it
  const petElement = document.getElementById('pet');
  if (petElement) {
    petElement.addEventListener('dblclick', () => handlePet(api));
  } else {
    // Try again in a second if pet element isn't created yet
    setTimeout(() => setupEventListeners(api), 1000);
  }
}

/**
 * Updates the button states based on pet stats
 * @param {Object} stats - Pet stats
 * @param {Object} api - The ECS plugin API
 */
function updateButtonStates(stats, api) {
  // Get the current pet appearance to check dragging state
  const mainPet = api.getWorld().getEntity('mainPet');
  const isDragging = mainPet?.getComponent('appearance')?.status === 'dragging';
  
  // Enable/disable buttons based on state
  updateButtonState('pet-button', !isDragging);
  updateButtonState('dance-button', stats.energy > 20);
  updateButtonState('trick-button', stats.energy > 30);
  updateButtonState('treat-button', stats.hunger > 30);
}

/**
 * Updates a button's enabled state
 * @param {string} id - Button ID
 * @param {boolean} enabled - Whether the button should be enabled
 */
function updateButtonState(id, enabled) {
  const button = document.getElementById(id);
  if (button) {
    button.disabled = !enabled || interactionCooldown;
  }
}

/**
 * Handles petting the pet
 * @param {Object} api - The ECS plugin API
 */
function handlePet(api) {
  if (interactionCooldown) return;
  
  // Set interaction cooldown
  setInteractionCooldown(api);
  
  // Emit an interaction request event to the ECS world
  api.getWorld().emitEvent('interactionRequested', {
    entityId: 'mainPet',
    interactionType: 'pet',
    data: {}
  });
  
  // Show interaction animation (will also be triggered by event listener)
  showInteractionAnimation('petting');
}

/**
 * Handles a custom interaction
 * @param {string} type - Interaction type
 * @param {Object} api - The ECS plugin API
 */
function handleCustomInteraction(type, api) {
  if (interactionCooldown) return;
  
  // Set interaction cooldown
  setInteractionCooldown(api);
  
  // Emit an interaction request event to the ECS world
  api.getWorld().emitEvent('interactionRequested', {
    entityId: 'mainPet',
    interactionType: type,
    data: {}
  });
  
  // Show interaction animation (will also be triggered by event listener)
  showInteractionAnimation(type);
}

/**
 * Shows an interaction animation
 * @param {string} type - Animation type
 */
function showInteractionAnimation(type) {
  const petElement = document.getElementById('pet');
  if (!petElement) return;
  
  // Add animation class
  petElement.classList.add(`${type}-animation`);
  
  // Remove animation class after animation completes
  setTimeout(() => {
    petElement.classList.remove(`${type}-animation`);
  }, 1000);
}

/**
 * Sets a cooldown for interactions to prevent spam
 * @param {Object} api - The ECS plugin API
 */
function setInteractionCooldown(api) {
  interactionCooldown = true;
  
  // Disable all interaction buttons
  document.querySelectorAll('.interaction-button').forEach(button => {
    button.disabled = true;
  });
  
  // Re-enable after cooldown period
  setTimeout(() => {
    interactionCooldown = false;
    
    // Update button states
    const mainPet = api.getWorld().getEntity('mainPet');
    if (mainPet && mainPet.hasComponent('stats')) {
      updateButtonStates(mainPet.getComponent('stats'), api);
    }
  }, 1500);
} 