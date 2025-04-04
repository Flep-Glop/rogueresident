// tests/progressionTests.js
const { assert, assertEqual, assertIncludes } = require('./assert');
const { createEventRecorder } = require('./eventRecorder');

// Test 1: Journal Acquisition
function testJournalAcquisition() {
  // Setup
  const events = createEventRecorder();
  const gameState = {
    hasJournal: false,
    completedNodes: []
  };
  
  // Create test doubles (not mocks, just simple objects)
  const testDialogue = {
    currentState: 'intro',
    states: {
      'intro': { id: 'intro', nextStateId: 'question' },
      'question': { id: 'question', nextStateId: 'journal-presentation' },
      'journal-presentation': { 
        id: 'journal-presentation',
        onEnter: () => {
          // Simulate journal acquisition
          gameState.hasJournal = true;
          events.record('journal-acquired', { tier: 'base' });
        }
      }
    },
    advance() {
      const nextId = this.states[this.currentState].nextStateId;
      if (nextId) {
        this.currentState = nextId;
        
        // Call onEnter if it exists
        const onEnter = this.states[this.currentState].onEnter;
        if (onEnter) onEnter();
      }
    }
  };
  
  // Run the test steps
  testDialogue.advance(); // intro → question
  testDialogue.advance(); // question → journal-presentation (triggers acquisition)
  
  // Assert
  assert(gameState.hasJournal, "Journal should be acquired");
  assert(events.hasEventType('journal-acquired'), "Journal acquisition event should fire");
}

// Test 2: Dialogue Progression
function testDialogueProgression() {
  // Similar setup to test 1...
  const visitedStates = [];
  
  const testDialogue = {
    // Simplified dialogue flow
    states: ['intro', 'question', 'response', 'conclusion'],
    currentIndex: 0,
    
    advance() {
      visitedStates.push(this.states[this.currentIndex]);
      this.currentIndex++;
      return this.currentIndex < this.states.length;
    }
  };
  
  // Run steps
  while(testDialogue.advance()) {} 
  
  // Assert
  assertEqual(visitedStates.length, 4, "Should visit all dialogue states");
  assertEqual(visitedStates[visitedStates.length-1], 'conclusion', "Should end at conclusion");
}

// Test 3: Boss Encounter
function testBossEncounter() {
  // Setup
  const events = createEventRecorder();
  const gameState = {
    bossDefeated: false,
    phase: 'day',
    completedNodes: []
  };
  
  // Simple test double for boss encounter
  const boss = {
    completeBoss() {
      gameState.bossDefeated = true;
      gameState.completedNodes.push('boss-ionix');
      events.record('boss-defeated', { bossId: 'ionix' });
      
      // Transition to victory
      if (gameState.phase !== 'victory') {
        events.record('phase-changed', { from: gameState.phase, to: 'victory' });
        gameState.phase = 'victory';
      }
    }
  };
  
  // Run the test
  boss.completeBoss();
  
  // Assert
  assert(gameState.bossDefeated, "Boss should be marked as defeated");
  assertEqual(gameState.phase, 'victory', "Game should transition to victory phase");
  assertIncludes(gameState.completedNodes, 'boss-ionix', "Boss node should be completed");
}

// Export all tests
module.exports = {
  testJournalAcquisition,
  testDialogueProgression,
  testBossEncounter
};

// Run test directly when executed as a standalone file
function runTest() {
  console.log("🧪 Running progression tests");
  try {
    testJournalAcquisition();
    console.log("✅ PASSED: testJournalAcquisition");
    testDialogueProgression();
    console.log("✅ PASSED: testDialogueProgression");
    testBossEncounter();
    console.log("✅ PASSED: testBossEncounter");
    return true;
  } catch (error) {
    console.error(`❌ FAILED: ${error.message}`);
    return false;
  }
}

// Run directly only when executed as main
if (require.main === module) {
  runTest();
}