// js/main/configLoader.js - Handles loading application and pet configurations
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

// Recreate __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default app configuration
const DEFAULT_APP_CONFIG = {
  currentPetType: 'defaultCat',
  activePlugins: ['coreDisplay', 'walking', 'dragging', 'interactions']
};

// Default pet configuration (if nothing else is loaded)
const DEFAULT_PET_CONFIG = {
  name: 'Buddy',
  initialStats: {
    hunger: 50,
    happiness: 50,
    energy: 50
  },
  statModifiers: {
    feed: { hunger: -20, energy: 10 },
    play: { happiness: 20, hunger: 10, energy: -15 },
    sleep: { energy: 100 }
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
  }
};

// Internal state
let appConfig = null;
let currentPetConfig = null;

/**
 * Loads the application configuration
 * @returns {Object} The app configuration object
 */
export function loadAppConfig() {
  const configPath = path.join(__dirname, '..', 'config', 'app.json');
  
  try {
    if (fs.existsSync(configPath)) {
      const rawData = fs.readFileSync(configPath, 'utf8');
      appConfig = { ...DEFAULT_APP_CONFIG, ...JSON.parse(rawData) };
    } else {
      console.log('App config not found, using defaults');
      appConfig = DEFAULT_APP_CONFIG;
      
      // Create the config directory and file if it doesn't exist
      const configDir = path.join(__dirname, '..', 'config');
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      fs.writeFileSync(configPath, JSON.stringify(DEFAULT_APP_CONFIG, null, 2), 'utf8');
    }
    return appConfig;
  } catch (error) {
    console.error('Error loading app config:', error);
    appConfig = DEFAULT_APP_CONFIG;
    return appConfig;
  }
}

/**
 * Loads a pet configuration based on its type
 * @param {string} petType - The type of pet to load
 * @returns {Object} The pet configuration object
 */
export async function loadPetConfig(petType) {
  if (!petType) {
    if (!appConfig) {
      loadAppConfig();
    }
    petType = appConfig.currentPetType;
  }
  
  const configPath = path.join(__dirname, '..', 'config', 'pets', petType, 'config.js');
  
  try {
    if (fs.existsSync(configPath)) {
      // For JS configuration files that might have functions
      const configModule = await import(pathToFileURL(configPath).href + '?t=' + Date.now());
      currentPetConfig = configModule.default;
    } else {
      console.log(`Pet config for ${petType} not found, using defaults`);
      currentPetConfig = DEFAULT_PET_CONFIG;
      
      // Create default pet config directory and file
      const configDir = path.join(__dirname, '..', 'config', 'pets', petType);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      fs.writeFileSync(
        path.join(configDir, 'config.js'), 
        `export default ${JSON.stringify(DEFAULT_PET_CONFIG, null, 2)};`, 
        'utf8'
      );
    }
    return currentPetConfig;
  } catch (error) {
    console.error(`Error loading pet config for ${petType}:`, error);
    currentPetConfig = DEFAULT_PET_CONFIG;
    return currentPetConfig;
  }
}

/**
 * Gets the currently loaded pet configuration
 * @returns {Object} The pet configuration
 */
export async function getCurrentPetConfig() {
  if (!currentPetConfig) {
    return await loadPetConfig();
  }
  return currentPetConfig;
}

/**
 * Gets the currently loaded app configuration
 * @returns {Object} The app configuration
 */
export function getAppConfig() {
  if (!appConfig) {
    return loadAppConfig();
  }
  return appConfig;
}

/**
 * Saves the current app configuration to disk
 * @returns {boolean} Success status
 */
export function saveAppConfig() {
  if (!appConfig) return false;
  
  const configPath = path.join(__dirname, '..', 'config', 'app.json');
  
  try {
    fs.writeFileSync(configPath, JSON.stringify(appConfig, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving app config:', error);
    return false;
  }
} 