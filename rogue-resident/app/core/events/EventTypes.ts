// app/core/events/EventTypes.ts
/**
 * Game event type definitions used throughout the application.
 * Centralized to ensure consistency and prevent type errors.
 * 
 * The enum pattern allows for type safety while string values
 * enable easy debugging in console logs and event tracing.
 */

export enum GameEventType {
  // UI Events
  UI_BUTTON_CLICKED = 'ui:button:clicked',
  UI_TOGGLE_CLICKED = 'ui:toggle:clicked',
  UI_CLOSE_CLICKED = 'ui:close:clicked',
  UI_OPTION_SELECTED = 'ui:option:selected',
  UI_NODE_CLICKED = 'ui:node:clicked',
  UI_NODE_HOVERED = 'ui:node:hovered',
  UI_DIALOGUE_ADVANCED = 'ui:dialogue:advanced',
  UI_JOURNAL_OPENED = 'ui:journal:opened',
  UI_JOURNAL_CLOSED = 'ui:journal:closed',
  UI_JOURNAL_PAGE_CHANGED = 'ui:journal:page:changed',
  
  // Visual and Sound Effects
  EFFECT_SOUND_PLAYED = 'effect:sound:played',
  EFFECT_SCREEN_FLASH = 'effect:screen:flash',
  EFFECT_PARTICLE_EMITTED = 'effect:particle:emitted',
  
  // Dialogue Events
  DIALOGUE_STARTED = 'dialogue:started',
  DIALOGUE_OPTION_SELECTED = 'dialogue:option:selected',
  DIALOGUE_COMPLETED = 'dialogue:completed',
  DIALOGUE_SKIPPED = 'dialogue:skipped',
  DIALOGUE_CRITICAL_PATH = 'dialogue:critical:path',
  
  // Challenge Events
  CHALLENGE_STARTED = 'challenge:started',
  CHALLENGE_COMPLETED = 'challenge:completed',
  CHALLENGE_FAILED = 'challenge:failed',
  
  // Map Navigation Events
  NODE_REVEALED = 'map:node:revealed',
  NODE_COMPLETED = 'map:node:completed',
  NODE_LOCKED = 'map:node:locked',
  
  // Game State Events
  GAME_STATE_CHANGED = 'state:state:changed',
  GAME_PHASE_CHANGED = 'state:phase:changed',
  GAME_DAY_STARTED = 'state:day:started',
  GAME_NIGHT_STARTED = 'state:night:started',
  
  // Session Events
  SESSION_STARTED = 'session:started',
  SESSION_ENDED = 'session:ended',
  SESSION_PAUSED = 'session:paused',
  SESSION_RESUMED = 'session:resumed',
  
  // Progression Events
  PROGRESSION_CHECKPOINT = 'progression:checkpoint',
  JOURNAL_ACQUIRED = 'progression:journal:acquired',
  JOURNAL_UPGRADED = 'progression:journal:upgraded',
  KNOWLEDGE_GAINED = 'progression:knowledge:gained',
  
  // Transaction Events
  PROGRESSION_TRANSACTION_STARTED = 'progression:transaction:started',
  PROGRESSION_TRANSACTION_COMPLETED = 'progression:transaction:completed',
  PROGRESSION_TRANSACTION_CANCELLED = 'progression:transaction:cancelled',
  PROGRESSION_TRANSACTION_REPAIRED = 'progression:transaction:repaired',
  
  // Debug Events
  DEBUG_LOG = 'debug:log',
  DEBUG_ERROR = 'debug:error',
  DEBUG_COMMAND = 'debug:command'
}