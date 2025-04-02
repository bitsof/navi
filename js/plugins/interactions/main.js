/**
 * js/plugins/interactions/main.js - Interactions plugin for main process
 * Using the ECS architecture
 */

/**
 * Create an interactions system for the ECS world
 * @returns {Object} The interactions system
 */
export function createInteractionsSystem() {
  return {
    // Required components for entities this system processes
    requiredComponents: ['stats', 'appearance'],
    
    // Pet config reference
    petConfigs: new Map(),
    
    // Initialize the system with the world
    init(world) {
      this.world = world;
      
      // Register component type for this plugin
      world.registerComponentType('interactions.interactionState', {
        lastInteraction: null,
        interactionCount: {
          pet: 0,
          dance: 0,
          trick: 0,
          treat: 0
        }
      });
      
      // Listen for config loading
      world.on('configLoaded', (config) => {
        // Store pet configurations for interaction effects
        if (config.petConfigs) {
          Object.entries(config.petConfigs).forEach(([type, petConfig]) => {
            this.petConfigs.set(type, petConfig);
          });
        }
      });
      
      // Listen for interaction events
      world.on('interactionRequested', ({ entityId, interactionType, data }) => {
        this.handleInteraction(entityId, interactionType, data);
      });
      
      console.log('Interactions system initialized with ECS');
    },
    
    // Update the system - interactions are event-driven so no per-frame updates needed
    update(deltaTime, world) {
      // No per-frame updates needed
    },
    
    // Handle a pet interaction
    handleInteraction(entityId, interactionType, data = {}) {
      const entity = this.world.getEntity(entityId);
      if (!entity) return false;
      
      // Get required components
      if (!entity.hasComponent('stats') || !entity.hasComponent('identity')) {
        return false;
      }
      
      const stats = entity.getComponent('stats');
      const identity = entity.getComponent('identity');
      
      // Get the pet configuration for this entity
      const petConfig = this.petConfigs.get(identity.type);
      if (!petConfig) return false;
      
      // Update interaction state component
      let interactionState;
      if (entity.hasComponent('interactions.interactionState')) {
        interactionState = entity.getComponent('interactions.interactionState');
      } else {
        interactionState = {
          lastInteraction: null,
          interactionCount: {
            pet: 0,
            dance: 0,
            trick: 0,
            treat: 0
          }
        };
        this.world.addComponent(entityId, 'interactions.interactionState', interactionState);
      }
      
      // Record this interaction
      interactionState.lastInteraction = {
        type: interactionType,
        timestamp: Date.now(),
        data
      };
      
      // Update interaction counter if this type is tracked
      if (interactionState.interactionCount[interactionType] !== undefined) {
        interactionState.interactionCount[interactionType]++;
      }
      
      // Set appearance to interacting temporarily
      if (entity.hasComponent('appearance')) {
        const appearance = entity.getComponent('appearance');
        const originalStatus = appearance.status;
        
        // Set to interacting
        appearance.status = 'interacting';
        this.world.emitEvent('appearanceUpdated', { entityId, appearance });
        
        // Restore original status after a delay
        setTimeout(() => {
          if (entity.hasComponent('appearance')) {
            const currentAppearance = entity.getComponent('appearance');
            if (currentAppearance.status === 'interacting') {
              currentAppearance.status = originalStatus;
              this.world.emitEvent('appearanceUpdated', { entityId, currentAppearance });
            }
          }
        }, 2000);
      }
      
      // Apply specific effects based on interaction type
      switch (interactionType) {
        case 'pet':
          return this.handlePet(entity, stats, petConfig);
          
        case 'feed':
        case 'play': 
        case 'sleep':
        case 'dance':
        case 'trick':
        case 'treat':
          // All these interactions use the standard stat modifiers
          return this.handleCustomInteraction(entity, interactionType, data, stats, petConfig);
          
        default:
          console.log(`Attempting to handle interaction type: ${interactionType}`);
          // Try to handle it as a custom interaction anyway
          return this.handleCustomInteraction(entity, interactionType, data, stats, petConfig);
      }
    },
    
    // Handle petting the pet
    handlePet(entity, stats, petConfig) {
      // Apply happiness boost for petting
      if (petConfig.statModifiers && petConfig.statModifiers.pet) {
        const happinessBoost = petConfig.statModifiers.pet.happiness || 5;
        stats.happiness = Math.min(100, stats.happiness + happinessBoost);
        
        // Update stats component
        this.world.emitEvent('statsUpdated', {
          entityId: entity.id,
          stats
        });
        
        // Emit interaction event
        this.world.emitEvent('interactionApplied', {
          entityId: entity.id,
          type: 'pet',
          effects: { happiness: happinessBoost }
        });
        
        return true;
      }
      
      return false;
    },
    
    // Handle custom interactions
    handleCustomInteraction(entity, interactionType, data, stats, petConfig) {
      // Get modifiers for this interaction if available
      const modifiers = petConfig.statModifiers && 
                        petConfig.statModifiers[interactionType];
      
      if (!modifiers) {
        console.log(`No modifiers found for interaction: ${interactionType}`);
        return false;
      }
      
      console.log(`Applying interaction: ${interactionType} with modifiers:`, modifiers);
      
      // Use the StatsSystem's applyAction method
      // This ensures consistent handling of stat modifications
      const statsSystem = this.world.systems.get('stats');
      if (statsSystem) {
        const success = statsSystem.applyAction(entity.id, interactionType);
        
        if (success) {
          // Record the effects (approximate)
          const effects = {};
          Object.keys(modifiers).forEach(stat => {
            effects[stat] = modifiers[stat];
          });
          
          // Emit interaction event
          this.world.emitEvent('interactionApplied', {
            entityId: entity.id,
            type: interactionType,
            effects,
            data
          });
          
          console.log(`Interaction ${interactionType} successfully applied to ${entity.id}`);
          return true;
        }
      } else {
        console.error('Stats system not found, falling back to direct modification');
        
        // Apply stat changes directly (fallback)
        const effects = {};
        let anyEffectApplied = false;
        
        // Apply each stat modifier
        Object.entries(modifiers).forEach(([stat, value]) => {
          if (stats[stat] !== undefined) {
            const oldValue = stats[stat];
            stats[stat] = Math.max(0, Math.min(100, stats[stat] + value));
            effects[stat] = stats[stat] - oldValue;
            anyEffectApplied = true;
          }
        });
        
        if (anyEffectApplied) {
          // Update stats component
          this.world.emitEvent('statsUpdated', {
            entityId: entity.id,
            stats
          });
          
          // Emit interaction event
          this.world.emitEvent('interactionApplied', {
            entityId: entity.id,
            type: interactionType,
            effects,
            data
          });
          
          return true;
        }
      }
      
      return false;
    }
  };
}

/**
 * Initialize plugin system integration
 * @param {World} world - The ECS world
 */
export function initialize(world) {
  // Register our interactions system
  const interactionsSystem = createInteractionsSystem();
  world.registerSystem('interactions.system', interactionsSystem);
  
  console.log('Interactions plugin main process initialized with ECS');
  return true;
}

/**
 * Clean up the plugin
 */
export function cleanup() {
  console.log('Interactions plugin main process cleanup');
  // Nothing to clean up - the ECS world will handle system cleanup
} 