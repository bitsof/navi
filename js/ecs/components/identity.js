/**
 * Identity component for the ECS system.
 * Represents the basic identity of a pet like name and type.
 */

const IdentityComponent = {
  // Factory method to create a new identity component
  create: (name = 'Buddy', type = 'defaultCat') => ({
    name,
    type,
    created: Date.now()
  }),
  
  // Update the name of the pet
  setName: (component, newName) => {
    component.name = newName;
    return component;
  },
  
  // Name for this component type
  typeName: 'identity'
};

// Export using ES module syntax
export default IdentityComponent;