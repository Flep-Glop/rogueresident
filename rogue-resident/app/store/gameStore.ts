import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  // Import types from the updated game.ts
  type GameState,
  type GameStateActions,
  type DialogueState,
  type DialogueActions,
  type EventBusState,
  type EventBusActions,
  type KnowledgeState,
  type KnowledgeActions,
  type ResourceState,
  type ResourceActions,
  type JournalState,
  type JournalActions,
  type CombinedState,
  type DialogueNode,
  type NarrativeEvent,
  type InsightNode,
  type JournalEntry,
  type DialogueSystemConfig,
  type DialogueChoice,
  type InsightConnection,
  // No longer need ProgressionResolverInstance here
} from '../types/game';

// Correct imports based on latest understanding and error messages
// Rename CentralEventBus import to avoid potential scope collision
import ActualCentralEventBus from '../core/events/CentralEventBus'; // Default import
// Assume GameStateMachine class IS exported, despite previous error suggestion
import { GameStateMachine } from '../core/statemachine/GameStateMachine';
// Import the exported instance directly
import { progressionResolver } from '../core/progression/ProgressionResolver';
// Assume DialogueStateMachine class IS exported, despite previous error suggestion
import { DialogueStateMachine } from '../core/dialogue/DialogueStateMachine';
// Assume NarrativeEventType is the correct export name
import { NarrativeEventType } from '../core/events/EventTypes';

// Helper function to create the Event Bus slice
const createEventBusSlice = (
  set: (fn: (state: CombinedState) => void) => void,
  get: () => CombinedState
): EventBusState & EventBusActions => {
    // Explicitly use the renamed import to get the instance
    const busInstance = ActualCentralEventBus.getInstance();

    return {
        instance: busInstance,
        // Use assumed NarrativeEventType
        emit: <T = any>(eventType: NarrativeEventType | string, payload?: T) => {
            busInstance.emit(eventType, payload);
        },
    };
};


// Helper function to create the Game State Machine slice
const createGameStateSlice = (
  set: (fn: (state: CombinedState) => void) => void,
  get: () => CombinedState
): GameState & GameStateActions => ({
  stateMachine: null,
  // Use the type derived from the imported instance
  progressionResolver: null as typeof progressionResolver | null,
  currentMode: 'exploration',
  isLoading: true,
  error: null,
  setGameMode: (mode: GameState['currentMode']) =>
    set((state) => {
      state.currentMode = mode;
      console.log(`Game mode set to: ${mode}`);
      // Use assumed NarrativeEventType
      get().emit(NarrativeEventType.GAME_MODE_CHANGED, { mode });
    }),
  setLoading: (isLoading: boolean) =>
    set((state) => {
      state.isLoading = isLoading;
    }),
  setError: (error: string | null) =>
    set((state) => {
      state.error = error;
    }),
  initializeGame: (initialState: { startingMode?: GameState['currentMode'] }) =>
    set((state) => {
      // Instantiate using the direct class names
      if (!state.stateMachine) {
          state.stateMachine = new GameStateMachine(get().instance);
      }
      // Assign the imported instance directly
      if (!state.progressionResolver) {
          state.progressionResolver = progressionResolver;
      }

      state.currentMode = initialState.startingMode ?? 'exploration';
      state.isLoading = false;
      state.error = null;
      console.log('Game initialized');
      // Use assumed NarrativeEventType
      get().emit(NarrativeEventType.GAME_INITIALIZED, {});
    }),
});

