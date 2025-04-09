/**
 * @file app/types/game.ts
 * @description Defines shared TypeScript types and interfaces for the game state and data.
 * Adding this file is highly recommended for improving code quality and safety.
 */

/**
 * Represents a single interactable node on the game map.
 * Defining this interface ensures that all parts of your code expect the same structure
 * for a map node, preventing errors and improving clarity.
 */
export interface MapNode {
    id: string; // Unique identifier for the node (e.g., 'calibration_node')
    name: string; // Display name of the node (e.g., 'Calibration Point')
    x: number; // Horizontal position (e.g., percentage 0-100)
    y: number; // Vertical position (e.g., percentage 0-100)
    description?: string; // Optional longer description text for UI elements
    requiresJournal?: boolean; // Flag: Does interacting require the journal? (Defaults to false if omitted)
    phaseSpecific?: 'day' | 'night'; // Flag: Is the node only available during a specific phase? (Undefined means always available)
    // Add other node-specific properties as your game requires:
    // e.g., associatedDialogueId?: string; // ID of dialogue triggered by this node
    // e.g., requiredKnowledge?: string[]; // Knowledge facts needed to interact
    // e.g., icon?: string; // Specific icon identifier for this node type
  }
  
  /**
   * Represents the overall structure of the game map data.
   * This ensures consistency when loading or defining map data.
   */
  export interface GameMap {
    id: string; // Unique identifier for the map (e.g., 'kapoor-calib')
    name: string; // Display name of the map (e.g., 'Kapoor Calibration')
    nodes: MapNode[]; // An array containing all the nodes defined for this map
    // Add other map-specific properties as needed:
    // e.g., backgroundImageUrl?: string; // Path to a background image for the map view
    // e.g., dimensions?: { width: number; height: number }; // Intrinsic dimensions if not percentage-based
    // e.g., entryNodeId?: string; // Default node when entering this map
  }
  
  // Add other shared game types below as your application grows.
  // Examples:
  /*
  export interface Item {
    id: string;
    name: string;
    description: string;
    icon: string;
    stackable?: boolean;
  }
  
  export interface Quest {
    id: string;
    title: string;
    status: 'inactive' | 'active' | 'completed' | 'failed';
    objectives: { description: string; completed: boolean }[];
  }
  */
  
  