/**
 * ECS-based plugin system for the Navi desktop pet app.
 * This is a bridge to migrate from the old plugin system to the new ECS architecture.
 */

import World from '../world.js';

// Keep track of loaded plugins
const loadedPlugins = new Map();

/**
 * Creates a plugin API facade that wraps ECS functionality
 * @param {string} pluginId - Plugin identifier
 * @param {World} world - ECS world instance
 * @returns {Object} - Plugin API object
 */
function createPluginApi(pluginId, world) {
  return {
    // Get the world instance
    getWorld: () => world,
    
    // Register event handlers
    on: (eventName, handler) => {
      return world.on(`plugin:${pluginId}:${eventName}`, handler);
    },
    
    // Emit events
    emit: (eventName, data) => {
      world.emitEvent(`plugin:${pluginId}:${eventName}`, {
        pluginId,
        eventName,
        data
      });
    },
    
    // Register a component type for this plugin
    registerComponent: (componentName, componentSchema) => {
      // Register the component with namespaced name
      const namespacedName = `${pluginId}.${componentName}`;
      world.registerComponentType(namespacedName, componentSchema);
      return namespacedName;
    },
    
    // Register a system for this plugin
    registerSystem: (systemName, system) => {
      // Register the system with namespaced name
      const namespacedName = `${pluginId}.${systemName}`;
      world.registerSystem(namespacedName, system);
      return namespacedName;
    },
    
    // Register a menu item for the context menu
    registerMenuItem: (label, action, options = {}) => {
      // Create the menu item object
      const menuItem = {
        label,
        action,
        icon: options.icon,
        order: options.order || 100,
        condition: options.condition
      };
      
      // Emit an event to register this menu item
      world.emitEvent('menuItemRegistered', {
        pluginId,
        item: menuItem
      });
      
      return true;
    },
    
    // DOM utility to get a container for the plugin
    getPluginContainer: () => {
      // Get or create a container for this plugin
      let container = document.getElementById(`plugin-${pluginId}`);
      
      if (!container) {
        container = document.createElement('div');
        container.id = `plugin-${pluginId}`;
        container.className = 'plugin-container';
        
        // Append to the plugins area
        const pluginsArea = document.getElementById('plugins-area');
        if (pluginsArea) {
          pluginsArea.appendChild(container);
        } else {
          document.body.appendChild(container);
        }
      }
      
      return container;
    },
    
    // Add a component to the main pet entity
    addComponentToPet: (componentName, componentData) => {
      return world.addComponent('mainPet', `${pluginId}.${componentName}`, componentData);
    },
    
    // Get a component from the main pet entity
    getPetComponent: (componentName) => {
      return world.getEntity('mainPet')?.getComponent(`${pluginId}.${componentName}`);
    },
    
    // React to pet state changes - component specific version
    onPetComponentChange: (componentName, callback) => {
      const namespacedName = `${pluginId}.${componentName}`;
      return world.on('componentUpdated', (data) => {
        if (data.entityId === 'mainPet' && data.componentName === namespacedName) {
          callback(data.newData, data.oldData);
        }
      });
    },
    
    // Legacy compatibility - IPC to main process
    callMain: async (channel, ...args) => {
      try {
        const namespacedChannel = `plugin:${pluginId}:${channel}`;
        return await window.api.invoke(namespacedChannel, ...args);
      } catch (error) {
        console.error(`Error calling ${channel} from plugin ${pluginId}:`, error);
        throw error;
      }
    }
  };
}

/**
 * Loads a plugin into the ECS architecture
 * @param {string} pluginId - Plugin identifier
 * @param {World} world - ECS world instance
 * @returns {Promise<boolean>} - Whether the plugin was loaded successfully
 */
async function loadPlugin(pluginId, world) {
  if (loadedPlugins.has(pluginId)) {
    return true; // Already loaded
  }
  
  try {
    // Load the plugin script dynamically
    const pluginModule = await import(`../../plugins/${pluginId}/renderer.js`);
    
    // Create plugin API
    const api = createPluginApi(pluginId, world);
    
    // Initialize the plugin using the modern ESM format only
    if (pluginModule.initialize) {
      pluginModule.initialize(api);
    } else {
      console.warn(`Plugin ${pluginId} has no initialize function`);
      return false;
    }
    
    // Store the loaded plugin
    loadedPlugins.set(pluginId, {
      id: pluginId,
      api,
      module: pluginModule
    });
    
    console.log(`Plugin ${pluginId} loaded successfully with ECS integration`);
    return true;
  } catch (error) {
    console.error(`Error loading plugin ${pluginId} with ECS:`, error);
    return false;
  }
}

/**
 * Loads all active plugins
 * @param {string[]} pluginIds - Array of plugin IDs to load
 * @param {World} world - ECS world instance
 * @returns {Promise<string[]>} - Array of successfully loaded plugin IDs
 */
async function loadPlugins(pluginIds, world) {
  const loadedIds = [];
  
  for (const pluginId of pluginIds) {
    const success = await loadPlugin(pluginId, world);
    if (success) {
      loadedIds.push(pluginId);
    }
  }
  
  return loadedIds;
}

/**
 * Unloads a plugin
 * @param {string} pluginId - Plugin ID to unload
 * @returns {boolean} - Whether the plugin was unloaded successfully
 */
function unloadPlugin(pluginId) {
  if (!loadedPlugins.has(pluginId)) {
    return false;
  }
  
  try {
    const plugin = loadedPlugins.get(pluginId);
    
    // Call cleanup function
    if (plugin.module.cleanup) {
      plugin.module.cleanup();
    }
    
    // Remove the plugin container
    const container = document.getElementById(`plugin-${pluginId}`);
    if (container) {
      container.remove();
    }
    
    // Remove the plugin from the map
    loadedPlugins.delete(pluginId);
    
    return true;
  } catch (error) {
    console.error(`Error unloading plugin ${pluginId}:`, error);
    return false;
  }
}

export default {
  createPluginApi,
  loadPlugin,
  loadPlugins,
  unloadPlugin,
  getLoadedPlugins: () => Array.from(loadedPlugins.keys())
};