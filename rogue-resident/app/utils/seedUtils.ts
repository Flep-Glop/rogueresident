// app/utils/seedUtils.ts
/**
 * Seed Utilities - Core system for deterministic procedural generation
 * Inspired by roguelike development techniques used in games like Hades and Dead Cells
 * to create reproducible but varied gameplay experiences.
 */

// Dev seed presets for testing specific scenarios
export const DEV_SEEDS = {
  STANDARD: 12345,
  TUTORIAL: 23456,
  BOSS_HEAVY: 34567, 
  EDUCATIONAL: 45678,
  STORAGE_RICH: 56789,
  COMPACT: 67890,
  BRANCHING: 78901,
  LINEAR: 89012,
  DENSE: 90123
};

/**
 * Creates a deterministic random number generator from a seed
 * This is the core of reproducible procedural generation
 */
export function createSeededRandom(seed: number) {
  let currentSeed = seed;
  return function() {
    // Simple LCG (Linear Congruential Generator)
    // Parameters chosen for good statistical properties
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };
}

/**
 * Generates a seed based on today's date
 * Useful for daily challenges that are the same for all players on a given day
 */
export function getDailySeed() {
  const today = new Date();
  return (today.getFullYear() * 10000) + 
         ((today.getMonth() + 1) * 100) + 
         today.getDate();
}

/**
 * Generates a random seed for normal gameplay
 * Each run will be unique but reproducible if the seed is saved
 */
export function getRandomSeed() {
  return Math.floor(Math.random() * 10000000);
}

/**
 * Generates a human-readable seed name from a numeric seed
 * Makes seeds more memorable and shareable among players
 */
export function generateSeedName(seed: number): string {
  // Medical physics themed name pairs
  const elements = [
    'Hydrogen', 'Helium', 'Carbon', 'Oxygen', 'Neon', 'Zinc', 
    'Iodine', 'Radium', 'Cesium', 'Cobalt', 'Technetium', 'Gallium'
  ];
  
  const principles = [
    'Quantum', 'Wave', 'Particle', 'Density', 'Energy', 'Isotope',
    'Halflife', 'Emission', 'Scatter', 'Attenuation', 'Beam', 'Dose'
  ];
  
  // Use the seed to deterministically select elements
  const rng = createSeededRandom(seed);
  const element = elements[Math.floor(rng() * elements.length)];
  const principle = principles[Math.floor(rng() * principles.length)];
  
  return `${element}-${principle}`;
}

/**
 * Extracts a seed from the URL if present
 * Useful for sharing specific procedural layouts
 */
export function getSeedFromUrl(): number | null {
  if (typeof window === 'undefined') return null;
  
  const urlParams = new URLSearchParams(window.location.search);
  const seedParam = urlParams.get('seed');
  
  if (seedParam && !isNaN(parseInt(seedParam, 10))) {
    return parseInt(seedParam, 10);
  }
  
  return null;
}

/**
 * Creates a URL that includes the current seed
 * Facilitates sharing specific layouts with others
 */
export function createSeedUrl(seed: number): string {
  if (typeof window === 'undefined') return '';
  
  const url = new URL(window.location.href);
  url.searchParams.set('seed', seed.toString());
  return url.toString();
}

/**
 * Run data structure for tracking past runs
 */
export interface RunData {
  seed: number;
  seedName: string;
  timestamp: string;
  completed: boolean;
  score?: number;
  dayCount?: number;
}

/**
 * Retrieves recent run history from localStorage
 */
export function getRecentRuns(): RunData[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const storedRuns = localStorage.getItem('rogue-resident-recent-runs');
    return storedRuns ? JSON.parse(storedRuns) : [];
  } catch (e) {
    console.error('Error retrieving recent runs:', e);
    return [];
  }
}

/**
 * Saves a run to the history
 */
export function saveRun(runData: RunData) {
  if (typeof window === 'undefined') return;
  
  try {
    const runs = getRecentRuns();
    runs.unshift(runData);
    
    // Keep only the last 10 runs
    const trimmedRuns = runs.slice(0, 10);
    localStorage.setItem('rogue-resident-recent-runs', JSON.stringify(trimmedRuns));
  } catch (e) {
    console.error('Error saving run:', e);
  }
}

/**
 * Updates the current run with new data
 */
export function updateCurrentRun(updates: Partial<RunData>) {
  if (typeof window === 'undefined') return;
  
  try {
    const runs = getRecentRuns();
    if (runs.length > 0) {
      const updatedRun = { ...runs[0], ...updates };
      runs[0] = updatedRun;
      localStorage.setItem('rogue-resident-recent-runs', JSON.stringify(runs));
    }
  } catch (e) {
    console.error('Error updating current run:', e);
  }
}