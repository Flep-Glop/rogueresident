// tests/utils/testStoreMocks.ts
/**
 * Test Store Mocks
 * 
 * Centralized mock implementation for all the Zustand stores used in tests.
 * These mocks replace actual store implementations to provide controllable
 * test conditions without side effects.
 */

// Store API types
interface JournalStoreMock {
    hasJournal: boolean;
    currentUpgrade: 'base' | 'technical' | 'annotated';
    initializeJournal: jest.Mock;
    upgradeJournal: jest.Mock;
    addEntry: jest.Mock;
    toggleJournal: jest.Mock;
  }
  
  interface GameStoreMock {
    gameState: string;
    gamePhase: string;
    currentNodeId: string | null;
    completedNodeIds: string[];
    map: any | null;
    currentDay: number;
    player: {
      health: number;
      insight: number;
      maxHealth: number;
    };
    startGame: jest.Mock;
    setCurrentNode: jest.Mock;
    completeNode: jest.Mock;
    updateHealth: jest.Mock;
    updateInsight: jest.Mock;
    resetGame: jest.Mock;
  }
  
  interface DialogueStateMachineMock {
    activeFlow: any | null;
    currentState: any | null;
    context: any | null;
    selectedOption: any | null;
    showResponse: boolean;
    showBackstory: boolean;
    backstoryText: string;
    isTransitioning: boolean;
    initializeFlow: jest.Mock;
    selectOption: jest.Mock;
    advanceState: jest.Mock;
    jumpToState: jest.Mock;
    completeFlow: jest.Mock;
    getAvailableOptions: jest.Mock;
    getCurrentText: jest.Mock;
    isInCriticalState: jest.Mock;
    validateDialogueProgression: jest.Mock;
    getProgressionStatus: jest.Mock;
    forceProgressionRepair: jest.Mock;
  }
  
  interface EventBusMock {
    dispatch: jest.Mock;
    subscribe: jest.Mock;
    getEventHistory: jest.Mock;
    clearEventLog: jest.Mock;
  }
  
  // Store factory functions that create fresh mocks for each test
  export function createJournalStoreMock(initialState: Partial<JournalStoreMock> = {}): JournalStoreMock {
    return {
      hasJournal: false,
      currentUpgrade: 'base',
      initializeJournal: jest.fn(),
      upgradeJournal: jest.fn(),
      addEntry: jest.fn(),
      toggleJournal: jest.fn(),
      ...initialState
    };
  }
  
  export function createGameStoreMock(initialState: Partial<GameStoreMock> = {}): GameStoreMock {
    return {
      gameState: 'not_started',
      gamePhase: 'day',
      currentNodeId: null,
      completedNodeIds: [],
      map: null,
      currentDay: 1,
      player: {
        health: 4,
        insight: 100,
        maxHealth: 4
      },
      startGame: jest.fn(),
      setCurrentNode: jest.fn(),
      completeNode: jest.fn(),
      updateHealth: jest.fn(),
      updateInsight: jest.fn(),
      resetGame: jest.fn(),
      ...initialState
    };
  }
  
  export function createDialogueStateMachineMock(initialState: Partial<DialogueStateMachineMock> = {}): DialogueStateMachineMock {
    return {
      activeFlow: null,
      currentState: null,
      context: null,
      selectedOption: null,
      showResponse: false,
      showBackstory: false,
      backstoryText: '',
      isTransitioning: false,
      initializeFlow: jest.fn(),
      selectOption: jest.fn(),
      advanceState: jest.fn(),
      jumpToState: jest.fn(),
      completeFlow: jest.fn(),
      getAvailableOptions: jest.fn(),
      getCurrentText: jest.fn(),
      isInCriticalState: jest.fn(),
      validateDialogueProgression: jest.fn(),
      getProgressionStatus: jest.fn(),
      forceProgressionRepair: jest.fn(),
      ...initialState
    };
  }
  
  export function createEventBusMock(initialState: Partial<EventBusMock> = {}): EventBusMock {
    return {
      dispatch: jest.fn(),
      subscribe: jest.fn().mockReturnValue(() => {}), // Return unsubscribe function
      getEventHistory: jest.fn().mockReturnValue([]),
      clearEventLog: jest.fn(),
      ...initialState
    };
  }
  
  /**
   * Setup all mocks for a test suite - creates fresh instances and configures
   * global mocks on the jest object
   */
  export function setupMocks() {
    // Create fresh instances
    const journalStoreMock = createJournalStoreMock();
    const gameStoreMock = createGameStoreMock();
    const dialogueStateMachineMock = createDialogueStateMachineMock();
    const eventBusMock = createEventBusMock();
    
    // Setup global jest mocks
    jest.mock('../../app/store/journalStore', () => ({
      useJournalStore: {
        getState: jest.fn().mockReturnValue(journalStoreMock),
        setState: jest.fn((updater) => {
          if (typeof updater === 'function') {
            const updates = updater(journalStoreMock);
            Object.assign(journalStoreMock, updates);
          } else {
            Object.assign(journalStoreMock, updater);
          }
        })
      }
    }));
    
    jest.mock('../../app/store/gameStore', () => ({
      useGameStore: {
        getState: jest.fn().mockReturnValue(gameStoreMock),
        setState: jest.fn((updater) => {
          if (typeof updater === 'function') {
            const updates = updater(gameStoreMock);
            Object.assign(gameStoreMock, updates);
          } else {
            Object.assign(gameStoreMock, updater);
          }
        })
      }
    }));
    
    jest.mock('../../app/core/dialogue/DialogueStateMachine', () => ({
      useDialogueStateMachine: {
        getState: jest.fn().mockReturnValue(dialogueStateMachineMock),
        setState: jest.fn((updater) => {
          if (typeof updater === 'function') {
            const updates = updater(dialogueStateMachineMock);
            Object.assign(dialogueStateMachineMock, updates);
          } else {
            Object.assign(dialogueStateMachineMock, updater);
          }
        })
      },
      createDialogueFlow: jest.fn((id, states, initialStateId, context) => ({
        id,
        initialStateId,
        states,
        context: context || {},
        transitions: [],
        progressionCheckpoints: Object.keys(states).filter(id => states[id].isCriticalPath)
      }))
    }));
    
    jest.mock('../../app/core/events/CentralEventBus', () => ({
      useEventBus: {
        getState: jest.fn().mockReturnValue(eventBusMock)
      },
      GameEventType: {
        SESSION_STARTED: 'session:started',
        NODE_COMPLETED: 'node:completed',
        JOURNAL_ACQUIRED: 'progression:journal:acquired',
        DIALOGUE_COMPLETED: 'dialogue:completed',
        DIALOGUE_OPTION_SELECTED: 'dialogue:option:selected',
        KNOWLEDGE_GAINED: 'knowledge:gained',
        UI_BUTTON_CLICKED: 'ui:button:clicked'
      },
      journalAcquired: jest.fn(),
      nodeCompleted: jest.fn(),
      knowledgeGained: jest.fn()
    }));
    
    // Return the mocks for test usage
    return {
      journalStoreMock,
      gameStoreMock,
      dialogueStateMachineMock,
      eventBusMock,
      resetAllMocks: () => {
        jest.clearAllMocks();
        Object.assign(journalStoreMock, createJournalStoreMock());
        Object.assign(gameStoreMock, createGameStoreMock());
        Object.assign(dialogueStateMachineMock, createDialogueStateMachineMock());
        Object.assign(eventBusMock, createEventBusMock());
      }
    };
  }
  
  export default setupMocks;