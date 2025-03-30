// DOM Elements
const petElement = document.getElementById('pet');
const petImage = document.getElementById('pet-image');
const hungerBar = document.getElementById('hunger-bar');
const happinessBar = document.getElementById('happiness-bar');
const energyBar = document.getElementById('energy-bar');
const feedBtn = document.getElementById('feed-btn');
const playBtn = document.getElementById('play-btn');
const sleepBtn = document.getElementById('sleep-btn');
const petControls = document.getElementById('pet-controls');
const petContainer = document.getElementById('pet-container');
const petName = document.getElementById('pet-name');

// Pet state
let petState = {};
let isDragging = false;
let offsetX, offsetY;
let controlsVisible = false;
let animationTimeout = null;
let allDisplaysInfo = null;

// Update UI with pet state
function updatePetUI() {
  hungerBar.style.width = `${100 - petState.hunger}%`;
  happinessBar.style.width = `${petState.happiness}%`;
  energyBar.style.width = `${petState.energy}%`;
  
  // Set pet name
  petName.textContent = petState.name || 'Buddy';
  
  // Update mood based on stats
  if (petState.hunger > 70 || petState.happiness < 30 || petState.energy < 30) {
    petImage.innerHTML = '😿';
  } else if (petState.hunger > 50 || petState.happiness < 50 || petState.energy < 50) {
    petImage.innerHTML = '🐱';
  } else {
    petImage.innerHTML = '😸';
  }
}

// Initialize pet state and display info
async function initialize() {
  // Get display information
  allDisplaysInfo = await window.api.getDisplaysInfo();
  console.log('Displays:', allDisplaysInfo);
  
  petState = await window.api.getPetState();
  updatePetUI();
  
  // Update pet state every 30 seconds
  setInterval(async () => {
    petState = await window.api.getPetState();
    updatePetUI();
  }, 30000);
  
  // Set up random movements across all screens
  setInterval(() => {
    if (!isDragging && Math.random() < 0.3) {
      animateRandomMovement();
    }
  }, 10000);

  // Position the controls below the pet
  positionControls();
}

// Position controls to avoid overlapping with the pet
function positionControls() {
  const petRect = petElement.getBoundingClientRect();
  petControls.style.position = 'fixed';
  petControls.style.bottom = 'auto';
  petControls.style.top = `${petRect.bottom + 10}px`;
  petControls.style.left = `${petRect.left + (petRect.width / 2) - (petControls.offsetWidth / 2)}px`;
}

// Prevent default context menu and show pet controls instead
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  
  // If clicking on the pet or near it, show controls
  const petRect = petElement.getBoundingClientRect();
  const inPetArea = 
    e.clientX >= petRect.left - 50 && 
    e.clientX <= petRect.right + 50 && 
    e.clientY >= petRect.top - 50 && 
    e.clientY <= petRect.bottom + 50;
    
  if (inPetArea) {
    // Position controls near where we right-clicked
    petControls.style.position = 'fixed';
    petControls.style.bottom = 'auto';
    petControls.style.top = `${e.clientY + 10}px`;
    petControls.style.left = `${e.clientX - (petControls.offsetWidth / 2)}px`;
    
    toggleControls(true);
  }
  
  return false;
});

// Toggle visibility of pet controls
function toggleControls(visible) {
  controlsVisible = visible;
  if (visible) {
    petControls.style.opacity = '1';
    petControls.style.pointerEvents = 'auto';
    petControls.style.zIndex = '1000';
  } else {
    petControls.style.opacity = '0';
    petControls.style.pointerEvents = 'none';
  }
}

// Helper to check if an element is a button or inside the controls
function isControlElement(element) {
  return petControls.contains(element) || 
         element === feedBtn || 
         element === playBtn || 
         element === sleepBtn;
}

// Hide controls when clicking elsewhere (but not when clicking the controls themselves)
document.addEventListener('click', (e) => {
  // Don't hide if clicking on the controls
  if (controlsVisible && !petControls.contains(e.target)) {
    toggleControls(false);
  }
});

