// DOM Elements
const petElement = document.getElementById('pet');
const petImage = document.getElementById('pet-image');
const petName = document.getElementById('pet-name');
const petStats = document.getElementById('pet-stats');
const petControls = document.getElementById('pet-controls');
const hungerBar = document.getElementById('hunger-bar');
const happinessBar = document.getElementById('happiness-bar');
const energyBar = document.getElementById('energy-bar');
const feedBtn = document.getElementById('feed-btn');
const playBtn = document.getElementById('play-btn');
const sleepBtn = document.getElementById('sleep-btn');

// Import Features
import { walkingPlugin } from './features/walking.js';

// Global State (received from main process)
let currentPetState = null; // Holds the latest state received
let isHoldingPet = false; // Tracks if the mouse is currently down on the pet
let allDisplaysInfo = null;
let uiVisible = false;

// Update UI based on the currentPetState
function updatePetUI() {
  if (!currentPetState) return;
  hungerBar.style.width = `${100 - currentPetState.hunger}%`;
  happinessBar.style.width = `${currentPetState.happiness}%`;
  energyBar.style.width = `${currentPetState.energy}%`;
  petName.textContent = currentPetState.name || 'Buddy';
  petImage.innerHTML = currentPetState.mood; // Use mood from state

  // Visual feedback for holding (based on status, not just mouse down)
  if (currentPetState.status === 'interacting') { 
    // Add holding class ONLY if the mouse is ALSO down (isHoldingPet)
    // This prevents the class being added during button interactions
    if (isHoldingPet) {
      petElement.classList.add('holding');
    } else {
      // Ensure holding class is removed if mouse is up but status is still interacting (e.g., during feeding anim)
      petElement.classList.remove('holding'); 
    }
  } else {
    petElement.classList.remove('holding');
  }
}

// Function to update pet position (only relevant for main process now)
async function updatePetPosition(position) {
    if (typeof position?.x !== 'number' || typeof position?.y !== 'number' || isNaN(position.x) || isNaN(position.y)) {
      console.error("Attempted to update position with invalid data:", position);
      return; 
    }
    // Update local state's position immediately for responsiveness if needed by walking plugin
    // if (currentPetState) {
    //     currentPetState.x = position.x;
    //     currentPetState.y = position.y;
    // }
    await window.api.updatePetPosition(position);
}

// Function to set pet status in main process
async function setPetStatus(status) {
    console.log("Renderer requesting status change:", status);
    await window.api.setPetStatus(status);
    // Rely on update from main via onPetStateUpdate to update local state and UI
}

// Initialize
async function initialize() {
  hideUI(); 
  allDisplaysInfo = await window.api.getDisplaysInfo();
  currentPetState = await window.api.getPetState(); 
  
  if (!currentPetState || typeof currentPetState.x !== 'number' || typeof currentPetState.y !== 'number') {
      console.error("Failed to get valid initial state. Using fallback.");
      currentPetState = { x: 100, y: 100, name: 'Buddy', hunger: 50, happiness: 50, energy: 50, mood: '🐱', status: 'idle' };
      // If falling back, maybe try to set this position in main?
      // await window.api.updatePetPosition({ x: currentPetState.x, y: currentPetState.y });
  }
  
  updatePetUI();

  const walkingEnabled = true;
  if (walkingEnabled) {
    walkingPlugin.initialize({
      petElement: petElement,
      updatePetPosition: updatePetPosition, 
      getPetState: () => currentPetState, 
      getAllDisplaysInfo: () => allDisplaysInfo, 
      isDragging: () => isHoldingPet, // Pass holding state
      setStatus: setPetStatus 
    });
  }

  window.api.onPetStateUpdate((newState) => {
    // console.log('Received state update from main:', newState);
    currentPetState = newState;
    updatePetUI();
  });
}

// Prevent default context menu
document.addEventListener('contextmenu', (e) => e.preventDefault());

// --- UI Visibility --- 
function showUI() {
  if (uiVisible) return;
  uiVisible = true;
  petStats.style.opacity = '1';
  petStats.style.pointerEvents = 'auto';
  petControls.style.opacity = '1';
  petControls.style.pointerEvents = 'auto';
}

function hideUI() {
  if (!uiVisible) return;
  uiVisible = false;
  petStats.style.opacity = '0';
  petStats.style.pointerEvents = 'none';
  petControls.style.opacity = '0';
  petControls.style.pointerEvents = 'none';
}

// --- Click vs Hold Handling --- 

// Check if an element or its parents are part of the interactive controls/stats
function isInteractiveUI(element) {
  return petControls.contains(element) || petStats.contains(element);
}

document.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return; // Only left click

  // Start potential hold ONLY if clicking directly on the pet image or name
  if (e.target === petImage || e.target === petName) {
      isHoldingPet = true; 
      walkingPlugin.stop(); // Stop any walk
      setPetStatus('interacting'); // Set status via IPC -> main -> state -> renderer update
      petElement.style.cursor = 'grabbing'; 
      // updatePetUI(); // Let the state update handle the visual change
  }
});

document.addEventListener('mousemove', (e) => {
  // No window dragging logic here anymore
});

document.addEventListener('mouseup', (e) => {
  if (e.button !== 0) return;

  const wasHolding = isHoldingPet; // Store if we were holding before resetting
  isHoldingPet = false; // Always reset holding flag on mouseup

  if (wasHolding) {
      // If we were holding, always reset status to idle
      setPetStatus('idle'); 
      petElement.style.cursor = 'grab'; 
      // updatePetUI(); // Let the state update handle the visual change

      // Treat the release as a click to toggle UI
      if (uiVisible) {
        hideUI();
      } else {
        showUI();
      }
  } else {
      // Handle clicks outside the pet/UI that should hide the UI
      if (uiVisible && !petElement.contains(e.target) && !isInteractiveUI(e.target)) {
        hideUI();
      }
  }
});

// --- Interactions --- 

// Helper function to handle interactions
async function handleInteraction(interactionPromise) {
  walkingPlugin.stop(); // Stop walk before interaction
  const newState = await interactionPromise; // Calls main process which sets status to 'interacting' via the Pet class method
  if (newState) {
    currentPetState = newState; // Update local state immediately from return
    updatePetUI();
    // Set status back to idle *after* the interaction completes and state is received
    setTimeout(() => setPetStatus('idle'), 100); // Reset status after interaction completes
  }
}

feedBtn.addEventListener('click', async (e) => {
  e.stopPropagation();
  petImage.parentElement.classList.add('feeding');
  await handleInteraction(window.api.feedPet());
  setTimeout(() => petImage.parentElement.classList.remove('feeding'), 1000);
});

playBtn.addEventListener('click', async (e) => {
  e.stopPropagation();
  await handleInteraction(window.api.playWithPet());
});

sleepBtn.addEventListener('click', async (e) => {
  e.stopPropagation();
  await handleInteraction(window.api.petSleep());
});

// Prevent mousedown on controls/stats from bubbling up 
petControls.addEventListener('mousedown', (e) => e.stopPropagation());
petStats.addEventListener('mousedown', (e) => e.stopPropagation());

// Initialize
initialize(); 