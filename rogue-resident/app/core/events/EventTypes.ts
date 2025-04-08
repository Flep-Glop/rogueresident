// app/core/events/EventTypes.ts
/**
 * Streamlined Game Event Types for Vertical Slice
 * 
 * This focused event taxonomy includes only essential events needed
 * for the core day/night cycle with Dr. Kapoor. This ensures a clean,
 * focused implementation while maintaining extensibility.
 * 
 * Original implementation had 40+ event types; this version focuses on ~15
 * that directly support the vertical slice experience.
 */

export enum GameEventType {
  // ===== UI Events =====
  // Essential interface interactions
  UI_BUTTON_CLICKED = 'ui:button:clicked',
  UI_OPTION_SELECTED = 'ui:option:selected',
  UI_NODE_CLICKED = 'ui:node:clicked',
  
  // ===== Dialogue Events =====
  // Core narrative flow events
  DIALOGUE_STARTED = 'dialogue:started',
  DIALOGUE_OPTION_SELECTED = 'dialogue:option:selected',
  DIALOGUE_COMPLETED = 'dialogue:completed',
  DIALOGUE_CRITICAL_PATH = 'dialogue:critical:path',
  DIALOGUE_ERROR = 'dialogue:error', // ADDED: Explicit error event
  
  // ===== Map Navigation Events =====
  // Core map interaction
  NODE_COMPLETED = 'node:completed',
  
  // ===== Game State Events =====
  // Day/night cycle core events
  GAME_STATE_CHANGED = 'state:state:changed',
  GAME_PHASE_CHANGED = 'state:phase:changed',
  DAY_STARTED = 'day:started',
  DAY_COMPLETED = 'day:completed', // ADDED: Explicit day completion event
  NIGHT_STARTED = 'night:started',
  NIGHT_COMPLETED = 'night:completed', // ADDED: Explicit night completion event
  SESSION_STARTED = 'session:started',
  SYSTEM_INITIALIZED = 'system:initialized',
  SYSTEM_SHUTDOWN = 'system:shutdown',
  
  // ===== Progression Events =====
  // Critical progression checkpoints
  JOURNAL_ACQUIRED = 'progression:journal:acquired',
  KNOWLEDGE_GAINED = 'progression:knowledge:gained',
  KNOWLEDGE_TRANSFERRED = 'progression:knowledge:transferred',
  CHALLENGE_COMPLETED = 'challenge:completed',
  
  // ===== Transaction Events =====
  // These facilitate critical path completion
  PROGRESSION_TRANSACTION_STARTED = 'progression:transaction:started',
  PROGRESSION_TRANSACTION_COMPLETED = 'progression:transaction:completed',
  PROGRESSION_TRANSACTION_CANCELLED = 'progression:transaction:cancelled',
  PROGRESSION_TRANSACTION_REPAIRED = 'progression:transaction:repaired',
  
  // ===== Debug Events =====
  // Support for debug panel
  DEBUG_COMMAND = 'debug:command',
  
  // ===== Recovery Events =====
  // ADDED: New events for recovery systems
  TRANSITION_RECOVERY = 'system:transition:recovery',
  CONSISTENCY_CHECK = 'system:consistency:check',
  CONSISTENCY_REPAIR = 'system:consistency:repair'
}

// ===== Event Payload Types =====
// These define the structure of data for each event

/**
 * UI Event Payload
 */
export interface UIEventPayload {
  componentId: string;
  action: string;
  metadata?: Record<string, any>;
  position?: { x: number, y: number };
}

/**
 * Dialogue Event Payload
 */
export interface DialogueEventPayload {
  dialogueId: string;
  characterId: string;
  nodeId?: string;
}

/**
 * Dialogue Option Selection Payload
 */
export interface DialogueOptionPayload extends DialogueEventPayload {
  optionId: string;
  responseId: string;
  score?: number;
}

/**
 * Node Completion Payload
 */
export interface NodeCompletionPayload {
  nodeId: string;
  character?: string;
  result?: {
    relationshipChange?: number;
    journalTier?: string;
    isJournalAcquisition?: boolean;
  };
}

/**
 * State Change Payload
 */
export interface StateChangePayload {
  from: string;
  to: string;
  reason?: string;
}

/**
 * Journal Acquisition Payload
 */
export interface JournalAcquisitionPayload {
  tier: 'base' | 'technical' | 'annotated';
  character: string;
  source?: string;
  forced?: boolean;
}

/**
 * Knowledge Gain Payload
 */
export interface KnowledgeGainPayload {
  conceptId: string;
  amount: number;
  domainId?: string;
  character?: string;
  source?: string;
}

/**
 * Knowledge Transfer Payload
 */
export interface KnowledgeTransferPayload {
  conceptIds: string[];
  source: string;
  successful: boolean;
}

/**
 * Transaction Payload
 */
export interface TransactionPayload {
  transactionId: string;
  type: string;
  character?: string;
  nodeId?: string;
  metadata?: Record<string, any>;
  duration?: number;
  stuckDuration?: number;
}

/**
 * Debug Command Payload
 */
export interface DebugCommandPayload {
  command: string;
  params?: Record<string, any>;
}

/**
 * Recovery Event Payload
 * ADDED: New payload type for recovery systems
 */
export interface RecoveryEventPayload {
  type: 'transition' | 'state' | 'journal' | 'knowledge';
  source: string;
  targetState?: string;
  previousState?: string;
  metadata?: Record<string, any>;
  successful: boolean;
  timestamp: number;
}