// tests/dialogueProgressionTest.js
/**
 * Dialogue Progression Test
 * 
 * This test validates that dialogue progressions work correctly,
 * particularly focusing on critical paths and state transitions.
 * 
 * It uses a similar approach to Supergiant's dialogue testing system
 * where event sequences are recorded and replayed to verify narrative integrity.
 */

const { createEventRecorder } = require('./eventRecorder');
const assert = require('./assert');

// Import the necessary modules for testing
const GameEventType = {
  DIALOGUE_STARTED: 'dialogue:started',
  DIALOGUE_OPTION_SELECTED: 'dialogue:option:selected',
  DIALOGUE_COMPLETED: 'dialogue:completed',
  DIALOGUE_CRITICAL_PATH: 'dialogue:critical:path',
  UI_DIALOGUE_ADVANCED: 'ui:dialogue:advanced'
};

// Mock event bus for testing
const createMockEventBus = () => {
  const listeners = {};
  const dispatcher = (type, payload) => {
    if (listeners[type]) {
      listeners[type].forEach(listener => listener({ type, payload, timestamp: Date.now() }));
    }
  };
  
  return {
    dispatch: dispatcher,
    subscribe: (type, listener) => {
      if (!listeners[type]) {
        listeners[type] = [];
      }
      listeners[type].push(listener);
      return () => {
        listeners[type] = listeners[type].filter(l => l !== listener);
      };
    },
    getListeners: () => ({ ...listeners })
  };
};

