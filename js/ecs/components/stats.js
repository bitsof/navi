/**
 * Stats component for the ECS system.
 * Represents the basic attributes of a pet like hunger, happiness, energy.
 */

const StatsComponent = {
  // Factory method to create a new stats component
  create: (hunger = 50, happiness = 50, energy = 50) => ({
    hunger, 
    happiness, 
    energy,
    lastInteraction: Date.now()
  }),
  
  // Utility method to update a specific stat
  updateStat: (component, statName, value, min = 0, max = 100) => {
    if (component[statName] !== undefined) {
      component[statName] = Math.max(min, Math.min(max, value));
      component.lastInteraction = Date.now();
    }
    return component;
  },
  
  // Apply stat modifiers (e.g., from actions like feeding)
  applyModifiers: (component, modifiers) => {
    if (!modifiers) return component;
    
    Object.entries(modifiers).forEach(([stat, value]) => {
      if (component[stat] !== undefined) {
        component[stat] = Math.max(0, Math.min(100, component[stat] + value));
      }
    });
    
    component.lastInteraction = Date.now();
    return component;
  },
  
  // Apply time-based degradation
  applyDegradation: (component, rates, hoursPassed) => {
    if (!rates || hoursPassed <= 0) return component;
    
    Object.entries(rates).forEach(([stat, hourlyRate]) => {
      if (component[stat] !== undefined) {
        const change = Math.round(hourlyRate * hoursPassed);
        
        // Hunger increases, other stats decrease
        if (stat === 'hunger') {
          component[stat] = Math.min(100, component[stat] + change);
        } else {
          component[stat] = Math.max(0, component[stat] - change);
        }
      }
    });
    
    return component;
  },
  
  // Name for this component type
  typeName: 'stats'
};

// Export using ES module syntax
export default StatsComponent;