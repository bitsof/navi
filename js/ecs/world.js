/**
 * World class for the ECS system.
 * Manages all entities and systems.
 */

// Use ES module import
import Entity from './entity.js';

class World {
  constructor() {
    this.entities = new Map();
    this.systems = new Map();
    this.componentIndex = new Map(); // Maps component name to set of entity IDs
    this.eventListeners = new Map();
    this.nextEntityId = 1;
    this.componentTypes = new Map(); // Store component type schemas
  }
  
  /**
   * Register a component type schema
   * @param {string} typeName - Name of the component type
   * @param {Object} schema - Default schema for the component
   */
  registerComponentType(typeName, schema) {
    if (this.componentTypes.has(typeName)) {
      console.warn(`Component type ${typeName} is already registered`);
      return;
    }
    
    this.componentTypes.set(typeName, schema);
    console.log(`Registered component type: ${typeName}`);
  }

  /**
   * Create a new entity
   * @param {string} [id] - Optional entity ID
   * @returns {Entity} - The created entity
   */
  createEntity(id) {
    const entity = new Entity(id || `e${this.nextEntityId++}`);
    this.entities.set(entity.id, entity);
    return entity;
  }

  /**
   * Add an existing entity to the world
   * @param {Entity} entity - The entity to add
   * @returns {Entity} - The added entity
   */
  addEntity(entity) {
    this.entities.set(entity.id, entity);
    
    // Update component indices
    entity.components.forEach((_, componentName) => {
      this.indexEntityComponent(entity.id, componentName);
    });
    
    // Notify systems of new entity
    this.emitEvent('entityAdded', entity);
    return entity;
  }

  /**
   * Get an entity by ID
   * @param {string} entityId - ID of the entity to get
   * @returns {Entity|undefined} - The entity or undefined if not found
   */
  getEntity(entityId) {
    return this.entities.get(entityId);
  }

  /**
   * Remove an entity from the world
   * @param {string} entityId - ID of the entity to remove
   * @returns {boolean} - Whether the entity was removed
   */
  removeEntity(entityId) {
    const entity = this.entities.get(entityId);
    if (!entity) return false;

    // Remove from component indices
    entity.components.forEach((_, componentName) => {
      this.removeEntityFromIndex(entityId, componentName);
    });

    // Notify systems of entity removal
    this.emitEvent('entityRemoved', entity);

    // Remove from entities map
    return this.entities.delete(entityId);
  }

  /**
   * Add a component to an entity and update indices
   * @param {string} entityId - ID of the entity
   * @param {string} componentName - Name of the component
   * @param {Object} componentData - Component data
   * @returns {Entity|null} - The updated entity or null if not found
   */
  addComponent(entityId, componentName, componentData) {
    const entity = this.entities.get(entityId);
    if (!entity) return null;

    entity.addComponent(componentName, componentData);
    this.indexEntityComponent(entityId, componentName);

    // Notify systems of component addition
    this.emitEvent('componentAdded', { entity, componentName, componentData });
    return entity;
  }

  /**
   * Remove a component from an entity and update indices
   * @param {string} entityId - ID of the entity
   * @param {string} componentName - Name of the component to remove
   * @returns {boolean} - Whether the component was removed
   */
  removeComponent(entityId, componentName) {
    const entity = this.entities.get(entityId);
    if (!entity) return false;

    const hadComponent = entity.removeComponent(componentName);
    if (hadComponent) {
      this.removeEntityFromIndex(entityId, componentName);
      
      // Notify systems of component removal
      this.emitEvent('componentRemoved', { entity, componentName });
    }
    return hadComponent;
  }

  /**
   * Update a component on an entity
   * @param {string} entityId - ID of the entity
   * @param {string} componentName - Name of the component
   * @param {Object} componentData - New component data
   * @returns {Entity|null} - The updated entity or null if not found
   */
  updateComponent(entityId, componentName, componentData) {
    const entity = this.entities.get(entityId);
    if (!entity || !entity.hasComponent(componentName)) return null;

    const oldData = entity.getComponent(componentName);
    entity.addComponent(componentName, componentData);

    // Notify systems of component update
    this.emitEvent('componentUpdated', { 
      entity, 
      componentName, 
      oldData, 
      newData: componentData 
    });
    return entity;
  }

