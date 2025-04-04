// tests/ProgressionTestSuite.ts
/**
 * Progression Test Suite
 * 
 * Automated tests for critical game progression paths to prevent regression issues.
 * These tests simulate key player interactions and verify that progression elements
 * (like the journal acquisition) function correctly under various conditions.
 */

import { useDialogueStateMachine, DialogueState, createDialogueFlow } from '../app/core/dialogue/DialogueStateMachine';
import { useEventBus, GameEventType } from '../app/core/events/CentralEventBus';
import { useJournalStore } from '../app/store/journalStore';
import { setupProgressionSafety, runProgressionChecks } from '../app/core/progression/ProgressionGuarantee';

// Test suite configuration
interface TestConfig {
  name: string;
  description: string;
  setup: () => void;
  steps: TestStep[];
  expectations: Expectation[];
  cleanup: () => void;
}

interface TestStep {
  description: string;
  action: () => void;
}

interface Expectation {
  description: string;
  condition: () => boolean;
  critical: boolean;
}

interface TestResult {
  name: string;
  passed: boolean;
  failedExpectations: string[];
  criticalFailures: string[];
  events: any[];
}

/**
 * Run a single test configuration and return results
 */
function runProgressionTest(config: TestConfig): TestResult {
  const result: TestResult = {
    name: config.name,
    passed: true,
    failedExpectations: [],
    criticalFailures: [],
    events: []
  };
  
  try {
    // Setup test environment
    config.setup();
    
    // Record all events for analysis
    const eventLog: any[] = [];
    const unsubscribe = useEventBus.getState().subscribe(
      'all' as any, // Subscribe to all events
      (event) => {
        eventLog.push(event);
      }
    );
    
    // Execute each test step
    for (const step of config.steps) {
      console.log(`Executing step: ${step.description}`);
      step.action();
    }
    
    // Check expectations
    for (const expectation of config.expectations) {
      const passed = expectation.condition();
      if (!passed) {
        result.passed = false;
        result.failedExpectations.push(expectation.description);
        
        if (expectation.critical) {
          result.criticalFailures.push(expectation.description);
        }
      }
    }
    
    // Store events for analysis
    result.events = eventLog;
    
    // Cleanup test
    unsubscribe();
    config.cleanup();
    
  } catch (error) {
    result.passed = false;
    result.failedExpectations.push(`Test threw an exception: ${(error as Error).message}`);
    result.criticalFailures.push(`Test execution failure: ${(error as Error).message}`);
  }
  
  return result;
}

/**
 * Core test scenarios for progression verification
 */