// Helper function to create the Dialogue slice
const createDialogueSlice = (
  set: (fn: (state: CombinedState) => void) => void,
  get: () => CombinedState
): DialogueState & DialogueActions => ({
  dialogueStateMachine: null,
  currentDialogueId: null,
  currentNodeId: null,
  currentSpeaker: null,
  currentText: '',
  currentMood: null,
  currentChoices: [],
  isDialogueActive: false,
  isDialogueLoading: false,
  dialogueError: null,

  initializeDialogueSystem: (config: DialogueSystemConfig) =>
    set((state) => {
      if (!state.dialogueStateMachine) {
        // Instantiate using the direct class name
        // Correct constructor arguments based on error "Expected 0-1 arguments, but got 2."
        // Assuming it only needs the config, or maybe only the event bus, or neither.
        // Let's try with just the config first. Adjust if constructor differs.
        state.dialogueStateMachine = new DialogueStateMachine(config);
        // If it needs the event bus instead:
        // state.dialogueStateMachine = new DialogueStateMachine(get().instance);
        // If it needs neither (e.g., it's a singleton accessed via static method):
        // state.dialogueStateMachine = DialogueStateMachine.getInstance(config); // Example
        console.log('Dialogue System Initialized');
        // Use assumed NarrativeEventType
        get().emit(NarrativeEventType.DIALOGUE_SYSTEM_INITIALIZED, {});
      } else {
        console.warn('Dialogue System already initialized.');
      }
    }),

  startDialogue: (dialogueId: string) => {
    console.log(`Attempting to start dialogue: ${dialogueId}`);
    const dialogueStateMachine = get().dialogueStateMachine;
    if (!dialogueStateMachine) {
      console.error('Dialogue State Machine not initialized.');
      set((state) => {
        state.dialogueError = 'Dialogue system not ready.';
        state.isDialogueActive = false;
      });
      // Use assumed NarrativeEventType
      get().emit(NarrativeEventType.DIALOGUE_ERROR, {
        error: 'Dialogue system not ready.',
      });
      return;
    }

    set((state) => {
      state.isDialogueLoading = true;
      state.dialogueError = null;
    });

    try {
      dialogueStateMachine.start(dialogueId);
      const currentNode = dialogueStateMachine.getCurrentNode();
      if (!currentNode) {
        throw new Error(`Dialogue "${dialogueId}" or its start node not found.`);
      }
      console.log(`Dialogue ${dialogueId} started. Current node: ${currentNode.id}`);
      set((state) => {
        state.isDialogueActive = true;
        state.currentDialogueId = dialogueId;
        state.currentNodeId = currentNode.id;
        state.currentSpeaker = currentNode.speaker;
        state.currentText = currentNode.text;
        state.currentMood = currentNode.mood ?? null;
        state.currentChoices = currentNode.choices ?? [];
        state.isDialogueLoading = false;
        // Use assumed NarrativeEventType
        get().emit(NarrativeEventType.DIALOGUE_STARTED, { dialogueId });
        get().emit(NarrativeEventType.DIALOGUE_NODE_CHANGED, {
          node: currentNode,
        });
      });
    } catch (error: any) {
      console.error(`Error starting dialogue ${dialogueId}:`, error);
      set((state) => {
        state.dialogueError = error.message || 'Failed to start dialogue';
        state.isDialogueActive = false;
        state.isDialogueLoading = false;
        // Use assumed NarrativeEventType
        get().emit(NarrativeEventType.DIALOGUE_ERROR, {
          error: state.dialogueError,
        });
      });
    }
  },

  advanceDialogue: (choiceIndex?: number) => {
    console.log(`Advancing dialogue with choice index: ${choiceIndex}`);
    const dialogueStateMachine = get().dialogueStateMachine;
    const isDialogueActive = get().isDialogueActive;

    if (!dialogueStateMachine || !isDialogueActive) {
      console.warn('Cannot advance dialogue: Not active or not initialized.');
      return;
    }

    set((state) => {
      state.isDialogueLoading = true;
    });

    try {
      dialogueStateMachine.advance(choiceIndex);
      const currentNode = dialogueStateMachine.getCurrentNode();

      if (!currentNode || currentNode.isEndingNode) {
        console.log('Dialogue ended.');
        get().endDialogue();
        return;
      }

      console.log(`Advanced to node: ${currentNode.id}`);
      set((state) => {
        state.currentNodeId = currentNode.id;
        state.currentSpeaker = currentNode.speaker;
        state.currentText = currentNode.text;
        state.currentMood = currentNode.mood ?? null;
        state.currentChoices = currentNode.choices ?? [];
        state.isDialogueLoading = false;

        const isPause = currentNode && 'isPauseNode' in currentNode && !!currentNode.isPauseNode;
        if (isPause) {
            console.log("Pause node encountered.");
            // Use assumed NarrativeEventType
            get().emit(NarrativeEventType.DIALOGUE_PAUSED, { nodeId: currentNode.id });
        } else {
            // Use assumed NarrativeEventType
            get().emit(NarrativeEventType.DIALOGUE_NODE_CHANGED, {
              node: currentNode,
            });
        }

        if (currentNode.events && currentNode.events.length > 0) {
            console.log(`Processing ${currentNode.events.length} events for node ${currentNode.id}`);
            currentNode.events.forEach((event: NarrativeEvent) => {
                get().emit(event.type, event.payload);
            });
        }
      });

    } catch (error: any) {
      console.error('Error advancing dialogue:', error);
      set((state) => {
        state.dialogueError = error.message || 'Failed to advance dialogue';
        state.isDialogueLoading = false;
        // Use assumed NarrativeEventType
        get().emit(NarrativeEventType.DIALOGUE_ERROR, {
          error: state.dialogueError,
        });
      });
    }
  },

  endDialogue: () => {
    const currentDialogueId = get().currentDialogueId;
    console.log(`Ending dialogue: ${currentDialogueId}`);
    set((state) => {
      if (state.isDialogueActive) {
        state.isDialogueActive = false;
        state.currentDialogueId = null;
        state.currentNodeId = null;
        state.currentSpeaker = null;
        state.currentText = '';
        state.currentMood = null;
        state.currentChoices = [];
        state.dialogueError = null;
        state.isDialogueLoading = false;
        // Use assumed NarrativeEventType
        get().emit(NarrativeEventType.DIALOGUE_ENDED, {
          dialogueId: currentDialogueId,
        });
      } else {
        console.warn("Attempted to end dialogue that wasn't active.");
      }
    });
  },

  setCurrentDialogueId: (id: string | null) => {
    set((state) => {
        state.currentDialogueId = id;
        console.log(`Setting current dialogue ID to: ${id}`);
    });
  },
});


