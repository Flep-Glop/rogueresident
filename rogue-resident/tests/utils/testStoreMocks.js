// tests/js/utils/testStoreMocks.js
/**
 * Test Store Mocks
 * 
 * Centralized mock implementation for all the stores used in tests.
 * These mocks replace actual store implementations to provide controllable
 * test conditions without side effects.
 */

/**
 * Creates a journal store mock
 */
function createJournalStoreMock(initialState = {}) {
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
  
  /**
   * Creates a game store mock
   */
  function createGameStoreMock(initialState = {}) {
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
  
  /**
   * Creates a dialogue state machine mock
   */
  function createDialogueStateMachineMock(initialState = {}) {
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
  
  /**
   * Creates an event bus mock
   */
  function createEventBusMock(initialState = {}) {
    return {
      dispatch: jest.fn(),
      subscribe: jest.fn().mockReturnValue(() => {}), // Return unsubscribe function
      getEventHistory: jest.fn().mockReturnValue([]),
      clearEventLog: jest.fn(),
      ...initialState
    };
  }
  
  /**
   * Setup all mocks for a test suite - creates fresh instances
   */
  function setupMocks() {
    // Create fresh instances
    const journalStoreMock = createJournalStoreMock();
    const gameStoreMock = createGameStoreMock();
    const dialogueStateMachineMock = createDialogueStateMachineMock();
    const eventBusMock = createEventBusMock();
    
    // Return the mocks for test usage
    return {
      journalStoreMock,
      gameStoreMock,
      dialogueStateMachineMock,
      eventBusMock,
      resetAllMocks: () => {
        // Clear all mock calls
        Object.keys(journalStoreMock).forEach(key => {
          if (typeof journalStoreMock[key] === 'function' && journalStoreMock[key].mock) {
            journalStoreMock[key].mock.calls = [];
          }
        });
        
        Object.keys(gameStoreMock).forEach(key => {
          if (typeof gameStoreMock[key] === 'function' && gameStoreMock[key].mock) {
            gameStoreMock[key].mock.calls = [];
          }
        });
        
        Object.keys(dialogueStateMachineMock).forEach(key => {
          if (typeof dialogueStateMachineMock[key] === 'function' && dialogueStateMachineMock[key].mock) {
            dialogueStateMachineMock[key].mock.calls = [];
          }
        });
        
        Object.keys(eventBusMock).forEach(key => {
          if (typeof eventBusMock[key] === 'function' && eventBusMock[key].mock) {
            eventBusMock[key].mock.calls = [];
          }
        });
        
        // Reset state
        Object.assign(journalStoreMock, createJournalStoreMock());
        Object.assign(gameStoreMock, createGameStoreMock());
        Object.assign(dialogueStateMachineMock, createDialogueStateMachineMock());
        Object.assign(eventBusMock, createEventBusMock());
      }
    };
  }
  
  module.exports = { 
    setupMocks,
    createJournalStoreMock,
    createGameStoreMock,
    createDialogueStateMachineMock,
    createEventBusMock
  };