/**
 * @file app/types/game.ts
 * @description Defines shared TypeScript types and interfaces for the game state and data.
 */

// --- Core Game State ---

/**
 * Represents the major phases or states the game can be in.
 */
export enum GamePhase {
  INITIALIZING = 'INITIALIZING', // Core systems loading
  INITIALIZED = 'INITIALIZED',   // Systems loaded, ready to start
  MAIN_MENU = 'MAIN_MENU',       // If you have a main menu
  GAME_STARTING = 'GAME_STARTING', // Transitioning into gameplay
  DAY_START = 'DAY_START',       // Beginning of a new day sequence
  DAY_EXPLORATION = 'DAY_EXPLORATION', // Player can explore during the day
  NIGHT_TRANSITION = 'NIGHT_TRANSITION', // Transitioning from day to night
  NIGHT_START = 'NIGHT_START',     // Beginning of the night sequence
  NIGHT_EXPLORATION = 'NIGHT_EXPLORATION', // Player can explore during the night
  DAY_TRANSITION = 'DAY_TRANSITION',   // Transitioning from night to day
  PAUSED = 'PAUSED',             // Game is paused
  GAME_OVER = 'GAME_OVER',       // Player has lost
  VICTORY = 'VICTORY',           // Player has won
  DIALOGUE = 'DIALOGUE',         // Player is in active dialogue (Consider if needed, dialogue.isActive might suffice)
}

/**
 * Represents the player's current status and attributes.
 */
export interface PlayerState {
  health: number; // Current health points (e.g., 0-100)
  sanity: number; // Current sanity points (e.g., 0-100)
  location: string; // ID of the current MapNode the player is at
  statusEffects: string[]; // List of active status effect identifiers
  // Add other player-specific stats as needed (e.g., skills, attributes)
}

/**
 * Represents the state of in-game time.
 */
export interface TimeState {
  currentDay: number; // The current day number (e.g., 1, 2, ...)
  currentTime: number; // Time of day, e.g., hours 0-23 or minutes 0-1439
  isDay: boolean; // Convenience flag: true if it's currently considered daytime
}

/**
 * Represents an item in the game.
 */
export interface Item {
  id: string; // Unique identifier (e.g., 'key_card_alpha')
  name: string; // Display name (e.g., 'Alpha Key Card')
  description: string; // Description shown in UI
  icon?: string; // Identifier for UI icon
  stackable?: boolean; // Can multiple instances stack? (Default: false)
  maxStack?: number; // Maximum stack size if stackable (Default: 1 or Infinity)
  // Add other item properties: usable, equipable, type, effects, etc.
}

/**
 * Represents a single entry in the player's journal.
 */
export interface JournalEntry {
    id: string; // Unique identifier for the entry
    title: string; // Title shown in the journal list
    content: string; // Full content of the journal entry (can include Markdown/HTML)
    timestamp: number; // When the entry was acquired (e.g., Date.now())
    read: boolean; // Has the player marked this entry as read?
    // Add category, related clues, etc. if needed
}

// --- Map Related Types ---

/**
 * Represents a single interactable node on the game map.
 */
export interface MapNode {
  id: string; // Unique identifier for the node (e.g., 'calibration_node')
  name: string; // Display name of the node (e.g., 'Calibration Point')
  x: number; // Horizontal position (e.g., percentage 0-100 or pixel coords)
  y: number; // Vertical position (e.g., percentage 0-100 or pixel coords)
  description?: string; // Optional longer description text for UI elements
  requiresJournal?: boolean; // Flag: Does interacting require the journal?
  phaseSpecific?: 'day' | 'night'; // Availability based on time
  associatedDialogueId?: string; // Optional ID of dialogue triggered by this node
  requiredKnowledge?: string[]; // Optional Knowledge facts needed to interact
  icon?: string; // Optional Specific icon identifier for this node type
  isAccessible?: boolean; // Optional Runtime flag if node is currently reachable (default true)
  isCompleted?: boolean; // Optional Runtime flag if node interaction is done
}

/**
 * Represents the static definition data for a game map.
 */
export interface GameMapData {
  id: string; // Unique identifier for the map (e.g., 'kapoor-calib')
  name: string; // Display name of the map (e.g., 'Kapoor Calibration')
  nodes: MapNode[]; // An array containing all the nodes defined for this map
  backgroundImageUrl?: string; // Optional Path to a background image
  entryNodeId?: string; // Optional Default node when entering this map
}

/**
 * Represents the runtime state related to the map.
 */
export interface MapState {
  nodes: Record<string, MapNode>; // Runtime state of nodes (e.g., including isCompleted, isAccessible) keyed by ID
  currentNodeId: string; // The ID of the node the player is currently at
  currentMapId?: string; // ID of the currently loaded GameMapData
  // Add other runtime map states: discovered nodes, fog of war data, etc.
}


// --- Dialogue System Types ---

/**
 * Represents a choice presented to the player during dialogue.
 */
export interface NarrativeChoice {
  text: string; // The text displayed for the choice
  nextNodeId: string; // The ID of the dialogue node this choice leads to
  requiredCondition?: () => boolean; // Optional function to check if choice is available
  tooltip?: string; // Optional tooltip shown on hover
}

