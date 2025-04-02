/**
 * Appearance component for the ECS system.
 * Represents the visual aspects of a pet entity.
 */

const AppearanceComponent = {
  // Factory method to create a new appearance component
  create: (graphic = '🐱', status = 'idle', mood = 'neutral') => ({
    graphic,
    status,
    mood
  }),
  
  // Update the mood based on stats and thresholds
  updateMood: (component, stats, thresholds) => {
    let newMood = 'neutral';
    
    // Check if pet meets 'happy' criteria
    if (meetsThresholds(stats, thresholds.happy)) {
      newMood = 'happy';
    } 
    // Check if pet meets 'neutral' criteria
    else if (meetsThresholds(stats, thresholds.neutral)) {
      newMood = 'neutral';
    }
    // Default to 'sad' if no other mood criteria met
    else {
      newMood = 'sad';
    }
    
    // Only update if the mood has changed
    if (component.mood !== newMood) {
      component.mood = newMood;
      return true; // Indicate mood changed
    }
    
    return false; // Indicate no change
  },
  
  // Update the graphic based on status and mood
  updateGraphic: (component, graphicsMap) => {
    if (!graphicsMap) return false;
    
    const { status, mood } = component;
    let newGraphic = null;
    
    // Find the appropriate graphic in the map
    if (graphicsMap[status] && graphicsMap[status][mood]) {
      newGraphic = graphicsMap[status][mood];
    }
    // Fallback to idle graphics if specific combination not found
    else if (graphicsMap.idle && graphicsMap.idle[mood]) {
      newGraphic = graphicsMap.idle[mood];
    }
    // Ultimate fallback
    else {
      newGraphic = '🐱';
    }
    
    // Only update if the graphic has changed
    if (component.graphic !== newGraphic) {
      component.graphic = newGraphic;
      return true; // Indicate graphic changed
    }
    
    return false; // Indicate no change
  },
  
  // Update the status of the pet
  updateStatus: (component, newStatus) => {
    if (component.status !== newStatus) {
      component.status = newStatus;
      return true; // Indicate status changed
    }
    return false; // Indicate no change
  },
  
  // Name for this component type
  typeName: 'appearance'
};

/**
 * Helper function to check if stats meet all thresholds for a mood
 * @param {Object} stats - Current pet stats
 * @param {Object} thresholds - The thresholds to check
 * @returns {boolean} - Whether all thresholds are met
 */
function meetsThresholds(stats, thresholds) {
  if (!thresholds) return false;
  
  for (const [stat, conditions] of Object.entries(thresholds)) {
    if (conditions.min !== undefined && stats[stat] < conditions.min) {
      return false;
    }
    if (conditions.max !== undefined && stats[stat] > conditions.max) {
      return false;
    }
  }
  return true;
}

// Export using ES module syntax
export default AppearanceComponent;