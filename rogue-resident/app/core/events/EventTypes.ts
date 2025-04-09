// app/core/events/EventTypes.ts
/**
 * Streamlined Game Event Types for Vertical Slice
 *
 * Focuses on essential events, including specific transition events.
 */

export enum GameEventType {
  // ===== UI Events =====
  UI_BUTTON_CLICKED = 'ui:button:clicked',
  UI_OPTION_SELECTED = 'ui:option:selected',
  UI_NODE_CLICKED = 'ui:node:clicked',

  // ===== Dialogue Events =====
  DIALOGUE_STARTED = 'dialogue:started',
  DIALOGUE_OPTION_SELECTED = 'dialogue:option:selected',
  DIALOGUE_COMPLETED = 'dialogue:completed',
  DIALOGUE_CRITICAL_PATH = 'dialogue:critical:path',
  DIALOGUE_ERROR = 'dialogue:error',

  // ===== Map Navigation Events =====
  NODE_COMPLETED = 'node:completed',

  // ===== Game State Events =====
  GAME_STATE_CHANGED = 'state:state:changed',
  GAME_PHASE_CHANGED = 'state:phase:changed', // General phase change event
  // Specific transition events added:
  TRANSITION_TO_NIGHT_STARTED = 'state:transition:to_night:started',
  TRANSITION_TO_DAY_STARTED = 'state:transition:to_day:started',
  TRANSITION_TO_NIGHT_COMPLETED = 'state:transition:to_night:completed', // When 'night' phase is reached
  TRANSITION_TO_DAY_COMPLETED = 'state:transition:to_day:completed',   // When 'day' phase is reached

  DAY_STARTED = 'day:started',         // Fired when 'day' phase begins
  DAY_COMPLETED = 'day:completed',       // Fired when day completion process *starts*
  NIGHT_STARTED = 'night:started',       // Fired when 'night' phase begins
  NIGHT_COMPLETED = 'night:completed',     // Fired when night completion process *starts*
  SESSION_STARTED = 'session:started',
  SYSTEM_INITIALIZED = 'system:initialized',
  SYSTEM_SHUTDOWN = 'system:shutdown',

  // ===== Progression Events =====
  JOURNAL_ACQUIRED = 'progression:journal:acquired',
  KNOWLEDGE_GAINED = 'progression:knowledge:gained',
  KNOWLEDGE_TRANSFERRED = 'progression:knowledge:transferred',
  CHALLENGE_COMPLETED = 'challenge:completed',

  // ===== Transaction Events =====
  PROGRESSION_TRANSACTION_STARTED = 'progression:transaction:started',
  PROGRESSION_TRANSACTION_COMPLETED = 'progression:transaction:completed',
  PROGRESSION_TRANSACTION_CANCELLED = 'progression:transaction:cancelled',
  PROGRESSION_TRANSACTION_REPAIRED = 'progression:transaction:repaired',

  // ===== Debug Events =====
  DEBUG_COMMAND = 'debug:command',

  // ===== Recovery Events =====
  TRANSITION_RECOVERY = 'system:transition:recovery',
  CONSISTENCY_CHECK = 'system:consistency:check',
  CONSISTENCY_REPAIR = 'system:consistency:repair',

  // Resource Events (assuming needed by other systems)
  RESOURCE_CHANGED = 'resource:changed',
  STRATEGIC_ACTION = 'resource:action'
}

// ===== Event Payload Types =====

export interface UIEventPayload {
  componentId: string;
  action: string;
  metadata?: Record<string, any>;
  position?: { x: number, y: number };
}

export interface DialogueEventPayload {
  dialogueId: string;
  characterId: string;
  nodeId?: string;
}

export interface DialogueOptionPayload extends DialogueEventPayload {
  optionId: string;
  responseId: string;
  score?: number;
}

export interface NodeCompletionPayload {
  nodeId: string;
  character?: string;
  result?: {
    relationshipChange?: number;
    journalTier?: string;
    isJournalAcquisition?: boolean;
  };
}

export interface StateChangePayload {
  from: string; // Can be GameState or GamePhase
  to: string;   // Can be GameState or GamePhase
  reason?: string;
}

export interface JournalAcquisitionPayload {
  tier: 'base' | 'technical' | 'annotated';
  character: string;
  source?: string;
  forced?: boolean;
}

export interface KnowledgeGainPayload {
  conceptId: string;
  amount: number;
  domainId?: string;
  character?: string;
  source?: string;
}

export interface KnowledgeTransferPayload {
  conceptIds: string[];
  source: string;
  successful: boolean;
}

export interface TransactionPayload {
  transactionId: string;
  type: string;
  character?: string;
  nodeId?: string;
  metadata?: Record<string, any>;
  duration?: number;
  stuckDuration?: number;
}

export interface DebugCommandPayload {
  command: string;
  params?: Record<string, any>;
}

export interface RecoveryEventPayload {
  type: 'transition' | 'state' | 'journal' | 'knowledge';
  source: string;
  targetState?: string;
  previousState?: string;
  metadata?: Record<string, any>;
  successful: boolean;
  timestamp: number;
}

// Payload for Resource Changed event (assuming structure from resourceStore)
export interface ResourceChangedPayload {
  resourceType: 'insight' | 'momentum';
  previousValue: number;
  newValue: number;
  change: number;
  source?: string;
  consecutive?: number; // Only for momentum
  thresholdProximity?: Record<string, number>; // Only for insight
}

// Payload for Strategic Action event (assuming structure from resourceStore)
export interface StrategicActionPayload {
  actionType: string; // Should match StrategicActionType
  state: 'activated' | 'completed' | 'canceled';
  successful?: boolean; // Only for 'completed' state
  outcome?: 'success' | 'failure'; // Only for 'completed' state
  insightCost?: number;
  momentumRequired?: number;
  insightRefunded?: number; // Only for 'canceled' state
  context?: any;
}