/**
 * js/plugins/walking/main.js - Walking plugin for main process
 * Using the ECS architecture
 */

/**
 * Create a walking system for the ECS world
 * @returns {Object} The walking system
 */
export function createWalkingSystem() {
  return {
    // Required components for entities this system processes
    requiredComponents: ['position', 'appearance', 'stats'],
    
    // System configuration
    config: {
      walkSpeed: 2, // pixels per update
      energyCostInterval: 5000, // ms between energy costs
      energyCost: 1, // energy points per interval
      lastEnergyCostTime: 0
    },
    
    // Initialize the system with the world
    init(world) {
      this.world = world;
      this.config.lastEnergyCostTime = Date.now();
      
      // Register component type for this plugin
      world.registerComponentType('walking.walkState', {
        isWalking: false,
        target: null,
        lastTargetReached: null
      });
      
      // Listen for walk requests
      world.on('walkRequested', ({ entityId, targetX, targetY }) => {
        this.startWalking(entityId, targetX, targetY);
      });
      
      // Listen for stop walking requests
      world.on('stopWalkRequested', (entityId) => {
        this.stopWalking(entityId);
      });
      
      console.log('Walking system initialized with ECS');
    },
    
    // Update entities with walking component
    update(deltaTime, world) {
      // Find entities that are walking
      const walkingEntities = world.getEntitiesWith('walking.walkState', 'position');
      
      // Process each walking entity
      walkingEntities.forEach(entity => {
        const walkState = entity.getComponent('walking.walkState');
        if (!walkState.isWalking || !walkState.target) return;
        
        const position = entity.getComponent('position');
        if (!position) return;
        
        // Calculate distance to target
        const dx = walkState.target.x - position.x;
        const dy = walkState.target.y - position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Check if we reached the target
        if (distance < this.config.walkSpeed) {
          position.x = walkState.target.x;
          position.y = walkState.target.y;
          
          // Save the last target reached
          walkState.lastTargetReached = { ...walkState.target };
          walkState.target = null;
          
          // Emit event that we reached the target
          world.emitEvent('targetReached', { 
            entityId: entity.id, 
            x: position.x, 
            y: position.y
          });
          
          // Stop walking if no new target is set
          this.stopWalking(entity.id);
          return;
        }
        
        // Move towards target
        const dirX = dx / distance;
        const dirY = dy / distance;
        
        // Calculate new position
        position.x += dirX * this.config.walkSpeed;
        position.y += dirY * this.config.walkSpeed;
        
        // Update the position component
        world.emitEvent('positionUpdated', {
          entityId: entity.id,
          x: position.x,
          y: position.y
        });
        
        // Handle energy cost for walking
        const now = Date.now();
        if (now - this.config.lastEnergyCostTime >= this.config.energyCostInterval) {
          if (entity.hasComponent('stats')) {
            const stats = entity.getComponent('stats');
            stats.energy = Math.max(0, stats.energy - this.config.energyCost);
            
            // Emit stats updated event
            world.emitEvent('statsUpdated', {
              entityId: entity.id,
              stats
            });
            
            // If energy is depleted, stop walking
            if (stats.energy <= 0) {
              this.stopWalking(entity.id);
            }
          }
          
          // Update last energy cost time
          this.config.lastEnergyCostTime = now;
        }
      });
    },
    
    // Start walking for an entity
    startWalking(entityId, targetX, targetY) {
      const entity = this.world.getEntity(entityId);
      if (!entity) return false;
      
      // Check if entity has enough energy to walk
      if (entity.hasComponent('stats')) {
        const stats = entity.getComponent('stats');
        if (stats.energy < 10) return false; // Not enough energy
      }
      
      // Update or add walking component
      if (entity.hasComponent('walking.walkState')) {
        const walkState = entity.getComponent('walking.walkState');
        walkState.isWalking = true;
        walkState.target = { x: targetX, y: targetY };
      } else {
        this.world.addComponent(entityId, 'walking.walkState', {
          isWalking: true,
          target: { x: targetX, y: targetY },
          lastTargetReached: null
        });
      }
      
      // Update appearance to walking status
      if (entity.hasComponent('appearance')) {
        const appearance = entity.getComponent('appearance');
        appearance.status = 'walking';
        this.world.emitEvent('appearanceUpdated', { entityId, appearance });
      }
      
      // Emit walking started event
      this.world.emitEvent('walkingStarted', { 
        entityId, 
        targetX, 
        targetY 
      });
      
      return true;
    },
    
    // Stop walking for an entity
    stopWalking(entityId) {
      const entity = this.world.getEntity(entityId);
      if (!entity) return false;
      
      // Check if the entity is walking
      if (!entity.hasComponent('walking.walkState')) return false;
      
      const walkState = entity.getComponent('walking.walkState');
      const wasWalking = walkState.isWalking;
      
      // Update walk state
      walkState.isWalking = false;
      walkState.target = null;
      
      // Update appearance back to idle
      if (entity.hasComponent('appearance')) {
        const appearance = entity.getComponent('appearance');
        appearance.status = 'idle';
        this.world.emitEvent('appearanceUpdated', { entityId, appearance });
      }
      
      // Emit walking stopped event
      if (wasWalking) {
        this.world.emitEvent('walkingStopped', { entityId });
      }
      
      return wasWalking;
    }
  };
}

/**
 * Initialize plugin system integration
 * @param {World} world - The ECS world
 */
export function initialize(world) {
  // Register our walking system
  const walkingSystem = createWalkingSystem();
  world.registerSystem('walking.system', walkingSystem);
  
  console.log('Walking plugin main process initialized with ECS');
  return true;
}

/**
 * Clean up the plugin
 */
export function cleanup() {
  console.log('Walking plugin main process cleanup');
  // Nothing to clean up - the ECS world will handle system cleanup
} 