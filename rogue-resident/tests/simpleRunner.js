// tests/simpleRunner.js
const { testJournalAcquisition, testDialogueProgression, testBossEncounter } = require('./progressionTests');
const { testDayNightCycle } = require('./testDayNightCycle');
const { testKnowledgeAcquisition } = require('./testKnowledgeAcquisition');
const { testNodeAccessibility } = require('./testNodeAccessibility');
const { testItemEffectSystem } = require('./testItemEffectSystem');
const { testKnowledgeDecay } = require('./testKnowledgeDecay');
const { testCharacterTeachingStyles } = require('./testCharacterTeachingStyles');
const { testGameStateMachine } = require('./testGameStateMachine');
const { runDialogueProgressionTests } = require('./dialogueProgressionTest');

function runTests() {
  console.log("🧪 ROGUE RESIDENT - PROGRESSION TESTS 🧪");
  console.log("------------------------------------------");
  
  // Collection of test functions to run
  const tests = [
    testJournalAcquisition,
    testDialogueProgression,
    testBossEncounter,
    testDayNightCycle,
    testKnowledgeAcquisition,
    testNodeAccessibility,
    testItemEffectSystem,
    testKnowledgeDecay,
    testCharacterTeachingStyles,
    testGameStateMachine,
    runDialogueProgressionTests  // Add our new dialogue flow tests
  ];
  
  let passed = 0;
  const failed = [];
  
  // Run each test
  tests.forEach(test => {
    try {
      console.log(`\nRunning: ${test.name}`);
      console.log("------------------------------------------");
      const result = test();
      
      // Handle both boolean returns and void returns (assume success if no error)
      if (result === false) {
        throw new Error(`Test returned false`);
      }
      
      console.log(`✅ PASSED: ${test.name}`);
      passed++;
    } catch (error) {
      console.error(`❌ FAILED: ${test.name}`);
      console.error(`   Error: ${error.message}`);
      if (error.stack) {
        console.error(`   Stack: ${error.stack.split('\n')[1]}`);
      }
      failed.push({name: test.name, error});
    }
  });
  
  // Summary
  console.log("\n📊 TEST RESULTS SUMMARY");
  console.log("------------------------------------------");
  console.log(`Passed: ${passed}/${tests.length} (${Math.round(passed/tests.length*100)}%)`);
  
  if (failed.length > 0) {
    console.log("\n❌ Failed Tests:");
    failed.forEach(f => console.log(`- ${f.name}: ${f.error.message}`));
    // Exit with failure code, but don't terminate prematurely
    process.exitCode = 1;
  } else {
    console.log("\n🎮 All tests passed! Your narrative systems are ready for player engagement.");
  }
}

// Run the tests
runTests();