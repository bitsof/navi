class Pet {
  constructor(name = 'Buddy', initialX = 0, initialY = 0) {
    this.name = name;
    this.hunger = 50;
    this.happiness = 50;
    this.energy = 50;
    this.lastInteraction = Date.now();
    this.x = initialX;
    this.y = initialY;
    this.mood = '🐱'; // Initial mood
    this.status = 'idle'; // Possible statuses: idle, walking, interacting
    this.updateMood(); // Calculate initial mood
  }

  // --- Getters for State --- 
  getState() {
    // Return a copy of the state to prevent direct modification
    return {
      name: this.name,
      hunger: this.hunger,
      happiness: this.happiness,
      energy: this.energy,
      mood: this.mood,
      x: this.x,
      y: this.y,
      status: this.status
    };
  }

  // --- Status Management ---
  setStatus(newStatus) {
    // Basic validation for allowed statuses
    const allowedStatuses = ['idle', 'walking', 'interacting'];
    if (allowedStatuses.includes(newStatus)) {
        if (this.status !== newStatus) {
            console.log(`Pet status changed: ${this.status} -> ${newStatus}`);
            this.status = newStatus;
            this.updateMood(); // Update mood immediately when status changes
            return true; // Indicate status changed
        }
    } else {
        console.warn(`Attempted to set invalid status: ${newStatus}`);
    }
    return false; // Indicate status did not change
  }

  // --- State Modifiers (Interactions) --- 
  feed() {
    this.setStatus('interacting');
    this.hunger = Math.max(0, this.hunger - 20);
    this.energy = Math.min(100, this.energy + 10);
    this.updateInteractionTime();
  }

  play() {
    this.setStatus('interacting');
    this.happiness = Math.min(100, this.happiness + 20);
    this.hunger = Math.min(100, this.hunger + 10);
    this.energy = Math.max(0, this.energy - 15);
    this.updateInteractionTime();
  }

  sleep() {
    this.setStatus('interacting');
    this.energy = 100;
    this.updateInteractionTime();
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  // --- Internal Logic --- 
  updateInteractionTime() {
    this.lastInteraction = Date.now();
    this.updateMood(); // Mood might change after interaction
  }

  // Update stats based on time passed (call this periodically)
  updateStatsOverTime() {
    // Don't degrade if interacting or walking?
    // if (this.status !== 'idle') return false; 

    const now = Date.now();
    const hoursPassed = (now - this.lastInteraction) / (1000 * 60 * 60);
    let changed = false;

    if (hoursPassed > 0.001) { // Check small interval to avoid floating point issues
      const timeMultiplier = 0.1; // Degrade slower for testing, adjust as needed
      const hungerIncrease = Math.round(hoursPassed * 5 * timeMultiplier);
      const happinessDecrease = Math.round(hoursPassed * 5 * timeMultiplier);
      const energyDecrease = Math.round(hoursPassed * 3 * timeMultiplier);

      if (hungerIncrease > 0 && this.hunger < 100) {
          this.hunger = Math.min(100, this.hunger + hungerIncrease);
          changed = true;
      }
      if (happinessDecrease > 0 && this.happiness > 0) {
          this.happiness = Math.max(0, this.happiness - happinessDecrease);
          changed = true;
      }
      if (energyDecrease > 0 && this.energy > 0) {
          this.energy = Math.max(0, this.energy - energyDecrease);
          changed = true;
      }
      
      if (changed) {
          this.lastInteraction = now; 
          this.updateMood();
      }
    }
    return changed; // Indicate if the state was modified
  }

  // Determine mood based on current stats
  updateMood() {
    let newMood;
    if (this.status === 'interacting') {
        newMood = '😻'; // Example: Happy/Held during interaction
    } else if (this.status === 'walking') {
        newMood = this.mood; // Keep current mood while walking, or define a specific one
    } else if (this.hunger > 70 || this.happiness < 30 || this.energy < 30) {
      newMood = '😿'; // Sad/Hungry/Tired
    } else if (this.hunger > 50 || this.happiness < 50 || this.energy < 50) {
      newMood = '🐱'; // Neutral
    } else {
      newMood = '😸'; // Happy/Idle
    }
    
    if (this.mood !== newMood) {
        this.mood = newMood;
        console.log(`Pet mood updated to: ${this.mood}`);
        // Potentially return true if mood changed, useful if main process needs to know
        return true;
    }
    return false;
  }
}

// Export the class using CommonJS
module.exports = Pet; 