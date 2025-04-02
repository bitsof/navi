/**
 * Menu registry component for the ECS system.
 * Stores menu items to be shown in the context menu.
 */

const MenuRegistryComponent = {
  // Factory method to create a new menu registry component
  create: () => ({
    items: [], // Will hold all registered menu items from plugins
    contextMenuTargets: new Set() // Entities that can have context menus
  }),
  
  // Utility method to add a menu item
  addMenuItem: (component, item) => {
    component.items.push(item);
    
    // Sort menu items by order
    component.items.sort((a, b) => a.order - b.order);
    
    return component;
  },
  
  // Utility method to get filtered menu items based on current state
  getVisibleItems: (component) => {
    return component.items.filter(item => {
      // Check if item has a condition function and apply it
      return !item.condition || item.condition();
    });
  },
  
  // Name for this component type
  typeName: 'menuRegistry'
};

// Export using ES module syntax
export default MenuRegistryComponent;