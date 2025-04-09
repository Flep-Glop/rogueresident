// Correct imports based on latest understanding
import ActualCentralEventBus from '../core/events/CentralEventBus'; // Default import
import { GameStateMachine } from '../core/statemachine/GameStateMachine'; // Assuming class export
import { progressionResolver } from '../core/progression/ProgressionResolver'; // Assuming instance export
import { DialogueStateMachine } from '../core/dialogue/DialogueStateMachine'; // Assuming class export
import { NarrativeEventType } from '../core/events/EventTypes'; // Assuming 'NarrativeEventType' is the correct export name

// --- Core Data Structures ---

export interface Position {
  x: number;
  y: number;
}

// Define NarrativeEvent structure using the assumed NarrativeEventType import
export interface NarrativeEvent<T = any> {
  type: NarrativeEventType | string; // Use assumed NarrativeEventType import
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
  timestamp: Date; // Keep as Date
  title: string;
  content: string;
  relatedInsights?: string[];
  category: 'Log' | 'Observation' | 'Personal' | 'Objective';
}

// --- State Slice Definitions ---

// Define instance types based on the assumed class exports
type GameStateMachineInstance = GameStateMachine;
type DialogueStateMachineInstance = DialogueStateMachine;
// Define instance type based on the type of the exported instance
type ProgressionResolverInstance = typeof progressionResolver;


// Game State (Core loop, mode, loading)
export interface GameState {
  // Use the correctly defined instance types
  stateMachine: GameStateMachineInstance | null;
  progressionResolver: ProgressionResolverInstance | null; // Use the typeof instance type
  currentMode: 'exploration' | 'dialogue' | 'cutscene' | 'menu' | 'knowledge';
  isLoading: boolean;
  error: string | null;
}

export interface GameStateActions {
  setGameMode: (mode: GameState['currentMode']) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  initializeGame: (initialState: { startingMode?: GameState['currentMode'] }) => void;
}

// Dialogue State
export interface DialogueState {
  // Use the correctly defined instance type
  dialogueStateMachine: DialogueStateMachineInstance | null;
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
  // Use the actual class name for the instance type
  instance: ActualCentralEventBus;
}

export interface EventBusActions {
  // Use assumed NarrativeEventType import
  emit: <T = any>(eventType: NarrativeEventType | string, payload?: T) => void;
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
}

// Resource State
export interface ResourceState {
  resources: { [resourceId: string]: number };
}

export interface ResourceActions {
  addResource: (resourceId: string, amount: number) => void;
  setResource: (resourceId: string, amount: number) => void;
  hasEnoughResource: (resourceId: string, amount: number) => boolean;
}

// Journal State
export interface JournalState {
  entries: JournalEntry[];
  lastEntryTimestamp: Date | null;
  isJournalOpen: boolean;
}

export interface JournalActions {
  addJournalEntry: (entryData: Omit<JournalEntry, 'timestamp' | 'id'>) => void;
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

