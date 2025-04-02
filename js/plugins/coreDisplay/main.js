/**
 * js/plugins/coreDisplay/main.js - Core display plugin main process
 * Using the ECS architecture
 */

/**
 * Create a core display system for the ECS world
 * @returns {Object} The core display system
 */
export function createCoreDisplaySystem() {
  return {
    // Required components for entities this system processes
    requiredComponents: ['appearance', 'identity'],
    
    // Initialize the system with the world
    init(world) {
      this.world = world;
      
      // Not much to do here - this plugin primarily runs in the renderer process
      console.log('Core display system initialized in main process with ECS');
    },
    
    // Update the system - this system is event-driven
    update(deltaTime, world) {
      // No specific per-frame updates needed
    }
  };
}

/**
 * Initialize plugin system integration
 * @param {World} world - The ECS world
 */
export function initialize(world) {
  // Register our core display system
  const coreDisplaySystem = createCoreDisplaySystem();
  world.registerSystem('coreDisplay.system', coreDisplaySystem);
  
  console.log('Core display plugin main process initialized with ECS');
  return true;
}

/**
 * Clean up the plugin
 */
export function cleanup() {
  console.log('Core display plugin main process cleanup');
  // Nothing to clean up - the ECS world will handle system cleanup
} 