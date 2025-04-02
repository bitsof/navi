/**
 * Render system for the ECS. This system is specific to the renderer process.
 * Handles synchronizing entity state with the UI.
 */

const RenderSystem = {
  // Required components for entities this system processes
  requiredComponents: ['appearance', 'position'],
  
  // References to DOM elements
  elements: {
    petElement: null,
    statMeters: {},
    buttons: {}
  },
  
  /**
   * Initialize the system
   * @param {World} world - The ECS world
   */
  init(world) {
    this.world = world;
    
    // Get references to DOM elements
    this.findDomElements();
    
    // Listen for appearance updates
    world.on('appearanceUpdated', ({ entityId, appearance }) => {
      this.updateEntityAppearance(entityId, appearance);
    });
    
    // Listen for position updates
    world.on('positionUpdated', ({ entityId, x, y }) => {
      this.updateEntityPosition(entityId, x, y);
    });
    
    // Listen for stats updates
    world.on('statsUpdated', ({ entityId, stats }) => {
      this.updateEntityStats(entityId, stats);
    });
  },
  
  /**
   * Find and cache references to DOM elements
   */
  findDomElements() {
    // Find the pet element
    this.elements.petElement = document.getElementById('pet');
    
    // Find the stat meters
    this.elements.statMeters = {
      hunger: document.getElementById('hunger-meter'),
      happiness: document.getElementById('happiness-meter'),
      energy: document.getElementById('energy-meter')
    };
    
    // Find the action buttons
    this.elements.buttons = {
      feed: document.getElementById('feed-button'),
      play: document.getElementById('play-button'),
      sleep: document.getElementById('sleep-button')
    };
  },
  
  /**
   * Update the system - not needed for this system as it's event-driven
   */
  update(deltaTime, world) {
    // This system doesn't need to update on every frame
    // It reacts to events instead
  },
  
  /**
   * Update the appearance of an entity in the UI
   * @param {string} entityId - ID of the entity
   * @param {Object} appearance - Appearance component data
   */
  updateEntityAppearance(entityId, appearance) {
    if (!this.elements.petElement) {
      // Retry finding DOM elements
      this.findDomElements();
      if (!this.elements.petElement) return;
    }
    
    // Get the entity
    const entity = this.world.getEntity(entityId);
    if (!entity) return;
    
    // Update the graphic
    this.elements.petElement.textContent = appearance.graphic || '🐱';
    
    // Update CSS classes for status
    this.elements.petElement.className = `pet ${appearance.status || 'idle'}`;
    
    // Update data attribute for mood
    this.elements.petElement.dataset.mood = appearance.mood || 'neutral';
  },
  
  /**
   * Update the position of an entity in the UI
   * @param {string} entityId - ID of the entity
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  updateEntityPosition(entityId, x, y) {
    // In a typical desktop pet, this would update Electron window position
    // For this system, we'll just emit an event for the main process to handle
    this.world.emitEvent('moveWindowRequested', { entityId, x, y });
  },
  
  /**
   * Update the stats of an entity in the UI
   * @param {string} entityId - ID of the entity
   * @param {Object} stats - Stats component data
   */
  updateEntityStats(entityId, stats) {
    // Update the stat meters
    Object.entries(this.elements.statMeters).forEach(([stat, meter]) => {
      if (meter && stats[stat] !== undefined) {
        meter.value = stats[stat];
      }
    });
    
    // Update the pet name
    const entity = this.world.getEntity(entityId);
    if (entity && entity.hasComponent('identity')) {
      const identity = entity.getComponent('identity');
      const nameElement = document.getElementById('pet-name');
      if (nameElement) {
        nameElement.textContent = identity.name || 'Buddy';
      }
    }
    
    // Update button states based on stats
    if (this.elements.buttons.feed) {
      this.elements.buttons.feed.disabled = stats.hunger < 20;
    }
    
    if (this.elements.buttons.play) {
      this.elements.buttons.play.disabled = stats.energy < 15;
    }
    
    if (this.elements.buttons.sleep) {
      this.elements.buttons.sleep.disabled = stats.energy > 90;
    }
  },
  
};

// For renderer use (browser environment)
export default RenderSystem;