const progressionTests: TestConfig[] = [
  // Test 1: Normal journal acquisition through dialogue
  {
    name: "Normal Journal Acquisition",
    description: "Tests journal acquisition through standard dialogue path",
    setup: () => {
      // Reset journal store
      useJournalStore.getState().initializeJournal = jest.fn();
      // Initialize dialogue state machine with Kapoor's dialogue
      const states: Record<string, DialogueState> = {
        'intro': {
          id: 'intro',
          type: 'intro',
          text: "Introduction text",
          options: [
            { id: "option1", text: "Good option", nextStateId: 'correct' }
          ]
        },
        'correct': {
          id: 'correct',
          type: 'question',
          text: "Follow-up question",
          options: [
            { id: "correct-answer", text: "Correct answer", nextStateId: 'conclusion', isCriticalPath: true }
          ]
        },
        'conclusion': {
          id: 'conclusion',
          type: 'conclusion',
          text: "Conclusion text",
          isConclusion: true,
          isCriticalPath: true,
          nextStateId: 'journal-presentation'
        },
        'journal-presentation': {
          id: 'journal-presentation',
          type: 'critical-moment',
          text: "Journal presentation text",
          isCriticalPath: true,
          onEnter: (context) => {
            // This would trigger journal acquisition
            useEventBus.getState().dispatch(GameEventType.JOURNAL_ACQUIRED, {
              tier: 'base',
              character: 'kapoor',
              source: 'test'
            });
          }
        }
      };
      
      const flow = createDialogueFlow(
        'test-flow',
        states,
        'intro',
        { characterId: 'kapoor', nodeId: 'test-node' }
      );
      
      useDialogueStateMachine.getState().initializeFlow(flow);
    },
    steps: [
      {
        description: "Select first dialogue option",
        action: () => {
          useDialogueStateMachine.getState().selectOption("option1");
        }
      },
      {
        description: "Select correct answer",
        action: () => {
          useDialogueStateMachine.getState().selectOption("correct-answer");
        }
      },
      {
        description: "Advance to conclusion",
        action: () => {
          useDialogueStateMachine.getState().advanceState();
        }
      },
      {
        description: "Advance to journal presentation",
        action: () => {
          useDialogueStateMachine.getState().advanceState();
        }
      }
    ],
    expectations: [
      {
        description: "Journal initialization function was called",
        condition: () => (useJournalStore.getState().initializeJournal as jest.Mock).mock.calls.length > 0,
        critical: true
      },
      {
        description: "Journal acquisition event was dispatched",
        condition: () => {
          const events = useEventBus.getState().getEventHistory(GameEventType.JOURNAL_ACQUIRED);
          return events.length > 0;
        },
        critical: true
      }
    ],
    cleanup: () => {
      useDialogueStateMachine.setState({ activeFlow: null, currentState: null, context: null });
    }
  },
  
  // Test 2: Dialogue loop repair
  {
    name: "Dialogue Loop Recovery",
    description: "Tests the system's ability to recover from dialogue loops",
    setup: () => {
      // Reset journal store
      useJournalStore.getState().initializeJournal = jest.fn();
      
      // Initialize dialogue state machine with a potential loop
      const states: Record<string, DialogueState> = {
        'intro': {
          id: 'intro',
          type: 'intro',
          text: "Introduction text",
          options: [
            { id: "loop-option", text: "Option causing loop", nextStateId: 'loop' }
          ]
        },
        'loop': {
          id: 'loop',
          type: 'question',
          text: "This stage can loop",
          options: [
            { id: "stay-in-loop", text: "Stay in loop", nextStateId: 'loop' },
            { id: "exit-loop", text: "Exit loop", nextStateId: 'conclusion' }
          ],
          maxVisits: 1 // Should only visit once
        },
        'conclusion': {
          id: 'conclusion',
          type: 'conclusion',
          text: "Conclusion text",
          isConclusion: true,
          isCriticalPath: true,
          nextStateId: 'journal-presentation'
        },
        'journal-presentation': {
          id: 'journal-presentation',
          type: 'critical-moment',
          text: "Journal presentation text",
          isCriticalPath: true,
          onEnter: (context) => {
            // This would trigger journal acquisition
            useEventBus.getState().dispatch(GameEventType.JOURNAL_ACQUIRED, {
              tier: 'base',
              character: 'kapoor',
              source: 'test'
            });
          }
        }
      };
      
      const flow = createDialogueFlow(
        'test-flow',
        states,
        'intro',
        { characterId: 'kapoor', nodeId: 'test-node' }
      );
      
      useDialogueStateMachine.getState().initializeFlow(flow);
    },
    steps: [
      {
        description: "Enter the loop",
        action: () => {
          useDialogueStateMachine.getState().selectOption("loop-option");
        }
      },
      {
        description: "Stay in the loop (triggering loop detection)",
        action: () => {
          useDialogueStateMachine.getState().selectOption("stay-in-loop");
        }
      },
      {
        description: "Try to stay in loop again (should trigger repair)",
        action: () => {
          useDialogueStateMachine.getState().selectOption("stay-in-loop");
        }
      },
      {
        description: "Check if we've been redirected",
        action: () => {
          const currentState = useDialogueStateMachine.getState().currentState;
          console.log(`Current state after loop repair: ${currentState?.id}`);
        }
      }
    ],
    expectations: [
      {
        description: "System detected and escaped the dialogue loop",
        condition: () => {
          const currentState = useDialogueStateMachine.getState().currentState;
          return currentState?.id !== 'loop';
        },
        critical: true
      },
      {
        description: "System reached a critical path state",
        condition: () => {
          const currentState = useDialogueStateMachine.getState().currentState;
          return Boolean(currentState?.isCriticalPath);
        },
        critical: true
      }
    ],
    cleanup: () => {
      useDialogueStateMachine.setState({ activeFlow: null, currentState: null, context: null });
    }
  },
  
  // Test 3: Progression guarantor fallback
  {
    name: "Progression Guarantor Fallback",
    description: "Tests the progression guarantor's ability to repair missing journal",
    setup: () => {
      // Reset journal store
      useJournalStore.setState({ hasJournal: false });
      useJournalStore.getState().initializeJournal = jest.fn();
      
      // Set up mock state to simulate completed Kapoor node
      const mockCompletedNodeIds = ['kapoor-calibration-node'];
      jest.spyOn(useEventBus.getState(), 'getEventHistory').mockImplementation((type) => {
        if (type === GameEventType.NODE_COMPLETED) {
          return [{
            type: GameEventType.NODE_COMPLETED,
            payload: { nodeId: 'kapoor-calibration-node', character: 'kapoor' },
            timestamp: Date.now(),
            id: 'mock-event'
          }];
        }
        return [];
      });
      
      // Initialize progression safety system
      setupProgressionSafety();
    },
    steps: [
      {
        description: "Run progression checks",
        action: () => {
          const repairsPerformed = runProgressionChecks();
          console.log(`Repairs performed: ${repairsPerformed}`);
        }
      }
    ],
    expectations: [
      {
        description: "Journal initialization was called by guarantor",
        condition: () => (useJournalStore.getState().initializeJournal as jest.Mock).mock.calls.length > 0,
        critical: true
      },
      {
        description: "Journal acquisition event was dispatched",
        condition: () => {
          const events = useEventBus.getState().getEventHistory(GameEventType.JOURNAL_ACQUIRED);
          return events.some(e => e.payload.source === 'progression_repair');
        },
        critical: true
      }
    ],
    cleanup: () => {
      jest.restoreAllMocks();
      useJournalStore.setState({ hasJournal: false });
    }
  }
];