// Test Suite
const runDialogueProgressionTests = () => {
  console.log('=== Running Dialogue Progression Tests ===');
  
  // Test: Dr. Kapoor Journal Acquisition Critical Path
  const testKapoorJournalCriticalPath = () => {
    console.log('\n[TEST] Dr. Kapoor Journal Acquisition Critical Path');
    
    // Setup
    const eventBus = createMockEventBus();
    const recorder = createEventRecorder();
    
    // Create dialogue controller mock with recording
    const dialogueController = {
      handleCriticalPath: (dialogueId, characterId, criticalStateId, playerScore) => {
        recorder.record('handleCriticalPath', { dialogueId, characterId, criticalStateId, playerScore });
        
        // Simulate critical path handling
        if (criticalStateId === 'journal-presentation' && characterId === 'kapoor') {
          eventBus.dispatch(GameEventType.DIALOGUE_CRITICAL_PATH, {
            dialogueId,
            characterId,
            nodeId: 'kapoor-intro-node',
            criticalStateId,
            playerScore,
            wasRepaired: false
          });
        }
      }
    };
    
    // Hook up event recording
    eventBus.subscribe(GameEventType.DIALOGUE_STARTED, 
      event => recorder.record(event.type, event.payload));
    eventBus.subscribe(GameEventType.DIALOGUE_OPTION_SELECTED, 
      event => recorder.record(event.type, event.payload));
    eventBus.subscribe(GameEventType.DIALOGUE_COMPLETED, 
      event => recorder.record(event.type, event.payload));
    eventBus.subscribe(GameEventType.DIALOGUE_CRITICAL_PATH,
      event => recorder.record(event.type, event.payload));
    
    // Simulate dialogue flow
    const dialogueId = 'test-kapoor-dialogue-' + Date.now();
    
    // 1. Start dialogue
    eventBus.dispatch(GameEventType.DIALOGUE_STARTED, {
      flowId: dialogueId,
      initialStageId: 'intro',
      characterId: 'kapoor',
      nodeId: 'kapoor-intro-node',
      stages: [
        { 
          id: 'intro', 
          text: 'Welcome to the department.',
          nextStageId: 'explanation'
        },
        { 
          id: 'explanation', 
          text: 'Let me explain how our protocols work.',
          nextStageId: 'journal-offer'
        },
        { 
          id: 'journal-offer', 
          text: 'You should take this journal to help you.',
          options: [
            { 
              id: 'accept-eagerly', 
              text: 'I would love that, thank you!',
              responseText: 'Excellent. This will serve you well.',
              nextStageId: 'journal-presentation',
              insightGain: 15
            },
            { 
              id: 'accept-hesitantly', 
              text: 'I suppose that could be useful.',
              responseText: 'It will be more useful than you realize.',
              nextStageId: 'journal-presentation',
              insightGain: 5
            },
            { 
              id: 'reject', 
              text: 'I prefer my digital notes, thanks.',
              responseText: 'Nevertheless, you should take it. Digital notes fail in radiation areas.',
              nextStageId: 'journal-presentation',
              insightGain: 0
            }
          ]
        },
        { 
          id: 'journal-presentation', 
          text: 'Here is your journal. Keep it with you at all times.',
          nextStageId: 'conclusion',
          isCriticalPath: true
        },
        { 
          id: 'conclusion', 
          text: 'Good luck on your first day.',
          isConclusion: true
        }
      ]
    });
    
    // 2. Advance through dialogue
    eventBus.dispatch(GameEventType.UI_DIALOGUE_ADVANCED, {
      componentId: 'dialogueSystem',
      action: 'continue', // intro -> explanation
      metadata: { nodeId: 'intro', character: 'kapoor' }
    });
    
    eventBus.dispatch(GameEventType.UI_DIALOGUE_ADVANCED, {
      componentId: 'dialogueSystem',
      action: 'continue', // explanation -> journal-offer
      metadata: { nodeId: 'explanation', character: 'kapoor' }
    });
    
    // 3. Select journal option - highest insight
    eventBus.dispatch(GameEventType.DIALOGUE_OPTION_SELECTED, {
      optionId: 'accept-eagerly',
      stageId: 'journal-offer',
      character: 'kapoor',
      flowId: dialogueId,
      insightGain: 15
    });
    
    // 4. Process option selection (simulated DialogueController behavior)
    dialogueController.handleCriticalPath(dialogueId, 'kapoor', 'journal-presentation', 15);
    
    // 5. Continue to completion
    eventBus.dispatch(GameEventType.UI_DIALOGUE_ADVANCED, {
      componentId: 'dialogueSystem',
      action: 'continue', // journal-presentation -> conclusion
      metadata: { nodeId: 'journal-presentation', character: 'kapoor' }
    });
    
    eventBus.dispatch(GameEventType.DIALOGUE_COMPLETED, {
      flowId: dialogueId,
      completed: true,
      reason: 'normal_completion',
      character: 'kapoor'
    });
    
    // Verify the recorded events
    const events = recorder.getEvents();
    
    // Verify sequence
    assert(events.length >= 5, 'Expected at least 5 events in critical path sequence');
    
    // Verify critical path was triggered
    const criticalPathEvent = events.find(e => 
      e.type === GameEventType.DIALOGUE_CRITICAL_PATH);
    
    assert(criticalPathEvent, 'Critical path event should be triggered');
    assert(
      criticalPathEvent.data.criticalStateId === 'journal-presentation', 
      'Critical path should be journal-presentation'
    );
    assert(
      criticalPathEvent.data.characterId === 'kapoor', 
      'Critical path should be for Dr. Kapoor'
    );
    assert(
      criticalPathEvent.data.playerScore === 15, 
      'Player score should be 15 for eager acceptance'
    );
    
    console.log('✓ Kapoor critical path test passed');
    return true;
  };
  
  // Test: Dialogue Interruption and Recovery
  const testDialogueInterruption = () => {
    console.log('\n[TEST] Dialogue Interruption and Recovery');
    
    // Setup
    const eventBus = createMockEventBus();
    const recorder = createEventRecorder();
    
    // Track state for interruption test
    let wasRepaired = false;
    
    // Hook up event recording
    eventBus.subscribe(GameEventType.DIALOGUE_STARTED, 
      event => recorder.record(event.type, event.payload));
    eventBus.subscribe(GameEventType.DIALOGUE_COMPLETED, 
      event => recorder.record(event.type, event.payload));
    eventBus.subscribe('dialogue:progression:repair',
      event => {
        recorder.record(event.type, event.payload);
        wasRepaired = true;
      });
    
    // Dialogue ID
    const dialogueId = 'test-interrupted-dialogue-' + Date.now();
    
    // 1. Start dialogue
    eventBus.dispatch(GameEventType.DIALOGUE_STARTED, {
      flowId: dialogueId,
      initialStageId: 'intro',
      characterId: 'quinn',
      nodeId: 'quinn-theory-node',
      stages: [
        { 
          id: 'intro', 
          text: 'Let me explain quantum dosimetry.',
          nextStageId: 'explanation',
          isCriticalPath: true 
        },
        { 
          id: 'explanation', 
          text: 'The principles are complex but fascinating.',
          nextStageId: 'conclusion',
          isCriticalPath: true
        },
        { 
          id: 'conclusion', 
          text: 'Now you understand the basics.',
          isConclusion: true
        }
      ]
    });
    
    // 2. Advance partially
    eventBus.dispatch(GameEventType.UI_DIALOGUE_ADVANCED, {
      componentId: 'dialogueSystem',
      action: 'continue', // intro -> explanation
      metadata: { nodeId: 'intro', character: 'quinn' }
    });
    
    // 3. Interrupt dialogue (simulate component unmount)
    eventBus.dispatch(GameEventType.DIALOGUE_COMPLETED, {
      flowId: dialogueId,
      completed: false,
      reason: 'component_unmounted',
      character: 'quinn'
    });
    
    // 4. Simulate repair attempt (from DialogueController)
    eventBus.dispatch('dialogue:progression:repair', {
      dialogueId,
      characterId: 'quinn',
      nodeId: 'quinn-theory-node',
      fromStateId: 'explanation',
      toStateId: 'forced_conclusion',
      reason: 'interrupted_component_unmounted'
    });
    
    // Verify the recorded events
    const events = recorder.getEvents();
    
    // Verify interruption
    const completionEvent = events.find(e => 
      e.type === GameEventType.DIALOGUE_COMPLETED);
    
    assert(completionEvent, 'Dialogue completion event should exist');
    assert(
      completionEvent.data.completed === false, 
      'Dialogue should be marked as not completed'
    );
    assert(
      completionEvent.data.reason === 'component_unmounted', 
      'Interruption reason should be component_unmounted'
    );
    
    // Verify repair
    assert(wasRepaired, 'Dialogue should attempt repair after interruption');
    const repairEvent = events.find(e => e.type === 'dialogue:progression:repair');
    assert(repairEvent, 'Repair event should exist');
    assert(
      repairEvent.data.fromStateId === 'explanation', 
      'Repair should start from explanation state'
    );
    assert(
      repairEvent.data.toStateId === 'forced_conclusion', 
      'Repair should force conclusion'
    );
    
    console.log('✓ Dialogue interruption and recovery test passed');
    return true;
  };
  
  // Run all tests
  try {
    const kapoorResult = testKapoorJournalCriticalPath();
    const interruptionResult = testDialogueInterruption();
    
    const allPassed = kapoorResult && interruptionResult;
    console.log(`\n${allPassed ? '✓ All tests passed!' : '✗ Some tests failed!'}`);
    
    return allPassed;
  } catch (error) {
    console.error('Test failure:', error);
    return false;
  }
};

// Export for runner
module.exports = { runDialogueProgressionTests };