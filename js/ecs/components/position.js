/**
 * Position component for the ECS system.
 * Represents the position of an entity in screen coordinates.
 */

const PositionComponent = {
  // Factory method to create a new position component
  create: (x = 0, y = 0) => ({
    x,
    y
  }),
  
  // Utility method to update a position
  update: (component, x, y) => {
    component.x = x;
    component.y = y;
    return component;
  },
  
  // Name for this component type
  typeName: 'position'
};

// Export using ES module syntax
export default PositionComponent;