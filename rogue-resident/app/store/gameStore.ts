import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  // Import types using the correct path alias
  type GameState,
  type GameStateActions,
  type DialogueState,
  type DialogueActions,
  type EventBusState,
  type EventBusActions,
  type KnowledgeState, // Assuming this type is now exported or defined locally if needed
  type KnowledgeActions, // Assuming this type is now exported or defined locally if needed
  type ResourceState, // Assuming this type is now exported or defined locally if needed
  type ResourceActions, // Assuming this type is now exported or defined locally if needed
  type JournalState, // Assuming this type is now exported or defined locally if needed
  type JournalActions, // Assuming this type is now exported or defined locally if needed
  type CombinedState,
  type DialogueNode,
  type NarrativeEvent,
  type InsightNode,
  type JournalEntry, // Ensure this type definition is consistent
  type DialogueSystemConfig,
  type DialogueChoice,
  type InsightConnection,
} from '@/app/types/game'; // Use path alias

// Correct imports based on latest understanding and error messages
import ActualCentralEventBus, { safeDispatch } from '@/app/core/events/CentralEventBus'; // Use path alias
import { GameStateMachine } from '@/app/core/statemachine/GameStateMachine'; // Use path alias
import { progressionResolver } from '@/app/core/progression/ProgressionResolver'; // Use path alias
import { DialogueStateMachine } from '@/app/core/dialogue/DialogueStateMachine'; // Use path alias
import { NarrativeEventType } from '@/app/core/events/EventTypes'; // Use path alias

// Import other stores if needed for actions
import { useKnowledgeStore } from './knowledgeStore';
import { useJournalStore } from './journalStore';

// Helper function to create the Event Bus slice (assuming EventBusState/Actions are correctly defined in game.ts)
const createEventBusSlice = (
  set: (fn: (state: CombinedState) => void) => void,
  get: () => CombinedState
): EventBusState & EventBusActions => {
    const busInstance = ActualCentralEventBus.getInstance(); // Get singleton instance

    return {
        instance: busInstance,
        emit: <T = any>(eventType: NarrativeEventType | string, payload?: T) => {
            // Use safeDispatch for robustness
            safeDispatch(eventType as GameEventType, payload, 'gameStore.eventBusSlice');
        },
    };
};


// Helper function to create the Game State Machine slice
const createGameStateSlice = (
  set: (fn: (state: CombinedState) => void) => void,
  get: () => CombinedState
): GameState & GameStateActions => ({
  stateMachine: null, // Will be instantiated in initializeGame
  progressionResolver: null, // Will be assigned in initializeGame
  currentMode: 'exploration',
  isLoading: true,
  error: null,
  setGameMode: (mode: GameState['currentMode']) =>
    set((state) => {
      state.currentMode = mode;
      console.log(`Game mode set to: ${mode}`);
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
  // Updated initializeGame to match type definition
  initializeGame: (initialState: { startingMode?: GameState['currentMode'] }) =>
    set((state) => {
      // Instantiate GameStateMachine here if not already done
      if (!state.stateMachine) {
          // Assuming GameStateMachine constructor takes the event bus instance
          state.stateMachine = new GameStateMachine(get().instance);
      }
      // Assign the imported progressionResolver instance
      if (!state.progressionResolver) {
          state.progressionResolver = progressionResolver;
      }

      state.currentMode = initialState.startingMode ?? 'exploration';
      state.isLoading = false;
      state.error = null;
      console.log('Game initialized via gameStore');
      get().emit(NarrativeEventType.GAME_INITIALIZED, {});
    }),
});

// Helper function to create the Dialogue slice
const createDialogueSlice = (
  set: (fn: (state: CombinedState) => void) => void,
  get: () => CombinedState
): DialogueState & DialogueActions => ({
  dialogueStateMachine: null, // Will be instantiated in initializeDialogueSystem
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
        // Assuming DialogueStateMachine constructor takes the config
        state.dialogueStateMachine = new DialogueStateMachine(config);
        console.log('Dialogue System Initialized via gameStore');
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
      get().emit(NarrativeEventType.DIALOGUE_ERROR, { error: 'Dialogue system not ready.' });
      return;
    }

    set((state) => {
      state.isDialogueLoading = true;
      state.dialogueError = null;
    });

    try {
      dialogueStateMachine.start(dialogueId); // Use the instance method
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
      });
      get().emit(NarrativeEventType.DIALOGUE_STARTED, { dialogueId });
      get().emit(NarrativeEventType.DIALOGUE_NODE_CHANGED, { node: currentNode });

    } catch (error: any) {
      console.error(`Error starting dialogue ${dialogueId}:`, error);
      set((state) => {
        state.dialogueError = error.message || 'Failed to start dialogue';
        state.isDialogueActive = false;
        state.isDialogueLoading = false;
      });
      get().emit(NarrativeEventType.DIALOGUE_ERROR, { error: state.dialogueError });
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

    set((state) => { state.isDialogueLoading = true; });

    try {
      dialogueStateMachine.advance(choiceIndex); // Use the instance method
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
      });

      const isPause = currentNode && 'isPauseNode' in currentNode && !!currentNode.isPauseNode;
      if (isPause) {
          console.log("Pause node encountered.");
          get().emit(NarrativeEventType.DIALOGUE_PAUSED, { nodeId: currentNode.id });
      } else {
          get().emit(NarrativeEventType.DIALOGUE_NODE_CHANGED, { node: currentNode });
      }

      if (currentNode.events && currentNode.events.length > 0) {
          console.log(`Processing ${currentNode.events.length} events for node ${currentNode.id}`);
          currentNode.events.forEach((event: NarrativeEvent) => {
              // Handle event directly or emit it for other systems
              get().handleNarrativeEvent(event); // Call internal handler
              // OR: get().emit(event.type, event.payload); // Emit for external listeners
          });
      }

    } catch (error: any) {
      console.error('Error advancing dialogue:', error);
      set((state) => {
        state.dialogueError = error.message || 'Failed to advance dialogue';
        state.isDialogueLoading = false;
      });
       get().emit(NarrativeEventType.DIALOGUE_ERROR, { error: state.dialogueError });
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
        // ... reset other dialogue state properties ...
        state.dialogueError = null;
        state.isDialogueLoading = false;
      } else {
        console.warn("Attempted to end dialogue that wasn't active.");
      }
    });
    get().emit(NarrativeEventType.DIALOGUE_ENDED, { dialogueId: currentDialogueId });
  },

  setCurrentDialogueId: (id: string | null) => {
    set((state) => { state.currentDialogueId = id; });
  },
});


