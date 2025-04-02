/**
 * Movement system for the ECS.
 * Handles entity movement, including walking and dragging.
 */

// Use ES module imports
import PositionComponent from '../components/position.js';
import AppearanceComponent from '../components/appearance.js';

const MovementSystem = {
  // Required components for entities this system processes
  requiredComponents: ['position', 'appearance'],
  
  // Internal state for the system
  state: {
    entitiesWalking: new Map(), // entityId -> walkTarget
    walkingSpeed: 2,            // Pixels per update
  },
  
  /**
   * Initialize the system
   * @param {World} world - The ECS world
   */
  init(world) {
    this.world = world;
    
    // Listen for position update requests
    world.on('positionUpdateRequested', ({ entityId, x, y }) => {
      this.updateEntityPosition(entityId, x, y);
    });
    
    // Listen for walk requests
    world.on('walkRequested', ({ entityId, targetX, targetY }) => {
      this.startWalking(entityId, targetX, targetY);
    });
    
    // Listen for stop walking requests
    world.on('stopWalkRequested', (entityId) => {
      this.stopWalking(entityId);
    });
    
    // Listen for drag start requests
    world.on('dragStarted', (entityId) => {
      this.startDragging(entityId);
    });
    
    // Listen for drag end requests
    world.on('dragEnded', (entityId) => {
      this.stopDragging(entityId);
    });
  },
  
  /**
   * Update movement for all entities
   * @param {number} deltaTime - Time in ms since last update
   * @param {World} world - The ECS world
   */
  update(deltaTime, world) {
    // Process walking entities
    this.state.entitiesWalking.forEach((target, entityId) => {
      const entity = world.getEntity(entityId);
      if (!entity) {
        // Clean up if entity no longer exists
        this.state.entitiesWalking.delete(entityId);
        return;
      }
      
      const position = entity.getComponent('position');
      if (!position) return;
      
      // Calculate distance to target
      const dx = target.x - position.x;
      const dy = target.y - position.y;
      const distanceToTarget = Math.sqrt(dx * dx + dy * dy);
      
      // Check if we've reached the target
      if (distanceToTarget < this.state.walkingSpeed) {
        // We've arrived at the target
        position.x = target.x;
        position.y = target.y;
        
        // Stop walking
        this.stopWalking(entityId);
        
        // Notify that target was reached
        world.emitEvent('targetReached', { entityId, x: target.x, y: target.y });
        return;
      }
      
      // Move towards target
      const directionX = dx / distanceToTarget;
      const directionY = dy / distanceToTarget;
      
      position.x += directionX * this.state.walkingSpeed;
      position.y += directionY * this.state.walkingSpeed;
      
      // Notify that position was updated
      world.emitEvent('positionUpdated', { 
        entityId, 
        x: position.x, 
        y: position.y 
      });
    });
  },
  
  /**
   * Update an entity's position directly
   * @param {string} entityId - ID of the entity
   * @param {number} x - New X position
   * @param {number} y - New Y position
   * @returns {boolean} - Whether the position was updated
   */
  updateEntityPosition(entityId, x, y) {
    const entity = this.world.getEntity(entityId);
    if (!entity || !entity.hasComponent('position')) {
      return false;
    }
    
    const position = entity.getComponent('position');
    position.x = x;
    position.y = y;
    
    // Notify that position was updated
    this.world.emitEvent('positionUpdated', { entityId, x, y });
    return true;
  },
  
  /**
   * Start an entity walking to a target
   * @param {string} entityId - ID of the entity
   * @param {number} targetX - Target X position
   * @param {number} targetY - Target Y position
   * @returns {boolean} - Whether walking was started
   */
  startWalking(entityId, targetX, targetY) {
    const entity = this.world.getEntity(entityId);
    if (!entity || 
        !entity.hasComponent('position') || 
        !entity.hasComponent('appearance')) {
      return false;
    }
    
    // Set the walk target
    this.state.entitiesWalking.set(entityId, { x: targetX, y: targetY });
    
    // Update appearance to walking
    const appearance = entity.getComponent('appearance');
    if (appearance) {
      appearance.status = 'walking';
      this.world.emitEvent('appearanceUpdated', { entityId, appearance });
    }
    
    return true;
  },
  
  /**
   * Stop an entity from walking
   * @param {string} entityId - ID of the entity
   * @returns {boolean} - Whether walking was stopped
   */
  stopWalking(entityId) {
    const wasWalking = this.state.entitiesWalking.has(entityId);
    this.state.entitiesWalking.delete(entityId);
    
    if (wasWalking) {
      const entity = this.world.getEntity(entityId);
      if (entity && entity.hasComponent('appearance')) {
        // Update appearance back to idle
        const appearance = entity.getComponent('appearance');
        appearance.status = 'idle';
        this.world.emitEvent('appearanceUpdated', { entityId, appearance });
      }
    }
    
    return wasWalking;
  },
  
  /**
   * Start dragging an entity
   * @param {string} entityId - ID of the entity
   * @returns {boolean} - Whether dragging was started
   */
  startDragging(entityId) {
    const entity = this.world.getEntity(entityId);
    if (!entity || !entity.hasComponent('appearance')) {
      return false;
    }
    
    // Stop any walking that might be happening
    this.stopWalking(entityId);
    
    // Update appearance to dragging
    const appearance = entity.getComponent('appearance');
    appearance.status = 'dragging';
    this.world.emitEvent('appearanceUpdated', { entityId, appearance });
    
    return true;
  },
  
  /**
   * Stop dragging an entity
   * @param {string} entityId - ID of the entity
   * @returns {boolean} - Whether dragging was stopped
   */
  stopDragging(entityId) {
    const entity = this.world.getEntity(entityId);
    if (!entity || !entity.hasComponent('appearance')) {
      return false;
    }
    
    // Update appearance back to idle
    const appearance = entity.getComponent('appearance');
    appearance.status = 'idle';
    this.world.emitEvent('appearanceUpdated', { entityId, appearance });
    
    return true;
  }
};

// Export using ES module syntax only
export default MovementSystem;