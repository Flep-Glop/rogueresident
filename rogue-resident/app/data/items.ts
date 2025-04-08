// app/data/items.ts
/**
 * OPTION 1: Streamlined Items Implementation
 * 
 * This simplified system uses a small set of hardcoded items with direct effects,
 * removing the need for complex item generation or effect calculation.
 * 
 * KEY SIMPLIFICATIONS:
 * - Limited set of pre-defined items (no procedural generation)
 * - Direct effect values (no formula calculations)
 * - Single effect type per item (no combinatorial complexity)
 * - No rarity system or tiering (will add back later)
 */

export type ItemEffectType = 'clinical' | 'qa' | 'educational' | 'general' | 'health';

export interface ItemEffect {
  type: ItemEffectType;
  value: number;
  description: string;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  effects: ItemEffect[];
  rarity: 'common' | 'uncommon' | 'rare';  // Simplified rarity system
}

// Hardcoded collection of items for testing core gameplay
export const ITEMS: Record<string, Item> = {
  'handbook': {
    id: 'handbook',
    name: 'Medical Physics Handbook',
    description: 'A well-worn reference manual with helpful diagrams.',
    effects: [
      { type: 'educational', value: 10, description: '+10 to educational challenges' }
    ],
    rarity: 'common'
  },
  'dosimeter': {
    id: 'dosimeter',
    name: 'Calibrated Dosimeter',
    description: 'Precisely measures radiation exposure levels.',
    effects: [
      { type: 'qa', value: 15, description: '+15 to quality assurance challenges' }
    ],
    rarity: 'uncommon'
  },
  'notebook': {
    id: 'notebook',
    name: 'Dr. Kapoor\'s Annotated Notebook',
    description: 'Contains detailed protocols with expert annotations.',
    effects: [
      { type: 'clinical', value: 20, description: '+20 to clinical challenges' }
    ],
    rarity: 'rare'
  },
  'coffee': {
    id: 'coffee',
    name: 'Hospital Coffee',
    description: 'Strong enough to keep you going through a long shift.',
    effects: [
      { type: 'health', value: 1, description: 'Restore 1 health point' }
    ],
    rarity: 'common'
  },
  'multitool': {
    id: 'multitool',
    name: 'Jesse\'s Multitool',
    description: 'A versatile tool for equipment adjustments.',
    effects: [
      { type: 'general', value: 5, description: '+5 to all challenge types' }
    ],
    rarity: 'uncommon'
  }
};

/**
 * Helper function to calculate item bonuses for a challenge
 * 
 * SIMPLIFICATION: Direct lookup and addition instead of effect combinations and modifiers
 */
export function calculateItemBonus(inventory: Item[], challengeType: ItemEffectType): number {
  return inventory.reduce((bonus, item) => {
    // Find effects that match this challenge type or are general
    const matchingEffects = item.effects.filter(
      effect => effect.type === challengeType || effect.type === 'general'
    );
    
    // Sum up all matching effect values
    const effectSum = matchingEffects.reduce((sum, effect) => sum + effect.value, 0);
    
    return bonus + effectSum;
  }, 0);
}

/**
 * Helper function to get a random item
 * 
 * SIMPLIFICATION: Just returns a random item from our hardcoded list
 */
export function getRandomItem(): Item {
  const keys = Object.keys(ITEMS);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return ITEMS[randomKey];
}

/**
 * TODO: Future Implementation Notes
 * 
 * - Add procedural item generation with affixes/modifiers
 * - Implement tiered rarity system with quality variations
 * - Add item categories (equipment, consumables, references)
 * - Implement item upgrade/combination system
 */