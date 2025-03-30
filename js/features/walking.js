let isWalking = false;
let animationFrameId = null;
let walkStartTime = 0;
let walkStartPosition = { x: 0, y: 0 };
let walkEndPosition = { x: 0, y: 0 };
let walkDuration = 0;

let dependencies = {}; // To store references passed from renderer.js
let walkIntervals = []; // To store interval IDs

// --- Core Walking Logic ---

function startSmoothWalk(startX, startY, endX, endY, duration) {
  // Ensure coordinates are valid numbers before starting
  if (typeof startX !== 'number' || typeof startY !== 'number' || isNaN(startX) || isNaN(startY) ||
      typeof endX !== 'number' || typeof endY !== 'number' || isNaN(endX) || isNaN(endY)) {
    console.error("Invalid coordinates provided to startSmoothWalk. Aborting walk.", { startX, startY, endX, endY });
    return;
  }
  
  if (isWalking) return;

  // Set status in main process
  dependencies.setStatus('walking');

  isWalking = true;
  dependencies.petElement.classList.add('walking');

  walkStartTime = performance.now();
  walkStartPosition = { x: startX, y: startY };
  walkEndPosition = { x: endX, y: endY };
  walkDuration = duration;

  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  animateSmoothWalk();
}

function animateSmoothWalk() {
  const currentTime = performance.now();
  const elapsed = currentTime - walkStartTime;

  if (elapsed >= walkDuration) {
    // Ensure final position is valid before sending
    if (typeof walkEndPosition.x === 'number' && typeof walkEndPosition.y === 'number' && !isNaN(walkEndPosition.x) && !isNaN(walkEndPosition.y)){
      dependencies.updatePetPosition(walkEndPosition);
    }
    stopWalking(); // This will also set status back to idle
    return;
  }

  let progress = elapsed / walkDuration;
  progress = progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;

  const currentX = walkStartPosition.x + (walkEndPosition.x - walkStartPosition.x) * progress;
  const currentY = walkStartPosition.y + (walkEndPosition.y - walkStartPosition.y) * progress;

  const nextPosition = { x: Math.round(currentX), y: Math.round(currentY) };

  // Ensure calculated position is valid before sending
  if (typeof nextPosition.x === 'number' && typeof nextPosition.y === 'number' && !isNaN(nextPosition.x) && !isNaN(nextPosition.y)) {
    // Let main process handle window move via updatePetPosition
    dependencies.updatePetPosition(nextPosition); 
  } else {
     console.error("Invalid position calculated in animateSmoothWalk. Stopping walk.", { currentX, currentY });
     stopWalking();
     return;
  }
  
  animationFrameId = requestAnimationFrame(animateSmoothWalk);
}

function stopWalking() {
  if (!isWalking) return; 
  isWalking = false;
  dependencies.petElement.classList.remove('walking');
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  // Set status back to idle after walking stops
  dependencies.setStatus('idle'); 
}

// --- Random Walk Generation ---

function startRandomWalk() {
  const petState = dependencies.getPetState();
  // Only walk if idle
  if (dependencies.isDragging() || isWalking || petState?.status !== 'idle' || typeof petState?.x !== 'number' || typeof petState?.y !== 'number') return;
  
  const { x, y } = getRandomPositionAcrossDisplays();
  startSmoothWalk(petState.x, petState.y, x, y, 3000);
}

function startShortWalk() {
  const petState = dependencies.getPetState();
  // Only walk if idle
  if (dependencies.isDragging() || isWalking || petState?.status !== 'idle' || typeof petState?.x !== 'number' || typeof petState?.y !== 'number') return;
  
  const currentDisplay = findDisplayForPosition(petState.x, petState.y);
  if (!currentDisplay) return;

  const distance = 100 + Math.floor(Math.random() * 400);
  const angle = Math.random() * Math.PI * 2;
  const newX = petState.x + Math.cos(angle) * distance;
  const newY = petState.y + Math.sin(angle) * distance;

  const boundedX = Math.max(currentDisplay.bounds.x, Math.min(newX, currentDisplay.bounds.x + currentDisplay.bounds.width - 250));
  const boundedY = Math.max(currentDisplay.bounds.y, Math.min(newY, currentDisplay.bounds.y + currentDisplay.bounds.height - 300));
  const duration = 1000 + distance * 3;
  startSmoothWalk(petState.x, petState.y, boundedX, boundedY, duration);
}

function findDisplayForPosition(x, y) {
  const displaysInfo = dependencies.getAllDisplaysInfo();
  if (!displaysInfo) return null;
  for (const display of displaysInfo.displays) {
    if (x >= display.bounds.x && x < display.bounds.x + display.bounds.width && y >= display.bounds.y && y < display.bounds.y + display.bounds.height) {
      return display;
    }
  }
  return displaysInfo.primaryDisplay;
}

function getRandomPositionAcrossDisplays() {
  const displaysInfo = dependencies.getAllDisplaysInfo();
  if (!displaysInfo) return { x: 0, y: 0 };
  const displays = displaysInfo.displays;
  const randomDisplay = displays[Math.floor(Math.random() * displays.length)];
  const width = randomDisplay?.bounds?.width ?? 800;
  const height = randomDisplay?.bounds?.height ?? 600;
  const startX = randomDisplay?.bounds?.x ?? 0;
  const startY = randomDisplay?.bounds?.y ?? 0;

  const x = startX + Math.floor(Math.random() * Math.max(0, width - 250));
  const y = startY + Math.floor(Math.random() * Math.max(0, height - 300));
  return { x, y };
}

// --- Plugin Initialization/Cleanup ---

function initializeWalking(deps) {
  console.log("Initializing Walking Plugin...");
  dependencies = deps; 
  cleanupWalking(); 

  const longWalkInterval = setInterval(() => {
    // Check status via dependencies before starting walk
    if (!dependencies.isDragging() && !isWalking && dependencies.getPetState()?.status === 'idle' && Math.random() < 0.3) {
      startRandomWalk();
    }
  }, 10000);

  const shortWalkInterval = setInterval(() => {
    // Check status via dependencies before starting walk
    if (!dependencies.isDragging() && !isWalking && dependencies.getPetState()?.status === 'idle' && Math.random() < 0.5) {
      startShortWalk();
    }
  }, 20000);

  walkIntervals.push(longWalkInterval, shortWalkInterval);
}

function cleanupWalking() {
  console.log("Cleaning up Walking Plugin...");
  stopWalking();
  walkIntervals.forEach(clearInterval);
  walkIntervals = [];
}

export const walkingPlugin = {
  initialize: initializeWalking,
  cleanup: cleanupWalking,
  stop: stopWalking,
  isWalking: () => isWalking
}; 