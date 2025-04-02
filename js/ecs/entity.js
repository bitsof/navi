/**
 * Entity class for the ECS system.
 * An entity is just an ID with associated components.
 */
class Entity {
  constructor(id) {
    this.id = id || crypto.randomUUID();
    this.components = new Map();
  }

  /**
   * Add a component to this entity
   * @param {string} componentName - Name of the component
   * @param {Object} componentData - Component data
   * @returns {Entity} - This entity for chaining
   */
  addComponent(componentName, componentData) {
    this.components.set(componentName, componentData);
    return this;
  }

  /**
   * Remove a component from this entity
   * @param {string} componentName - Name of the component to remove
   * @returns {boolean} - Whether the component was removed
   */
  removeComponent(componentName) {
    return this.components.delete(componentName);
  }

  /**
   * Check if this entity has a component
   * @param {string} componentName - Name of the component to check
   * @returns {boolean} - Whether the entity has the component
   */
  hasComponent(componentName) {
    return this.components.has(componentName);
  }

  /**
   * Get a component from this entity
   * @param {string} componentName - Name of the component to get
   * @returns {Object|null} - The component data or null if not found
   */
  getComponent(componentName) {
    return this.components.get(componentName) || null;
  }

  /**
   * Get all components for this entity
   * @returns {Object} - All components mapped by name
   */
  getAllComponents() {
    const result = {};
    this.components.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Create a serializable representation of this entity
   * @returns {Object} - Serializable entity
   */
  serialize() {
    return {
      id: this.id,
      components: this.getAllComponents()
    };
  }

  /**
   * Create an entity from a serialized object
   * @param {Object} data - Serialized entity data
   * @returns {Entity} - The deserialized entity
   */
  static deserialize(data) {
    const entity = new Entity(data.id);
    if (data.components) {
      Object.entries(data.components).forEach(([name, component]) => {
        entity.addComponent(name, component);
      });
    }
    return entity;
  }
}

// Export using ES module syntax
export default Entity;