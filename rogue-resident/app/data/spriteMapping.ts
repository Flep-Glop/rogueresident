// app/data/spriteMapping.ts
/**
 * Sprite Sheet Mapping System
 * 
 * This system manages the relationship between item identifiers and 
 * their corresponding locations on sprite sheets, allowing for efficient
 * rendering and better asset management.
 */

export type SpriteSource = 'modern' | 'future';

export interface SpritePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpriteData {
  source: SpriteSource;
  position: SpritePosition;
  name?: string;
  description?: string;
}

// Sheet dimensions and grid information
export const SPRITE_SHEETS = {
  modern: {
    src: '/sprites/modern-sheet.png',
    width: 480,
    height: 256,
    columns: 30,
    rows: 16,
    cellSize: 16, // Assuming uniform cells
  },
  future: {
    src: '/sprites/future-sheet.png',
    width: 384,
    height: 320,
    columns: 25,
    rows: 20,
    cellSize: 16, // Assuming uniform cells
  }
};

/**
 * Helper function to calculate sprite position from grid coordinates
 */
export function gridToPosition(
  sheet: SpriteSource, 
  col: number, 
  row: number, 
  widthInCells: number = 1, 
  heightInCells: number = 1
): SpritePosition {
  const sheetInfo = SPRITE_SHEETS[sheet];
  return {
    x: col * sheetInfo.cellSize,
    y: row * sheetInfo.cellSize,
    width: widthInCells * sheetInfo.cellSize,
    height: heightInCells * sheetInfo.cellSize
  };
}

/**
 * Medical equipment sprite mappings
 */
export const MEDICAL_EQUIPMENT: Record<string, SpriteData> = {
  // For the Kapoor Calibration scene
  'farmer-chamber': {
    source: 'future',
    position: gridToPosition('future', 0, 4),
    name: 'Farmer Chamber',
    description: 'A calibrated Farmer-type ionization chamber with PMMA buildup cap.'
  },
  'linac': {
    source: 'future',
    position: gridToPosition('future', 12, 3, 1, 1),
    name: 'Linear Accelerator',
    description: 'LINAC 2, the Varian TrueBeam used primarily for head and neck treatments.'
  },
  'chamber-setup': {
    source: 'future',
    position: gridToPosition('future', 4, 5),
    name: 'Measurement Setup',
    description: 'The ionization chamber setup at isocenter with field size indicators.'
  },
  'electrometer': {
    source: 'future',
    position: gridToPosition('future', 20, 8),
    name: 'Electrometer Reading',
    description: 'The electrometer showing collected charge measurements from the chamber.'
  },
  
  // Add more equipment as needed
  'dosimeter': {
    source: 'future',
    position: gridToPosition('future', 6, 6),
    name: 'Dosimeter',
    description: 'Personal radiation dosimeter for monitoring exposure.'
  },
  'radiation-badge': {
    source: 'future',
    position: gridToPosition('future', 5, 0),
    name: 'Radiation Badge',
    description: 'Personnel monitoring device for tracking cumulative radiation exposure.'
  }
};

/**
 * General items sprite mappings
 */
export const ITEMS: Record<string, SpriteData> = {
  'journal': {
    source: 'modern',
    position: gridToPosition('modern', 6, 7),
    name: 'Physics Journal',
    description: 'Records observations and procedures during your residency.'
  },
  'reference-guide': {
    source: 'modern',
    position: gridToPosition('modern', 7, 5),
    name: 'Reference Guide',
    description: 'Standard protocols and procedures for medical physics.'
  },
  'calibration-tool': {
    source: 'future',
    position: gridToPosition('future', 14, 4),
    name: 'Calibration Tool',
    description: 'Precision instrument for fine-tuning measurement devices.'
  },
  'phantom': {
    source: 'future',
    position: gridToPosition('future', 15, 7),
    name: 'Water Phantom',
    description: 'Water-equivalent material for simulating tissue in radiation measurements.'
  }
};

/**
 * Get sprite data by item ID across all categories
 */
export function getSpriteData(itemId: string): SpriteData | undefined {
  return MEDICAL_EQUIPMENT[itemId] || ITEMS[itemId];
}

/**
 * Get the full sprite sheet source path
 */
export function getSpriteSheetSrc(source: SpriteSource): string {
  return SPRITE_SHEETS[source].src;
}