  /**
   * Get all entities that have a specific set of components
   * @param {string[]} componentNames - Names of components to match
   * @returns {Entity[]} - Array of matching entities
   */
  getEntitiesWith(...componentNames) {
    if (componentNames.length === 0) return [];

    // Get entities for first component (usually the most restrictive)
    const firstComponent = componentNames[0];
    const candidateIds = this.componentIndex.get(firstComponent) || new Set();
    
    // Filter entities that have all components
    const results = [];
    for (const entityId of candidateIds) {
      const entity = this.entities.get(entityId);
      if (entity && componentNames.every(name => entity.hasComponent(name))) {
        results.push(entity);
      }
    }
    return results;
  }

  /**
   * Register a system with the world
   * @param {string} systemName - Name of the system
   * @param {Object} system - System object
   */
  registerSystem(systemName, system) {
    this.systems.set(systemName, system);
    if (system.init && typeof system.init === 'function') {
      system.init(this);
    }
  }

  /**
   * Unregister a system from the world
   * @param {string} systemName - Name of the system
   * @returns {boolean} - Whether the system was removed
   */
  unregisterSystem(systemName) {
    const system = this.systems.get(systemName);
    if (!system) return false;

    if (system.cleanup && typeof system.cleanup === 'function') {
      system.cleanup();
    }
    return this.systems.delete(systemName);
  }

  /**
   * Run a specific system
   * @param {string} systemName - Name of the system to run
   * @param {number} deltaTime - Time elapsed since last update
   */
  runSystem(systemName, deltaTime = 0) {
    const system = this.systems.get(systemName);
    if (system && system.update && typeof system.update === 'function') {
      system.update(deltaTime, this);
    }
  }

  /**
   * Run all registered systems
   * @param {number} deltaTime - Time elapsed since last update
   */
  update(deltaTime = 0) {
    for (const [name, system] of this.systems.entries()) {
      if (system.enabled !== false && system.update && typeof system.update === 'function') {
        system.update(deltaTime, this);
      }
    }
  }

  /**
   * Helper to index an entity by component for faster queries
   * @private
   * @param {string} entityId - ID of the entity
   * @param {string} componentName - Name of the component
   */
  indexEntityComponent(entityId, componentName) {
    if (!this.componentIndex.has(componentName)) {
      this.componentIndex.set(componentName, new Set());
    }
    this.componentIndex.get(componentName).add(entityId);
  }

  /**
   * Helper to remove an entity from component indices
   * @private
   * @param {string} entityId - ID of the entity
   * @param {string} componentName - Name of the component
   */
  removeEntityFromIndex(entityId, componentName) {
    const index = this.componentIndex.get(componentName);
    if (index) {
      index.delete(entityId);
    }
  }

  /**
   * Register an event listener
   * @param {string} eventName - Name of event to listen for
   * @param {Function} callback - Callback function
   * @returns {Function} - Function to remove the listener
   */
  on(eventName, callback) {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }
    this.eventListeners.get(eventName).add(callback);
    
    return () => {
      const listeners = this.eventListeners.get(eventName);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  /**
   * Emit an event to all registered listeners
   * @param {string} eventName - Name of the event
   * @param {*} data - Event data
   */
  emitEvent(eventName, data) {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in listener for ${eventName}:`, error);
        }
      }
    }
  }

  /**
   * Serialize the world state to JSON-compatible object
   * @returns {Object} - Serialized world state
   */
  serialize() {
    const serializedEntities = {};
    this.entities.forEach((entity, id) => {
      serializedEntities[id] = entity.serialize();
    });
    return {
      entities: serializedEntities,
      nextEntityId: this.nextEntityId
    };
  }

  /**
   * Restore world state from serialized data
   * @param {Object} data - Serialized world data
   */
  deserialize(data) {
    // Clear existing state
    this.entities.clear();
    this.componentIndex.clear();
    
    // Restore entities
    if (data.entities) {
      Object.values(data.entities).forEach(entityData => {
        const entity = Entity.deserialize(entityData);
        this.addEntity(entity);
      });
    }
    
    // Restore next entity ID
    if (data.nextEntityId) {
      this.nextEntityId = data.nextEntityId;
    }
    
    // Notify systems of world restored
    this.emitEvent('worldRestored', this);
  }
}

// Export using ES module syntax only
export default World;