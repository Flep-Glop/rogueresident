// app/types/player.ts

/**
 * Player Entity Interface
 * 
 * A comprehensive definition of the player entity that drives gameplay.
 * This serves as the central type for player-related state across the game.
 */
export interface PlayerEntity {
    // Core attributes
    insight: number;         // Primary knowledge resource, used for strategic actions
    insightMax: number;      // Maximum insight capacity (typically 100)
    momentum: number;        // Combo counter affecting action availability (0-3)
    maxMomentum: number;     // Maximum momentum level (typically 3)
    
    // Optional health system (placeholder for future implementation)
    health?: number;         // Current health points (optional, not implemented in current vertical slice)
    maxHealth?: number;      // Maximum health capacity (optional)
    
    // Achievement/progression tracking
    knowledgeMastery: {      // Summary of knowledge mastery across domains
      overall: number;       // Overall mastery percentage 
      byDomain: Record<string, number>; // Mastery by domain
      recentlyMastered: string[];       // Recently gained concept IDs
    };
    
    // Status effects and temporary modifiers
    activeBuffs: string[];   // IDs of active status effects
    
    // Inventory - abstracted for the vertical slice
    inventory: string[];     // IDs of held items
  }
  
  /**
   * Default Player Entity
   * Initial state for a new player with safe defaults
   */
  export const DEFAULT_PLAYER_ENTITY: PlayerEntity = {
    insight: 0,
    insightMax: 100,
    momentum: 0,
    maxMomentum: 3,
    health: 100,          // Default health starts at maximum
    maxHealth: 100,
    knowledgeMastery: {
      overall: 0,
      byDomain: {},
      recentlyMastered: []
    },
    activeBuffs: [],
    inventory: []
  };