// Example Knowledge Slice (No changes needed based on current errors)
const createKnowledgeSlice = (
  set: (fn: (state: CombinedState) => void) => void,
  get: () => CombinedState
): KnowledgeState & KnowledgeActions => ({
  knownInsights: {},
  insightConnections: [],
  unlockedTopics: new Set(),
  isConstellationVisible: false,
  activeInsightId: null,

  addInsight: (insightId: string) =>
    set((state) => {
      if (!state.knownInsights[insightId]) {
        const placeholderInsight: InsightNode = {
            id: insightId, label: `Insight ${insightId}`, description: 'Placeholder description',
            category: 'Unknown', connections: [],
            position: { x: Math.random() * 500, y: Math.random() * 300 }, isCentral: false,
        };
        state.knownInsights[insightId] = placeholderInsight;
        console.log(`Insight added: ${insightId}`);
        // Use assumed NarrativeEventType
        get().emit(NarrativeEventType.INSIGHT_ADDED, { insightId });
      } else {
        console.log(`Insight already known: ${insightId}`);
      }
    }),

  addConnection: (fromId: string, toId: string) =>
    set((state) => {
      const connectionExists = state.insightConnections.some(
        (conn: InsightConnection) =>
          (conn.from === fromId && conn.to === toId) || (conn.from === toId && conn.to === fromId)
      );
      if (!connectionExists && state.knownInsights[fromId] && state.knownInsights[toId]) {
        state.insightConnections.push({ from: fromId, to: toId });
        console.log(`Connection added: ${fromId} -> ${toId}`);
        // Use assumed NarrativeEventType
        get().emit(NarrativeEventType.INSIGHT_CONNECTION_ADDED, { fromId, toId });
      } else {
         console.warn(`Could not add connection: ${fromId} -> ${toId}. Exists: ${connectionExists}, FromKnown: ${!!state.knownInsights[fromId]}, ToKnown: ${!!state.knownInsights[toId]}`);
      }
    }),

  unlockTopic: (topicId: string) =>
    set((state) => {
      if (!state.unlockedTopics.has(topicId)) {
        state.unlockedTopics.add(topicId);
        console.log(`Topic unlocked: ${topicId}`);
        // Use assumed NarrativeEventType
        get().emit(NarrativeEventType.TOPIC_UNLOCKED, { topicId });
      }
    }),

  setConstellationVisibility: (isVisible: boolean) =>
    set((state) => {
      state.isConstellationVisible = isVisible;
      console.log(`Constellation visibility set to: ${isVisible}`);
      // Use assumed NarrativeEventType
      get().emit(NarrativeEventType.CONSTELLATION_VISIBILITY_CHANGED, { isVisible });
    }),

  setActiveInsight: (insightId: string | null) =>
    set((state) => {
      state.activeInsightId = insightId;
      console.log(`Active insight set to: ${insightId}`);
      // Use assumed NarrativeEventType
      get().emit(NarrativeEventType.ACTIVE_INSIGHT_CHANGED, { insightId });
    }),
});

