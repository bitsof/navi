/**
 * js/plugins/coreDisplay/renderer.js - Core display plugin for renderer
 * Using the ECS architecture
 */

// Plugin state
let petElement = null;
let unsubscribeFunctions = [];

/**
 * Initialize the core display plugin with ECS
 * @param {Object} api - The ECS plugin API
 */
export function initialize(api) {
  console.log('Core display plugin initialized in renderer with ECS');
  
  // Get a container for our UI
  const container = api.getPluginContainer();
  container.className = 'core-display-container';
  container.style.visibility = 'visible';
  container.style.opacity = '1';
  
  // Create the UI
  createUI(container, api);
  
  // Register core functionality that other plugins may use
  registerCoreFunctionality(api);
  
  // Register context menu items
  registerContextMenuItems(api);
  
  // Listen for appearance updates
  const unsubscribeAppearance = api.on('appearanceUpdated', (data) => {
    if (data.entityId === 'mainPet') {
      updateAppearance(data.appearance);
    }
  });
  unsubscribeFunctions.push(unsubscribeAppearance);
  
  // Listen for stats updates
  const unsubscribeStats = api.on('statsUpdated', (data) => {
    if (data.entityId === 'mainPet') {
      updateStats(data.stats);
    }
  });
  unsubscribeFunctions.push(unsubscribeStats);
  
  // Get initial entity state
  const mainPet = api.getWorld().getEntity('mainPet');
  if (mainPet) {
    if (mainPet.hasComponent('appearance')) {
      updateAppearance(mainPet.getComponent('appearance'));
    }
    if (mainPet.hasComponent('stats')) {
      updateStats(mainPet.getComponent('stats'));
    }
    if (mainPet.hasComponent('identity')) {
      updateIdentity(mainPet.getComponent('identity'));
    }
  }
  
  // Emit event that core display is ready
  api.emit('ready', {});
  
  // Debug info
  console.log('Core display plugin UI created with ECS');
}

/**
 * Clean up the plugin
 */
export function cleanup() {
  console.log('Core display plugin cleanup');
  
  // Unsubscribe from all events
  unsubscribeFunctions.forEach(fn => fn());
  unsubscribeFunctions = [];
  
  // Remove the container
  const container = document.getElementById('plugin-coreDisplay');
  if (container) {
    container.remove();
  }
}

/**
 * Creates the core UI elements
 * @param {HTMLElement} container - The container element
 * @param {Object} api - The ECS plugin API
 */
function createUI(container, api) {
  // Create pet element - this is the main element other plugins will interact with
  petElement = document.createElement('div');
  petElement.id = 'pet';
  petElement.className = 'pet idle';
  petElement.style.display = 'block';
  container.appendChild(petElement);
  
  // Register the pet element as a component other plugins can access
  api.registerComponent('uiElement', {
    element: petElement,
    type: 'main',
    description: 'Main pet display element'
  });
  
  // Create pet stats container
  const statsContainer = document.createElement('div');
  statsContainer.id = 'pet-stats';
  statsContainer.className = 'pet-stats';
  container.appendChild(statsContainer);
  
  // Create pet name
  const petName = document.createElement('h2');
  petName.id = 'pet-name';
  petName.className = 'pet-name';
  statsContainer.appendChild(petName);
  
  // Create hunger meter
  createMeter(statsContainer, 'hunger', 'Hunger', api);
  
  // Create happiness meter
  createMeter(statsContainer, 'happiness', 'Happiness', api);
  
  // Create energy meter
  createMeter(statsContainer, 'energy', 'Energy', api);
  
  // We no longer need the button controls since we're using the context menu system
  // Add a note for users to right-click
  const notesContainer = document.createElement('div');
  notesContainer.id = 'pet-controls-note';
  notesContainer.className = 'pet-controls-note';
  notesContainer.textContent = 'Right-click pet for actions';
  notesContainer.style.textAlign = 'center';
  notesContainer.style.margin = '10px 0';
  notesContainer.style.fontSize = '12px';
  notesContainer.style.color = '#666';
  container.appendChild(notesContainer);
}

/**
 * Creates a meter UI element
 * @param {HTMLElement} container - The container element
 * @param {string} type - The type of meter
 * @param {string} label - The label for the meter
 * @param {Object} api - The ECS plugin API
 */
function createMeter(container, type, label, api) {
  const meterContainer = document.createElement('div');
  meterContainer.className = 'meter-container';
  container.appendChild(meterContainer);
  
  const meterLabel = document.createElement('div');
  meterLabel.className = 'meter-label';
  meterLabel.textContent = label;
  meterContainer.appendChild(meterLabel);
  
  const meter = document.createElement('meter');
  meter.id = `${type}-meter`;
  meter.className = 'meter';
  meter.min = 0;
  meter.max = 100;
  meter.low = 30;
  meter.high = 70;
  meter.optimum = 50;
  meterContainer.appendChild(meter);
  
  // Register the meter element with the plugin
  api.registerComponent(`meter-${type}`, {
    element: meter,
    type: 'meter',
    description: `${label} meter`
  });
}