/**
 * Represents a single node within a dialogue sequence.
 */
export interface DialogueNode {
  id: string; // Unique ID for this node within the dialogue
  text: string; // The main text spoken or narrated
  speaker?: string; // Identifier for the character speaking (or 'Narrator')
  mood?: string; // Hint for character expression (e.g., 'happy', 'angry')
  choices?: NarrativeChoice[]; // Choices presented at the end of this node's text
  events?: NarrativeEvent[]; // Events triggered when this node is displayed
  isPauseNode?: boolean; // Does the dialogue pause here without choices (e.g., for effect)?
  nextNodeId?: string; // Automatically advance to this node if no choices are present/taken
}

/**
 * Configuration needed to start a specific dialogue.
 */
export interface DialogueConfig {
  id: string; // Unique ID for the entire dialogue sequence
  startNodeId: string; // The ID of the first node to display
  nodes: Record<string, DialogueNode>; // All nodes belonging to this dialogue, keyed by ID
  initialSpeaker?: string; // Default speaker if node doesn't specify
  initialMood?: string; // Default mood if node doesn't specify
}

/**
 * Represents an event triggered by dialogue (or other game systems).
 * Uses a discriminated union based on the 'type' property.
 */
export type NarrativeEvent =
  | { type: 'updatePlayerHealth'; payload: { delta: number } }
  | { type: 'updatePlayerSanity'; payload: { delta: number } }
  | { type: 'addItem'; payload: { itemId: string; quantity?: number } } // Add quantity if needed
  | { type: 'removeItem'; payload: { itemId: string; quantity?: number } }
  | { type: 'updateKnowledge'; payload: { insightId: string; data?: any } } // Define 'data' structure if possible
  | { type: 'updateJournal'; payload: { entryId: string; title?: string; content: string } } // Ensure payload matches JournalEntry needs
  | { type: 'startQuest'; payload: { questId: string } }
  | { type: 'advanceQuest'; payload: { questId: string; objectiveIndex?: number } }
  | { type: 'completeQuest'; payload: { questId: string } }
  | { type: 'setFlag'; payload: { flagName: string; value: boolean | number | string } }
  | { type: 'playSound'; payload: { soundId: string } }
  | { type: 'customEvent'; payload: any }; // For game-specific events

/**
 * Represents the runtime state of the dialogue system.
 */
export interface DialogueState {
  isActive: boolean; // Is a dialogue currently active?
  currentDialogueId: string | null; // ID of the active DialogueConfig
  currentNodeId: string | null; // ID of the currently displayed DialogueNode
  currentText: string; // The text currently being displayed (potentially with typewriter effect)
  choices: NarrativeChoice[]; // The choices currently available to the player
  speaker: string | null; // The speaker for the current text
  characterMood: string; // The mood hint for the current speaker
  dialogueHistory: DialogueHistoryEntry[]; // Record of nodes visited and choices made
}

/**
 * Represents an entry in the dialogue history.
 */
export interface DialogueHistoryEntry {
    nodeId: string;
    text: string;
    speaker: string | null;
    choiceMade?: string; // Text of the choice made to leave this node (if any)
}

/**
 * Context passed to dialogue conditions or event handlers.
 * Allows checking game state without direct store access.
 */
export interface NarrativeContext {
  getPlayerState: () => PlayerState;
  getTimeState: () => TimeState;
  getInventory: () => Item[];
  getKnowledgeFlag: (flag: string) => any; // Example: Check knowledge system
  // Add other relevant state accessors
}


// --- Global Game State ---

/**
 * Represents the overall state of the entire game, combining various sub-states.
 * This is the structure managed by the main game store (e.g., useGameStore).
 */
export interface GameState {
  gamePhase: GamePhase; // Current phase of the game
  player: PlayerState; // Player's status
  time: TimeState; // In-game time information
  inventory: Item[]; // Player's inventory
  dialogue: DialogueState; // Current dialogue status
  map: MapState; // Runtime map state
  completedNodeIds: string[]; // IDs of map nodes/events player has completed
  currentDay: number; // DEPRECATED? Consider removing if time.currentDay is sufficient
  isTransitioning: boolean; // Is a day/night transition animation playing?
  activeSystem: 'map' | 'journal' | 'knowledge' | 'dialogue'; // Which major UI view is active
  // Add other major state slices as needed (e.g., quests, knowledge, settings)
}


// --- Placeholder Types for Core Systems ---
// These might be interfaces defining the shape of classes or hooks.
// Define minimal structure needed or use 'any'/'unknown' if structure is complex/unclear.

/** Placeholder type for the Game State Machine class/hook interface */
export type GameStateMachine = any; // Replace 'any' with a proper interface if possible

/** Placeholder type for the Progression Resolver class/hook interface */
export type ProgressionResolver = any; // Replace 'any' with a proper interface if possible

/** Placeholder type for the Dialogue State Machine class/hook interface */
export type DialogueStateMachine = any; // Replace 'any' with a proper interface if possible


// --- Utility Types ---

/** Represents a generic dictionary object with string keys. */
export type StringKeyedObject<T = any> = { [key: string]: T };

