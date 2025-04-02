/**
 * Context menu system for the ECS architecture.
 * Manages showing and hiding the right-click context menu.
 */

const ContextMenuSystem = {
  // Required components for entities this system processes
  requiredComponents: ['menuRegistry'],
  
  // Initialize the system
  init(world) {
    this.world = world;
    this.menuElement = null;
    
    // Initialized flag to be checked in renderer
    this.initialized = false;
    
    // Listen for menu registration events
    world.on('menuItemRegistered', ({ pluginId, item }) => {
      this.registerMenuItem(pluginId, item);
    });
    
    console.log('Context menu system initialized');
  },
  
  // Create the menu UI elements (called in renderer only)
  createMenuElement() {
    if (this.menuElement) return;
    
    // Create and append the context menu element
    this.menuElement = document.createElement('div');
    this.menuElement.id = 'ecs-context-menu';
    this.menuElement.className = 'context-menu';
    this.menuElement.style.display = 'none';
    document.body.appendChild(this.menuElement);
    
    // Define bound event handlers that we can remove later
    this.documentClickHandler = () => this.hideMenu();
    this.contextMenuHandler = (event) => {
      // Check if right-click target is a menu-enabled entity
      // We need to be more precise in our selector to ensure we catch the pet element
      const target = event.target.closest('#pet');
      if (target) {
        console.log('Context menu triggered on pet element');
        event.preventDefault();
        this.showMenu(event.clientX, event.clientY);
      }
    };
    
    // Add document click listener to close menu
    document.addEventListener('click', this.documentClickHandler);
    
    // Set up context menu event listeners
    document.addEventListener('contextmenu', this.contextMenuHandler);
    
    console.log('Context menu event listeners added');
    
    this.initialized = true;
  },
  
  // Cleanup event handlers and DOM elements
  cleanup() {
    // Remove event listeners
    if (this.documentClickHandler) {
      document.removeEventListener('click', this.documentClickHandler);
    }
    
    if (this.contextMenuHandler) {
      document.removeEventListener('contextmenu', this.contextMenuHandler);
    }
    
    // Remove menu element from DOM
    if (this.menuElement) {
      this.menuElement.remove();
      this.menuElement = null;
    }
    
    // Reset state
    this.initialized = false;
  },
  
  // Show the context menu at the specified position
  showMenu(x, y) {
    if (!this.menuElement) return;
    
    // Get the menu registry entity
    const registry = this.world.getEntity('menuRegistry');
    if (!registry || !registry.hasComponent('menuRegistry')) return;
    
    // Get visible menu items
    const menuRegistry = registry.getComponent('menuRegistry');
    const visibleItems = menuRegistry.items.filter(item => {
      return !item.condition || item.condition();
    });
    
    if (visibleItems.length === 0) return;
    
    // Clear previous menu
    this.menuElement.innerHTML = '';
    
    // Add items to the menu
    visibleItems.forEach(item => {
      const menuItem = document.createElement('div');
      menuItem.className = 'context-menu-item';
      
      // Add icon if provided
      if (item.icon) {
        const iconSpan = document.createElement('span');
        iconSpan.className = 'menu-item-icon';
        iconSpan.textContent = item.icon;
        menuItem.appendChild(iconSpan);
      }
      
      // Add label
      const labelSpan = document.createElement('span');
      labelSpan.className = 'menu-item-label';
      labelSpan.textContent = item.label;
      menuItem.appendChild(labelSpan);
      
      // Add event listener
      menuItem.addEventListener('click', () => {
        if (typeof item.action === 'function') {
          item.action();
        }
        this.hideMenu();
      });
      
      this.menuElement.appendChild(menuItem);
    });
    
    // Position the menu, making sure it fits within viewport
    const menuWidth = this.menuElement.offsetWidth || 150; // Default if not yet rendered
    const menuHeight = this.menuElement.offsetHeight || 150; // Default if not yet rendered
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Adjust position if menu would go off-screen
    const adjustedX = Math.min(x, viewportWidth - menuWidth - 5);
    const adjustedY = Math.min(y, viewportHeight - menuHeight - 5);
    
    // Set position and display
    this.menuElement.style.left = `${adjustedX}px`;
    this.menuElement.style.top = `${adjustedY}px`;
    this.menuElement.style.display = 'block';
    
    console.log('Context menu shown at position:', adjustedX, adjustedY);
  },
  
  // Hide the context menu
  hideMenu() {
    if (this.menuElement) {
      this.menuElement.style.display = 'none';
    }
  },
  
  // Register a new menu item
  registerMenuItem(pluginId, item) {
    const registry = this.world.getEntity('menuRegistry');
    if (!registry) {
      // Create registry entity if it doesn't exist
      const newEntity = this.world.createEntity('menuRegistry');
      this.world.addComponent('menuRegistry', 'menuRegistry', { 
        items: [],
        contextMenuTargets: new Set(['pet'])
      });
    }
    
    // Get registry component and add item
    const menuRegistry = this.world.getEntity('menuRegistry').getComponent('menuRegistry');
    
    // Add plugin ID to the item
    const fullItem = {
      ...item,
      pluginId
    };
    
    menuRegistry.items.push(fullItem);
    
    // Sort items by order
    menuRegistry.items.sort((a, b) => a.order - b.order);
    
    // Emit event for this specific menu item registration
    this.world.emitEvent('menuItemAdded', { pluginId, item: fullItem });
  },
  
  // Update the system - this system is event-driven, no per-frame updates needed
  update(deltaTime, world) {
    // No per-frame updates needed
  }
};

// Export using ES module syntax
export default ContextMenuSystem;