// --- Placeholder Slices (Implement fully based on types/game.ts) ---
// These need to be fully implemented based on the definitions in types/game.ts
// and the actual logic required in knowledgeStore.ts, resourceStore.ts, journalStore.ts

const createKnowledgeSlice = (
  set: (fn: (state: CombinedState) => void) => void,
  get: () => CombinedState
): KnowledgeState & KnowledgeActions => ({
  // Placeholder state and actions - implement fully
  knownInsights: {},
  insightConnections: [],
  unlockedTopics: new Set(),
  isConstellationVisible: false,
  activeInsightId: null,
  addInsight: (insightId: string) => { console.log('addInsight called', insightId); /* Implement */ },
  addConnection: (fromId: string, toId: string) => { console.log('addConnection called', fromId, toId); /* Implement */ },
  unlockTopic: (topicId: string) => { console.log('unlockTopic called', topicId); /* Implement */ },
  setConstellationVisibility: (isVisible: boolean) => { console.log('setConstellationVisibility called', isVisible); /* Implement */ },
  setActiveInsight: (insightId: string | null) => { console.log('setActiveInsight called', insightId); /* Implement */ },
});

const createResourceSlice = (
  set: (fn: (state: CombinedState) => void) => void,
  get: () => CombinedState
): ResourceState & ResourceActions => ({
  // Placeholder state and actions - implement fully
  resources: {},
  addResource: (resourceId: string, amount: number) => { console.log('addResource called', resourceId, amount); /* Implement */ },
  setResource: (resourceId: string, amount: number) => { console.log('setResource called', resourceId, amount); /* Implement */ },
  hasEnoughResource: (resourceId: string, amount: number): boolean => { console.log('hasEnoughResource called', resourceId, amount); return false; /* Implement */ },
});

const createJournalSlice = (
  set: (fn: (state: CombinedState) => void) => void,
  get: () => CombinedState
): JournalState & JournalActions => ({
  // Placeholder state and actions - implement fully
  entries: [],
  lastEntryTimestamp: null,
  isJournalOpen: false,
  addJournalEntry: (entryData: Omit<JournalEntry, 'timestamp' | 'id'>) => { console.log('addJournalEntry called', entryData); /* Implement */ },
  setJournalOpen: (isOpen: boolean) => { console.log('setJournalOpen called', isOpen); /* Implement */ },
});

// --- Combined Store ---

// FIX: Change to named export
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
    // FIX: Corrected handleNarrativeEvent
    handleNarrativeEvent: (event: NarrativeEvent) => {
      console.log(`Handling Narrative Event in gameStore: ${event.type}`, event.payload);
      const knowledgeStoreActions = useKnowledgeStore.getState(); // Get actions from knowledge store
      const journalStoreActions = useJournalStore.getState(); // Get actions from journal store

      switch (event.type) {
          // Example handlers - expand based on NarrativeEventType
          case NarrativeEventType.INSIGHT_REVEALED: // Assuming this event type exists
            const insightPayload = event.payload as { insightId: string; connection?: { from: string; to: string } };
            if (insightPayload?.insightId) {
              // Assuming knowledge store has addInsight
              knowledgeStoreActions.addInsight(insightPayload.insightId); // Call action from knowledge store
            }
            if (insightPayload?.connection) {
               // Assuming knowledge store has addConnection
               knowledgeStoreActions.addConnection(insightPayload.connection.from, insightPayload.connection.to);
               console.log("Connection added via INSIGHT_REVEALED event payload.");
            }
            break;

          case NarrativeEventType.JOURNAL_ENTRY_TRIGGERED: // Assuming this event type exists
             const journalPayload = event.payload as Omit<JournalEntry, 'id' | 'timestamp'>;
             if (journalPayload) {
                // Assuming journal store has addJournalEntry
                journalStoreActions.addJournalEntry(journalPayload); // Call action from journal store
             }
            break;

          // Add cases for other event types like updatePlayerHealth, addItem, etc.
          // These might call actions within this store (e.g., get().updatePlayerHealth(...))
          // or actions from other stores (e.g., resourceStoreActions.addResource(...))

          default:
            // FIX: Handle 'never' type error for exhaustiveness checking
            // If event.type can be any string, this check might not be appropriate.
            // If NarrativeEventType is a strict enum, this helps ensure all cases are handled.
            // Option 1: Remove if event.type is just string
             console.warn(`Unhandled narrative event type in gameStore: ${event.type}`);
            // Option 2: Keep if NarrativeEventType is a strict enum
            // const _exhaustiveCheck: never = event.type;
            // console.warn(`Unhandled narrative event type: ${event.type}`);
            break;
      }
    },
  }))
);

// Remove the default export if useGameStore is now a named export
// export default useGameStore;