// Dragging functionality
petElement.addEventListener('mousedown', (e) => {
  // Don't initiate drag if clicking on a control or button
  if (isControlElement(e.target)) {
    return;
  }
  
  if (e.button === 0) { // Left mouse button only
    isDragging = true;
    
    // Clear any ongoing transitions to prevent "shadow" effect
    clearTimeout(animationTimeout);
    petElement.style.transition = 'none';
    
    // Get the offset of the mouse cursor within the pet element
    const rect = petElement.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    
    // Change cursor style
    petElement.style.cursor = 'grabbing';
  }
});

document.addEventListener('mousemove', (e) => {
  if (isDragging) {
    // Calculate new position
    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;
    
    // Move the pet element without transitions to prevent shadow
    petElement.style.transition = 'none';
    petElement.style.position = 'absolute';
    petElement.style.left = `${x}px`;
    petElement.style.top = `${y}px`;
    
    // Update position in main process - this moves the window
    window.api.updatePetPosition({ x, y });
  }
});

document.addEventListener('mouseup', (e) => {
  if (isDragging) {
    isDragging = false;
    petElement.style.cursor = 'grab';
    
    // Reposition controls if they're visible
    if (controlsVisible) {
      positionControls();
    }
  }
});

// Ensure drag ends when mouse leaves window
document.addEventListener('mouseleave', () => {
  if (isDragging) {
    isDragging = false;
    petElement.style.cursor = 'grab';
  }
});

// Random movement animation that allows pet to wander across all screens
function animateRandomMovement() {
  if (isDragging) return;
  
  // Clear any previous animation timeouts
  if (animationTimeout) {
    clearTimeout(animationTimeout);
  }
  
  // Get a random position across all displays
  const { x, y } = getRandomPositionAcrossDisplays();
  
  // Move the window directly to the new position
  window.api.moveWindow({ x, y });
  
  // Apply the transition for smooth movement within the window
  petElement.style.position = 'absolute';
  petElement.style.transition = 'left 2s, top 2s';
  petElement.style.left = '0px';
  petElement.style.top = '0px';
  
  // Force a reflow to make sure the transition is applied
  void petElement.offsetWidth;
  
  // Update position in main process
  window.api.updatePetPosition({ x, y });
  
  // Reposition controls if they're visible
  if (controlsVisible) {
    setTimeout(positionControls, 2000);
  }
  
  // Remove transition after animation completes to prevent shadow effect
  animationTimeout = setTimeout(() => {
    petElement.style.transition = 'none';
  }, 2000);
}

// Get a random position across all available displays
function getRandomPositionAcrossDisplays() {
  if (!allDisplaysInfo) return { x: 0, y: 0 }; // Safety check
  
  // Choose a random display
  const displays = allDisplaysInfo.displays;
  const randomDisplay = displays[Math.floor(Math.random() * displays.length)];
  
  // Calculate random position within that display's bounds
  const maxX = randomDisplay.bounds.x + randomDisplay.bounds.width - 250; // Adjust for window width
  const maxY = randomDisplay.bounds.y + randomDisplay.bounds.height - 300; // Adjust for window height
  
  // Generate random positions within the display bounds
  const x = randomDisplay.bounds.x + Math.floor(Math.random() * (randomDisplay.bounds.width - 250));
  const y = randomDisplay.bounds.y + Math.floor(Math.random() * (randomDisplay.bounds.height - 300));
  
  return { x, y };
}

// Feeding interaction
feedBtn.addEventListener('click', async (e) => {
  // Stop event propagation to prevent dragging
  e.stopPropagation();
  
  petImage.parentElement.classList.add('feeding');
  petState = await window.api.feedPet();
  updatePetUI();
  
  setTimeout(() => {
    petImage.parentElement.classList.remove('feeding');
  }, 1000);
});

// Playing interaction
playBtn.addEventListener('click', async (e) => {
  // Stop event propagation to prevent dragging
  e.stopPropagation();
  
  petState = await window.api.playWithPet();
  updatePetUI();
});

// Sleeping interaction
sleepBtn.addEventListener('click', async (e) => {
  // Stop event propagation to prevent dragging
  e.stopPropagation();
  
  petState = await window.api.petSleep();
  updatePetUI();
});

// Make sure the controls don't trigger dragging
petControls.addEventListener('mousedown', (e) => {
  // Stop propagation to prevent dragging when clicking on controls
  e.stopPropagation();
});

// Initialize
initialize(); 