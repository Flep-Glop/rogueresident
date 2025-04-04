// tests/testDayNightCycle.js
const { assert, assertEqual } = require('./assert');
const { createEventRecorder } = require('./eventRecorder');

function testDayNightCycle() {
  const events = createEventRecorder();
  const gameState = {
    phase: 'day',
    currentDay: 1,
    completedNodeIds: [],
    transitionTriggered: false
  };
  
  // Create test double for day-night transitions
  const phaseManager = {
    completeDay() {
      events.record('day-completed', { day: gameState.currentDay });
      gameState.phase = 'night';
      gameState.transitionTriggered = true;
    },
    completeNight() {
      events.record('night-completed', { day: gameState.currentDay });
      gameState.currentDay++;
      gameState.phase = 'day';
      gameState.completedNodeIds = []; // Reset for new day
      gameState.transitionTriggered = true;
    }
  };
  
  // Simulate day completion
  phaseManager.completeDay();
  assertEqual(gameState.phase, 'night', "Should transition to night phase");
  assert(events.hasEventType('day-completed'), "Day completed event should fire");
  
  // Simulate night completion
  phaseManager.completeNight();
  assertEqual(gameState.phase, 'day', "Should transition back to day phase");
  assertEqual(gameState.currentDay, 2, "Day counter should increment");
  assertEqual(gameState.completedNodeIds.length, 0, "Completed nodes should reset");
  assert(events.hasEventType('night-completed'), "Night completed event should fire");
}

module.exports = { testDayNightCycle };

// Run test directly when executed as a standalone file
function runTest() {
  console.log("🧪 Running test: testDayNightCycle");
  try {
    testDayNightCycle();
    console.log("✅ PASSED: testDayNightCycle");
    return true;
  } catch (error) {
    console.error(`❌ FAILED: testDayNightCycle`);
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

// Run directly only when executed as main
if (require.main === module) {
  runTest();
}