/**
 * Creates a button UI element
 * @param {HTMLElement} container - The container element
 * @param {string} id - Button ID
 * @param {string} text - Button text
 * @param {Function} onClick - Click handler
 * @param {Object} api - The ECS plugin API
 */
function createButton(container, id, text, onClick, api) {
  const button = document.createElement('button');
  button.id = id;
  button.className = 'pet-button';
  button.textContent = text;
  button.addEventListener('click', onClick);
  container.appendChild(button);
  
  // Register the button with the plugin
  api.registerComponent(`button-${id}`, {
    element: button,
    type: 'button',
    description: `${text} button`
  });
}

/**
 * Updates the appearance of the pet in the UI
 * @param {Object} appearance - Appearance component data
 */
function updateAppearance(appearance) {
  if (!petElement || !appearance) return;
  
  // Update the graphic
  petElement.textContent = appearance.graphic || '🐱';
  
  // Update CSS classes based on status - needed for other plugins
  const allStatusClasses = ['idle', 'walking', 'interacting', 'sleeping', 'dragging'];
  petElement.classList.remove(...allStatusClasses);
  petElement.classList.add(appearance.status || 'idle');
  
  // Also update mood data attribute for CSS targeting
  petElement.dataset.mood = appearance.mood || 'neutral';
}

/**
 * Updates the stats display in the UI
 * @param {Object} stats - Stats component data
 */
function updateStats(stats) {
  if (!stats) return;
  
  // Update meters
  updateMeter('hunger', stats.hunger);
  updateMeter('happiness', stats.happiness);
  updateMeter('energy', stats.energy);
  
  // Update buttons based on stats
  updateButtonsFromStats(stats);
}

/**
 * Updates the identity information in the UI
 * @param {Object} identity - Identity component data
 */
function updateIdentity(identity) {
  if (!identity) return;
  
  // Update pet name
  const petName = document.getElementById('pet-name');
  if (petName) {
    petName.textContent = identity.name || 'Buddy';
  }
}

/**
 * Updates a meter element
 * @param {string} type - The type of meter
 * @param {number} value - The value to set
 */
function updateMeter(type, value) {
  const meter = document.getElementById(`${type}-meter`);
  if (meter) {
    meter.value = value || 0;
  }
}

/**
 * Updates button states based on pet stats
 * @param {Object} stats - Pet stats
 */
function updateButtonsFromStats(stats) {
  if (!stats) return;
  
  // Update feed button
  const feedButton = document.getElementById('feed-button');
  if (feedButton) {
    feedButton.disabled = stats.hunger <= 20;
  }
  
  // Update play button
  const playButton = document.getElementById('play-button');
  if (playButton) {
    playButton.disabled = stats.energy <= 15;
  }
  
  // Update sleep button
  const sleepButton = document.getElementById('sleep-button');
  if (sleepButton) {
    sleepButton.disabled = stats.energy >= 90;
  }
}

/**
 * Registers core functionality that other plugins may use
 * @param {Object} api - The ECS plugin API
 */
function registerCoreFunctionality(api) {
  // Register core component for pet animations
  api.registerComponent('animation', {
    activeAnimations: new Set(),
    queued: []
  });
  
  // Listen for pet animation events
  api.on('plugin:animation:trigger', (data) => {
    if (!petElement || !data.animation) return;
    
    const animationClass = `animation-${data.animation}`;
    petElement.classList.add(animationClass);
    
    setTimeout(() => {
      petElement.classList.remove(animationClass);
    }, data.duration || 1000);
  });
}

/**
 * Register context menu items for this plugin
 * @param {Object} api - The ECS plugin API
 */
function registerContextMenuItems(api) {
  // Register pet info menu item
  api.registerMenuItem('Pet Info', () => {
    const mainPet = api.getWorld().getEntity('mainPet');
    if (!mainPet) return;
    
    const identity = mainPet.getComponent('identity');
    const stats = mainPet.getComponent('stats');
    
    if (!identity || !stats) return;
    
    // Show pet info in a dialog or alert (in a real app you'd make a nicer UI)
    alert(`Name: ${identity.name}\nType: ${identity.type}\n\nHunger: ${stats.hunger}%\nHappiness: ${stats.happiness}%\nEnergy: ${stats.energy}%`);
  }, { 
    icon: 'ℹ️',
    order: 1
  });
  
  // Register a "Debug Info" menu item that only shows in dev mode
  if (window.DEV_MODE) {
    api.registerMenuItem('Toggle Debug Panel', () => {
      const debugPanel = document.getElementById('debug-info');
      if (debugPanel) {
        debugPanel.style.display = debugPanel.style.display === 'block' ? 'none' : 'block';
      }
    }, { 
      icon: '🔧',
      order: 200
    });
  }
} 