/**
 * Stats system for the ECS. 
 * Handles updating pet stats over time and in response to actions.
 */

// Use ES module imports
import StatsComponent from '../components/stats.js';
import AppearanceComponent from '../components/appearance.js';

const StatsSystem = {
  // Required components for entities this system processes
  requiredComponents: ['stats'],
  
  // Configuration for the system
  config: {
    degradationInterval: 10000, // Time in ms between degradation checks (10 seconds)
    lastDegradationTime: 0
  },
  
  // Holds references to the entity config
  petConfigs: new Map(),
  
  /**
   * Initialize the system
   * @param {World} world - The ECS world
   */
  init(world) {
    this.world = world;
    this.config.lastDegradationTime = Date.now();
    
    // Listen for configuration changes
    world.on('configLoaded', (config) => {
      // Store pet configurations
      if (config.petConfigs) {
        Object.entries(config.petConfigs).forEach(([type, petConfig]) => {
          this.petConfigs.set(type, petConfig);
        });
      }
    });
  },
  
  /**
   * Update the stats of all entities with a stats component
   * @param {number} deltaTime - Time in ms since last update
   * @param {World} world - The ECS world
   */
  update(deltaTime, world) {
    const now = Date.now();
    const timeSinceLastDegradation = now - this.config.lastDegradationTime;
    
    // Check if it's time to degrade stats
    if (timeSinceLastDegradation >= this.config.degradationInterval) {
      // Compute hours passed for degradation calculation
      const hoursPassed = timeSinceLastDegradation / (1000 * 60 * 60);
      
      // Get all entities with stats
      const entities = world.getEntitiesWith('stats', 'identity');
      
      // Process each entity
      entities.forEach(entity => {
        const stats = entity.getComponent('stats');
        const identity = entity.getComponent('identity');
        const petConfig = this.petConfigs.get(identity.type);
        
        if (stats && petConfig && petConfig.degradationRates) {
          // Apply time-based degradation
          StatsComponent.applyDegradation(
            stats, 
            petConfig.degradationRates, 
            hoursPassed
          );
          
          // Update appearance based on new stats
          if (entity.hasComponent('appearance')) {
            const appearance = entity.getComponent('appearance');
            if (AppearanceComponent.updateMood(
              appearance, 
              stats, 
              petConfig.moodThresholds
            )) {
              // If mood changed, update the graphic
              AppearanceComponent.updateGraphic(
                appearance, 
                petConfig.graphicsMap
              );
            }
          }
        }
      });
      
      // Update last degradation time
      this.config.lastDegradationTime = now;
    }
  },
  
  /**
   * Apply an action to an entity's stats
   * @param {string} entityId - ID of the entity
   * @param {string} actionType - Type of action to apply
   * @returns {boolean} - Whether the action was applied successfully
   */
  applyAction(entityId, actionType) {
    const entity = this.world.getEntity(entityId);
    if (!entity || !entity.hasComponent('stats') || !entity.hasComponent('identity')) {
      return false;
    }
    
    const stats = entity.getComponent('stats');
    const identity = entity.getComponent('identity');
    const petConfig = this.petConfigs.get(identity.type);
    
    if (!petConfig || !petConfig.statModifiers || !petConfig.statModifiers[actionType]) {
      return false;
    }
    
    // Apply the stat modifiers for this action
    StatsComponent.applyModifiers(
      stats, 
      petConfig.statModifiers[actionType]
    );
    
    // Update appearance based on new stats
    if (entity.hasComponent('appearance')) {
      const appearance = entity.getComponent('appearance');
      if (AppearanceComponent.updateMood(
        appearance, 
        stats, 
        petConfig.moodThresholds
      )) {
        // If mood changed, update the graphic
        AppearanceComponent.updateGraphic(
          appearance, 
          petConfig.graphicsMap
        );
      }
    }
    
    return true;
  }
};

// Export using ES module syntax
export default StatsSystem;