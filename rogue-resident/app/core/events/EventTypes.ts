// app/core/events/EventTypes.ts
/**
 * Unified Event Type System for Rogue Resident
 * 
 * This system consolidates all event types into a single comprehensive enum
 * while maintaining backward compatibility with both GameEventType and NarrativeEventType
 * references throughout the codebase.
 */

// Main event type enum that includes all possible events
export enum GameEventType {
  // ===== Core Game Flow Events =====
  GAME_INITIALIZED = 'game:initialized',
  GAME_MODE_CHANGED = 'game:mode:changed',
  SESSION_STARTED = 'session:started',
  SYSTEM_INITIALIZED = 'system:initialized',
  SYSTEM_SHUTDOWN = 'system:shutdown',

  // ===== UI Interaction Events =====
  UI_BUTTON_CLICKED = 'ui:button:clicked',
  UI_OPTION_SELECTED = 'ui:option:selected',
  UI_NODE_CLICKED = 'ui:node:clicked',
  
  // ===== Dialogue System Events =====
  DIALOGUE_SYSTEM_INITIALIZED = 'dialogue:system:initialized',
  DIALOGUE_STARTED = 'dialogue:started',
  DIALOGUE_PAUSED = 'dialogue:paused',
  DIALOGUE_RESUMED = 'dialogue:resumed',
  DIALOGUE_NODE_CHANGED = 'dialogue:node:changed',
  DIALOGUE_OPTION_SELECTED = 'dialogue:option:selected',
  DIALOGUE_ENDED = 'dialogue:ended',
  DIALOGUE_COMPLETED = 'dialogue:completed',
  DIALOGUE_CRITICAL_PATH = 'dialogue:critical:path',
  DIALOGUE_ERROR = 'dialogue:error',

  // ===== Map & Navigation Events =====
  NODE_CLICKED = 'node:clicked',
  NODE_COMPLETED = 'node:completed',
  NODE_UNLOCKED = 'node:unlocked',
  NODE_LOCKED = 'node:locked',

  // ===== Game State Events =====
  GAME_STATE_CHANGED = 'state:state:changed',
  GAME_PHASE_CHANGED = 'state:phase:changed',
  
  // Specific transition events
  TRANSITION_TO_NIGHT_STARTED = 'state:transition:to_night:started',
  TRANSITION_TO_DAY_STARTED = 'state:transition:to_day:started',
  TRANSITION_TO_NIGHT_COMPLETED = 'state:transition:to_night:completed',
  TRANSITION_TO_DAY_COMPLETED = 'state:transition:to_day:completed',

  // Day/night cycle events
  DAY_STARTED = 'day:started',
  DAY_COMPLETED = 'day:completed',
  NIGHT_STARTED = 'night:started',
  NIGHT_COMPLETED = 'night:completed',

  // ===== Knowledge & Journal Events =====
  INSIGHT_REVEALED = 'knowledge:insight:revealed',
  INSIGHT_CONNECTED = 'knowledge:insight:connected',
  CONSTELLATION_UPDATED = 'knowledge:constellation:updated',
  JOURNAL_ACQUIRED = 'journal:acquired',
  JOURNAL_ENTRY_TRIGGERED = 'journal:entry:triggered',
  JOURNAL_ENTRY_ADDED = 'journal:entry:added',
  JOURNAL_OPENED = 'journal:opened',
  JOURNAL_CLOSED = 'journal:closed',

  // ===== Progression Events =====
  KNOWLEDGE_GAINED = 'progression:knowledge:gained',
  KNOWLEDGE_TRANSFERRED = 'progression:knowledge:transferred',
  CHALLENGE_COMPLETED = 'challenge:completed',
  CHALLENGE_FAILED = 'challenge:failed',
  MASTERY_INCREASED = 'progression:mastery:increased',
  DOMAIN_UNLOCKED = 'progression:domain:unlocked',

  // ===== Resource Events =====
  RESOURCE_CHANGED = 'resource:changed',
  INSIGHT_GAINED = 'resource:insight:gained',
  INSIGHT_SPENT = 'resource:insight:spent',
  MOMENTUM_INCREASED = 'resource:momentum:increased',
  MOMENTUM_RESET = 'resource:momentum:reset',
  STRATEGIC_ACTION_AVAILABLE = 'resource:action:available',
  STRATEGIC_ACTION_ACTIVATED = 'resource:action:activated',
  STRATEGIC_ACTION_COMPLETED = 'resource:action:completed',
  STRATEGIC_ACTION_FAILED = 'resource:action:failed',

  // ===== Transaction Events =====
  PROGRESSION_TRANSACTION_STARTED = 'progression:transaction:started',
  PROGRESSION_TRANSACTION_COMPLETED = 'progression:transaction:completed',
  PROGRESSION_TRANSACTION_CANCELLED = 'progression:transaction:cancelled',
  PROGRESSION_TRANSACTION_REPAIRED = 'progression:transaction:repaired',

  // ===== Recovery & Debug Events =====
  DEBUG_COMMAND = 'debug:command',
  TRANSITION_RECOVERY = 'system:transition:recovery',
  CONSISTENCY_CHECK = 'system:consistency:check',
  CONSISTENCY_REPAIR = 'system:consistency:repair',
  ERROR_LOGGED = 'system:error:logged'
}

// For backward compatibility, create a type alias for NarrativeEventType
// This allows existing code to keep working while we migrate
export type NarrativeEventType = GameEventType;
// Export a constant for full compatibility with existing code
export const NarrativeEventType = GameEventType;

// ===== Event Payload Type Definitions =====

export interface UIEventPayload {
  componentId: string;
  action: string;
  metadata?: Record<string, any>;
  position?: { x: number, y: number };
}

export interface DialogueEventPayload {
  dialogueId: string;
  characterId?: string;
  speaker?: string;
  nodeId?: string;
}

export interface DialogueNodePayload extends DialogueEventPayload {
  node: {
    id: string;
    text: string;
    speaker?: string;
    mood?: string;
    choices?: any[];
  };
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

export interface JournalEntryPayload {
  title?: string;
  content?: string;
  topicId?: string;
  character?: string;
  tags?: string[];
  type?: string;
  metadata?: Record<string, any>;
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

export interface InsightRevealedPayload {
  insightId: string;
  connection?: {
    from: string;
    to: string;
    strength?: number;
  };
  domain?: string;
  isNewDiscovery?: boolean;
}

export interface ResourceChangedPayload {
  resourceType: 'insight' | 'momentum';
  previousValue: number;
  newValue: number;
  change: number;
  source?: string;
  consecutive?: number; // Only for momentum
  thresholdProximity?: Record<string, number>; // Only for insight
}

export interface StrategicActionPayload {
  actionType: string;
  state: 'activated' | 'completed' | 'canceled';
  successful?: boolean; // Only for 'completed' state
  outcome?: 'success' | 'failure'; // Only for 'completed' state
  insightCost?: number;
  momentumRequired?: number;
  insightRefunded?: number; // Only for 'canceled' state
  context?: any;
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

// Type guard to check if an event is a specific game event type
export function isGameEventType(event: string, type: GameEventType): boolean {
  return event === type;
}