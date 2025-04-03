// app/types/audio.ts

/**
 * Comprehensive sound effects system for Rogue Resident
 * 
 * Sound effects are organized into logical categories to create a 
 * consistent audio experience across the game. This type system ensures
 * correct sound references throughout the codebase.
 */

// Core sound effect type with all possible values
export type SoundEffect = 
  // UI navigation sounds
  | 'click' | 'hover' | 'select' | 'back'
  
  // UI feedback sounds  
  | 'success' | 'failure' | 'warning' | 'error'
  
  // Extended UI interactions
  | 'ui-click' | 'ui-close' | 'ui-open' | 'ui-toggle' | 'ui-move' | 'ui-disabled'
  
  // Game phase transitions
  | 'day-start' | 'night-start'
  
  // Challenge feedback
  | 'challenge-complete' | 'partial-success'
  
  // Character interactions
  | 'dialogue-select' | 'character-interact'
  
  // Node interaction sounds
  | 'node-select' | 'node-hover'
  
  // Item interaction
  | 'item-select' | 'item-use'
  
  // Knowledge system
  | 'knowledge-select' | 'knowledge-connect'
  
  // Achievement/progression feedback
  | 'insight-gain' | 'level-up';

// Sound categories for organization
export enum SoundCategory {
  UI = 'ui',
  FEEDBACK = 'feedback',
  ENVIRONMENT = 'environment',
  CHARACTER = 'character',
  SYSTEM = 'system'
}

// Sound fallbacks mapping alternative sound names to core sounds
export const SoundFallbacks: Record<SoundEffect, SoundEffect> = {
  // Core sounds map to themselves
  'click': 'click',
  'hover': 'hover',
  'select': 'select',
  'back': 'back',
  
  'success': 'success',
  'failure': 'failure',
  'warning': 'warning',
  'error': 'error',
  
  // UI variants map to core sounds
  'ui-click': 'click',
  'ui-close': 'back',
  'ui-open': 'select',
  'ui-toggle': 'click',
  'ui-move': 'click',
  'ui-disabled': 'error',
  
  // Game transitions
  'day-start': 'success',
  'night-start': 'success',
  
  // Challenge sounds
  'challenge-complete': 'success',
  'partial-success': 'warning',
  
  // Character interactions
  'dialogue-select': 'select',
  'character-interact': 'click',
  
  // Node interactions
  'node-select': 'select',
  'node-hover': 'hover',
  
  // Item interactions
  'item-select': 'select',
  'item-use': 'click',
  
  // Knowledge system
  'knowledge-select': 'select',
  'knowledge-connect': 'success',
  
  // Achievement feedback
  'insight-gain': 'success',
  'level-up': 'success'
};

/**
 * Gets the appropriate fallback sound if the requested sound is unavailable
 * @param sound The requested sound effect
 * @returns The appropriate sound to play (either the requested sound or a fallback)
 */
export function getSoundFallback(sound: SoundEffect): SoundEffect {
  return SoundFallbacks[sound] || 'click';
}