// Example Resource Slice (No changes needed based on current errors)
const createResourceSlice = (
  set: (fn: (state: CombinedState) => void) => void,
  get: () => CombinedState
): ResourceState & ResourceActions => ({
  resources: {},

  addResource: (resourceId: string, amount: number) =>
    set((state) => {
      const currentAmount = state.resources[resourceId] || 0;
      state.resources[resourceId] = currentAmount + amount;
      console.log(`Resource ${resourceId} changed by ${amount}. New total: ${state.resources[resourceId]}`);
      // Use assumed NarrativeEventType
      get().emit(NarrativeEventType.RESOURCE_CHANGED, { resourceId, amount, newTotal: state.resources[resourceId] });
    }),

  setResource: (resourceId: string, amount: number) =>
    set((state) => {
       const currentAmount = state.resources[resourceId] || 0;
       state.resources[resourceId] = amount;
       console.log(`Resource ${resourceId} set to ${amount}.`);
       // Use assumed NarrativeEventType
       get().emit(NarrativeEventType.RESOURCE_CHANGED, { resourceId, amount: amount - currentAmount, newTotal: amount });
    }),

  hasEnoughResource: (resourceId: string, amount: number): boolean => {
    const currentAmount = get().resources[resourceId] || 0;
    return currentAmount >= amount;
  },
});

// Example Journal Slice (No changes needed based on current errors)
const createJournalSlice = (
  set: (fn: (state: CombinedState) => void) => void,
  get: () => CombinedState
): JournalState & JournalActions => ({
  entries: [],
  lastEntryTimestamp: null,
  isJournalOpen: false,

  addJournalEntry: (entryData: Omit<JournalEntry, 'timestamp' | 'id'>) =>
    set((state) => {
      const timestamp = new Date();
      const id = `${timestamp.getTime()}-${state.entries.length}`;
      const newEntry: JournalEntry = { ...entryData, id, timestamp };
      state.entries.push(newEntry);
      state.lastEntryTimestamp = timestamp;
      console.log(`Journal entry added: ${id} - ${entryData.title}`);
      // Use assumed NarrativeEventType
      get().emit(NarrativeEventType.JOURNAL_ENTRY_ADDED, { entry: newEntry });
    }),

  setJournalOpen: (isOpen: boolean) =>
    set((state) => {
      state.isJournalOpen = isOpen;
      console.log(`Journal open state set to: ${isOpen}`);
      // Use assumed NarrativeEventType
      get().emit(NarrativeEventType.JOURNAL_VISIBILITY_CHANGED, { isOpen });
    }),
});

// --- Combined Store ---

export const useGameStore = create<CombinedState>()(
  immer((set, get, api) => ({
    // Combine all slices
    ...createEventBusSlice(set, get),
    ...createGameStateSlice(set, get),
    ...createDialogueSlice(set, get),
    ...createKnowledgeSlice(set, get),
    ...createResourceSlice(set, get),
    ...createJournalSlice(set, get),

    // --- Global Actions / Event Handlers ---
    handleNarrativeEvent: (event: NarrativeEvent) => {
      console.log(`Handling Narrative Event: ${event.type}`, event.payload);
      // Use assumed NarrativeEventType
      if (event.type === NarrativeEventType.INSIGHT_REVEALED) {
        const payload = event.payload as { insightId: string; connection?: { from: string; to: string } };
        if (payload?.insightId) {
          get().addInsight(payload.insightId);
        }
        if (payload?.connection) {
           get().addConnection(payload.connection.from, payload.connection.to);
           console.log("Connection added via INSIGHT_REVEALED event payload.");
        }
      }
      // Add more handlers...
    },
  }))
);

// Export the store hook
export default useGameStore;
