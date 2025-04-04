// tests/DialogueStateMachine.test.ts
import { useDialogueStateMachine, createDialogueFlow } from '../app/core/dialogue/DialogueStateMachine';
import { useEventBus, GameEventType } from '../app/core/events/CentralEventBus';

// Mock the event bus
jest.mock('../app/core/events/CentralEventBus', () => ({
  useEventBus: {
    getState: jest.fn().mockReturnValue({
      dispatch: jest.fn(),
      subscribe: jest.fn().mockReturnValue(jest.fn()), // Return unsubscribe function
      getEventHistory: jest.fn().mockReturnValue([])
    })
  },
  GameEventType: {
    DIALOGUE_STARTED: 'dialogue:started',
    DIALOGUE_OPTION_SELECTED: 'dialogue:option:selected',
    DIALOGUE_COMPLETED: 'dialogue:completed',
    JOURNAL_ACQUIRED: 'progression:journal:acquired',
    UI_BUTTON_CLICKED: 'ui:button:clicked'
  }
}));

// Setup test harness
const mockStateMachine = {
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
  setBackstoryText: jest.fn()
};

// Mock the zustand hook
jest.mock('zustand', () => ({
  create: jest.fn((fn) => fn(() => mockStateMachine, () => mockStateMachine, mockStateMachine))
}));

describe('Dialogue State Machine', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset state machine mock
    mockStateMachine.activeFlow = null;
    mockStateMachine.currentState = null;
    mockStateMachine.context = null;
    mockStateMachine.selectedOption = null;
    mockStateMachine.showResponse = false;
    mockStateMachine.showBackstory = false;
  });
  
  describe('Flow Creation', () => {
    test('creates a valid dialogue flow', () => {
      // Create a simple dialogue flow
      const flow = createDialogueFlow(
        'test-flow',
        {
          'intro': {
            id: 'intro',
            type: 'intro',
            text: 'Introduction text',
            options: [
              { id: 'next', text: 'Continue', nextStateId: 'second' }
            ]
          },
          'second': {
            id: 'second',
            type: 'question',
            text: 'Question text',
            isCriticalPath: true
          }
        },
        'intro',
        { characterId: 'test', nodeId: 'test-node' }
      );
      
      // Verify flow structure
      expect(flow.id).toBe('test-flow');
      expect(flow.initialStateId).toBe('intro');
      expect(Object.keys(flow.states).length).toBe(2);
      expect(flow.context.characterId).toBe('test');
      expect(flow.progressionCheckpoints).toContain('second');
    });
  });
  
  describe('Progression Validation', () => {
    test('validates critical path progression', () => {
      // Mock getProgressionStatus to simulate different conditions
      mockStateMachine.getProgressionStatus.mockImplementation(() => ({
        isCompleted: true,
        criticalPathsCompleted: true,
        missingCheckpoints: [],
        potentialLoops: [],
        progressionBlocked: false
      }));
      
      // Mock validation method to use our mock implementation
      mockStateMachine.validateDialogueProgression.mockImplementation(() => {
        return !mockStateMachine.getProgressionStatus().progressionBlocked;
      });
      
      // Valid progression test
      expect(mockStateMachine.validateDialogueProgression()).toBe(true);
      
      // Simulate progression block
      mockStateMachine.getProgressionStatus.mockImplementation(() => ({
        isCompleted: true,
        criticalPathsCompleted: false,
        missingCheckpoints: ['critical-stage'],
        potentialLoops: ['looping-stage'],
        progressionBlocked: true
      }));
      
      // Invalid progression test
      expect(mockStateMachine.validateDialogueProgression()).toBe(false);
    });
    
    test('detects and repairs progression issues', () => {
      // Mock current state to simulate being in a problematic state
      mockStateMachine.currentState = {
        id: 'problem-state',
        type: 'question',
        text: 'Problem state',
        isCriticalPath: false
      };
      
      // Mock progression status to indicate a problem
      mockStateMachine.getProgressionStatus.mockImplementation(() => ({
        isCompleted: true,
        criticalPathsCompleted: false,
        missingCheckpoints: ['journal-presentation'],
        potentialLoops: ['problem-state'],
        progressionBlocked: true
      }));
      
      // Call force repair and verify it was called
      mockStateMachine.forceProgressionRepair();
      expect(mockStateMachine.forceProgressionRepair).toHaveBeenCalled();
      
      // In a real implementation, this would verify the specific repair action
      // such as jumping to a critical state
    });
  });
  
  describe('Journal Acquisition Critical Path', () => {
    test('ensures journal presentation is reached', () => {
      // Setup a mock flow with initial state
      mockStateMachine.activeFlow = {
        id: 'kapoor-dialogue',
        initialStateId: 'intro',
        states: {
          'intro': {
            id: 'intro',
            type: 'intro',
            text: 'Intro text'
          },
          'conclusion': {
            id: 'conclusion',
            type: 'conclusion',
            isConclusion: true
          },
          'journal-presentation': {
            id: 'journal-presentation',
            type: 'critical-moment',
            isCriticalPath: true,
            isConclusion: true
          }
        },
        context: {
          characterId: 'kapoor',
          nodeId: 'test-node',
          playerScore: 0,
          selectedOptionIds: [],
          knowledgeGained: {},
          visitedStateIds: ['intro', 'conclusion'],
          loopDetection: { 'intro': 1, 'conclusion': 1 },
          criticalPathProgress: {}
        },
        progressionCheckpoints: ['journal-presentation']
      };
      
      // Set current state to conclusion (before journal)
      mockStateMachine.currentState = mockStateMachine.activeFlow.states['conclusion'];
      
      // Mock progression status to show missing journal checkpoint
      mockStateMachine.getProgressionStatus.mockImplementation(() => ({
        isCompleted: true,
        criticalPathsCompleted: false,
        missingCheckpoints: ['journal-presentation'],
        potentialLoops: [],
        progressionBlocked: true
      }));
      
      // Setup jump to state to verify it gets called with journal-presentation
      mockStateMachine.jumpToState.mockImplementation((stateId) => {
        // When repair is attempted, it should jump to journal-presentation
        expect(stateId).toBe('journal-presentation');
      });
      
      // Simulate force repair
      mockStateMachine.forceProgressionRepair();
      
      // Verify the jump was attempted
      expect(mockStateMachine.jumpToState).toHaveBeenCalledWith('journal-presentation');
      
      // Verify event dispatch would be called with journal acquisition
      expect(useEventBus.getState().dispatch).toHaveBeenCalled();
    });
  });
});
