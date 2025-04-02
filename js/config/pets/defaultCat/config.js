// js/config/pets/defaultCat/config.js - Default cat pet configuration

export default {
  name: 'Buddy',
  initialStats: {
    hunger: 50,
    happiness: 50,
    energy: 50
  },
  statModifiers: {
    feed: { hunger: -20, energy: 10 },
    play: { happiness: 20, hunger: 10, energy: -15 },
    sleep: { energy: 100 },
    walking: { energy: -1 } // Small energy cost for walking
  },
  degradationRates: {
    hunger: 5,    // Units per hour
    happiness: 5, // Units per hour
    energy: 3     // Units per hour
  },
  moodThresholds: {
    happy: { hunger: { max: 50 }, happiness: { min: 50 }, energy: { min: 50 } },
    neutral: { hunger: { max: 70 }, happiness: { min: 30 }, energy: { min: 30 } },
    sad: {} // Default when other conditions aren't met
  },
  graphicsMap: {
    idle: {
      happy: '😸',
      neutral: '🐱',
      sad: '😿'
    },
    walking: {
      happy: '🐈',
      neutral: '🐈',
      sad: '🐈'
    },
    interacting: {
      happy: '😻',
      neutral: '😻',
      sad: '😻'
    },
    sleeping: {
      happy: '😴',
      neutral: '😴',
      sad: '😴'
    },
    dragging: {
      happy: '😼',
      neutral: '😼',
      sad: '😼'
    }
  },
  defaultSettings: {
    activePlugins: ['coreDisplay', 'walking', 'dragging', 'interactions']
  }
}; 