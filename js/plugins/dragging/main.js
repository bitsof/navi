/**
 * js/plugins/dragging/main.js - Dragging plugin for main process
 * Using the ECS architecture
 */

/**
 * Create a dragging system for the ECS world
 * @returns {Object} The dragging system
 */
export function createDraggingSystem() {
  return {
    // Required components for entities this system processes
    requiredComponents: ['appearance'],
    
    // Initialize the system with the world
    init(world) {
      this.world = world;
      
      // Register component type for this plugin
      world.registerComponentType('dragging.dragState', {
        isDragging: false,
        lastPosition: { x: 0, y: 0 }
      });
      
      // Listen for drag events
      world.on('dragStarted', (entityId) => {
        this.startDragging(entityId);
      });
      
      world.on('dragEnded', (entityId) => {
        this.stopDragging(entityId);
      });
      
      console.log('Dragging system initialized in main process with ECS');
    },
    
    // Update the system
    update(deltaTime, world) {
      // This system is event-driven, no per-frame updates needed
    },
    
    // Start dragging an entity
    startDragging(entityId) {
      const entity = this.world.getEntity(entityId);
      if (!entity) return false;
      
      // Update appearance component to show dragging status
      if (entity.hasComponent('appearance')) {
        const appearance = entity.getComponent('appearance');
        appearance.status = 'dragging';
        this.world.emitEvent('appearanceUpdated', { entityId, appearance });
      }
      
      // Add or update dragging component
      if (entity.hasComponent('dragging.dragState')) {
        const dragState = entity.getComponent('dragging.dragState');
        dragState.isDragging = true;
      } else {
        this.world.addComponent(entityId, 'dragging.dragState', {
          isDragging: true,
          lastPosition: { x: 0, y: 0 }
        });
      }
      
      // Emit dragging started event
      this.world.emitEvent('draggingStarted', { entityId });
      return true;
    },
    
    // Stop dragging an entity
    stopDragging(entityId) {
      const entity = this.world.getEntity(entityId);
      if (!entity) return false;
      
      // Update appearance component to show idle status
      if (entity.hasComponent('appearance')) {
        const appearance = entity.getComponent('appearance');
        appearance.status = 'idle';
        this.world.emitEvent('appearanceUpdated', { entityId, appearance });
      }
      
      // Update dragging component
      if (entity.hasComponent('dragging.dragState')) {
        const dragState = entity.getComponent('dragging.dragState');
        dragState.isDragging = false;
      }
      
      // Emit dragging stopped event
      this.world.emitEvent('draggingStopped', { entityId });
      return true;
    }
  };
}

/**
 * Initialize plugin system integration
 * @param {World} world - The ECS world
 */
export function initialize(world) {
  // Register our dragging system
  const draggingSystem = createDraggingSystem();
  world.registerSystem('dragging.system', draggingSystem);
  
  console.log('Dragging plugin main process initialized with ECS');
  return true;
}

/**
 * Clean up the plugin
 */
export function cleanup() {
  console.log('Dragging plugin main process cleanup');
  // Nothing to clean up - the ECS world will handle system removal
} 