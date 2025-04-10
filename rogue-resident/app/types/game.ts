// app/types/game.ts
import useEventBus from '../core/events/CentralEventBus'; 
import useGameStateMachine from '../core/statemachine/GameStateMachine';
import { progressionResolver } from '../core/progression/ProgressionResolver';
import useDialogueStateMachine from '../core/dialogue/DialogueStateMachine';
import { GameEventType } from '../core/events/EventTypes';

// --- Core Data Structures ---

export interface Position {
  x: number;
  y: number;
}

// Game-specific enums
export enum GameEvent {
  NODE_INTERACTION = 'NODE_INTERACTION',
  DEBUG_COMMAND = 'DEBUG_COMMAND',
  // Add other events needed by SimplifiedKapoorMap
}

// Map-related types
export interface MapNode {
  id: string;
  x: number;
  y: number;
  label: string;
  type: string;
  connections: string[];
  data: Record<string, any>;
}

export interface NarrativeEvent<T = any> {
  type: GameEventType | string; 
  payload?: T;
}

export interface DialogueChoice {
  text: string;
  nextNodeId: string;
  condition?: string;
  action?: NarrativeEvent;
}

export interface DialogueNode {
  id: string;
  text: string;
  speaker: string;
  mood?: string;
  choices?: DialogueChoice[];
  events?: NarrativeEvent[];
  isPauseNode?: boolean;
  isEndingNode?: boolean;
}

export interface DialogueConfig {
  [dialogueId: string]: {
    startNodeId: string;
    nodes: { [nodeId: string]: DialogueNode };
  };
}

export interface GlobalVariables {
    [key: string]: string | number | boolean;
}

export interface DialogueSystemConfig {
    dialogues: DialogueConfig;
    globalVariables: GlobalVariables;
}

export interface InsightNode {
  id: string;
  label: string;
  description: string;
  category: string;
  connections: string[];
  position: Position;
  isCentral?: boolean;
  unlockCondition?: string;
}

export interface InsightConnection {
  from: string;
  to: string;
  strength?: number;
}

export interface JournalEntry {
  id: string;
  timestamp: Date; 
  title: string;
  content: string;
  tags: string[]; // Add tags property
  category: 'Log' | 'Observation' | 'Personal' | 'Objective';
  isNew?: boolean; // Make optional if needed
}

// --- State Slice Definitions ---

// Game State (Core loop, mode, loading)
export interface GameState {
  stateMachine: typeof useGameStateMachine | null;
  progressionResolver: typeof progressionResolver | null;
  currentMode: 'exploration' | 'dialogue' | 'cutscene' | 'menu' | 'knowledge';
  isLoading: boolean;
  error: string | null;
  currentSystem?: string; // Added for SimplifiedKapoorMap
  currentNode?: string; // Added for SimplifiedKapoorMap
  currentNodeId?: string; // Added for consistency
}

export interface GameStateActions {
  setGameMode: (mode: GameState['currentMode']) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  initializeGame: (initialState: { startingMode?: GameState['currentMode'] }) => void;
}

// Dialogue State
export interface DialogueState {
  dialogueStateMachine: typeof useDialogueStateMachine | null;
  currentDialogueId: string | null;
  currentNodeId: string | null;
  currentSpeaker: string | null;
  currentText: string;
  currentMood: string | null;
  currentChoices: DialogueChoice[];
  isDialogueActive: boolean;
  isDialogueLoading: boolean;
  dialogueError: string | null;
}

export interface DialogueActions {
  initializeDialogueSystem: (config: DialogueSystemConfig) => void;
  startDialogue: (dialogueId: string) => void;
  advanceDialogue: (choiceIndex?: number) => void;
  endDialogue: () => void;
  setCurrentDialogueId: (id: string | null) => void;
}

// Event Bus State
export interface EventBusState {
  instance: typeof useEventBus;
}

export interface EventBusActions {
  emit: <T = any>(eventType: GameEventType | string, payload?: T) => void;
}

// Knowledge State
export interface KnowledgeState {
  knownInsights: { [insightId: string]: InsightNode };
  insightConnections: InsightConnection[];
  unlockedTopics: Set<string>;
  isConstellationVisible: boolean;
  activeInsightId: string | null;
}

export interface KnowledgeActions {
  addInsight: (insightId: string) => void;
  addConnection: (fromId: string, toId: string) => void;
  unlockTopic: (topicId: string) => void;
  setConstellationVisibility: (isVisible: boolean) => void;
  setActiveInsight: (insightId: string | null) => void;
  // Add methods used in SimplifiedKapoorMap
  unlockKnowledge: (knowledgeId: string) => void;
}

// Resource State
export interface ResourceState {
  resources: { [resourceId: string]: number };
}

export interface ResourceActions {
  addResource: (resourceId: string, amount: number) => void;
  setResource: (resourceId: string, amount: number) => void;
  hasEnoughResource: (resourceId: string, amount: number) => boolean;
  resetResources: () => void; // Added for init.ts
}

// Journal State
export interface JournalState {
  entries: JournalEntry[];
  lastEntryTimestamp: Date | null;
  isJournalOpen: boolean;
}

export interface JournalActions {
  addEntry: (entryData: Omit<JournalEntry, 'timestamp' | 'id'>) => void; // Renamed to match usage
  addJournalEntry: (entryData: Omit<JournalEntry, 'timestamp' | 'id'>) => void; // Keep for compatibility
  setJournalOpen: (isOpen: boolean) => void;
}

// --- Combined State ---

export type CombinedState = GameState &
  GameStateActions &
  DialogueState &
  DialogueActions &
  EventBusState &
  EventBusActions &
  KnowledgeState &
  KnowledgeActions &
  ResourceState &
  ResourceActions &
  JournalState &
  JournalActions & {
    handleNarrativeEvent: (event: NarrativeEvent) => void;
  };

// Optional: Type representing only the state properties
export type FullGameState = GameState &
    DialogueState &
    EventBusState &
    KnowledgeState &
    ResourceState &
    JournalState;