/**
 * Run all progression tests and report results
 */
export function runProgressionTestSuite() {
  console.log("🧪 Running Progression Test Suite 🧪");
  
  const results: TestResult[] = [];
  
  for (const test of progressionTests) {
    console.log(`📋 Running test: ${test.name}`);
    console.log(`Description: ${test.description}`);
    
    const result = runProgressionTest(test);
    results.push(result);
    
    if (result.passed) {
      console.log(`✅ Test passed: ${test.name}`);
    } else {
      console.error(`❌ Test failed: ${test.name}`);
      console.error(`Failed expectations: ${result.failedExpectations.join(', ')}`);
      if (result.criticalFailures.length > 0) {
        console.error(`CRITICAL FAILURES: ${result.criticalFailures.join(', ')}`);
      }
    }
    
    console.log("-----------------------------------");
  }
  
  // Generate summary
  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  const criticalFailures = results.flatMap(r => r.criticalFailures).length;
  
  console.log(`📊 Test Suite Summary: ${passedTests}/${totalTests} tests passed`);
  console.log(`Critical failures: ${criticalFailures}`);
  
  if (criticalFailures > 0) {
    console.error("⚠️ CRITICAL PROGRESSION ISSUES DETECTED! RESOLVE BEFORE DEPLOYMENT!");
  }
  
  return {
    tests: results,
    summary: {
      total: totalTests,
      passed: passedTests,
      failed: totalTests - passedTests,
      criticalFailures
    }
  };
}

export default { runProgressionTestSuite };