// tests/simpleRunner.js
const { testJournalAcquisition, testDialogueProgression, testBossEncounter } = require('./progressionTests');
const { testDayNightCycle } = require('./testDayNightCycle');
const { testKnowledgeAcquisition } = require('./testKnowledgeAcquisition');
const { testNodeAccessibility } = require('./testNodeAccessibility');
const { testItemEffectSystem } = require('./testItemEffectSystem');
const { testKnowledgeDecay } = require('./testKnowledgeDecay');
const { testCharacterTeachingStyles } = require('./testCharacterTeachingStyles');

function runTests() {
  console.log("🧪 ROGUE RESIDENT - PROGRESSION TESTS 🧪");
  
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
    testCharacterTeachingStyles
  ];
  
  let passed = 0;
  const failed = [];
  
  // Run each test
  tests.forEach(test => {
    try {
      console.log(`Running: ${test.name}`);
      test();
      console.log(`✅ PASSED: ${test.name}`);
      passed++;
    } catch (error) {
      console.error(`❌ FAILED: ${test.name}`);
      console.error(`   Error: ${error.message}`);
      failed.push({name: test.name, error});
    }
  });
  
  // Summary
  console.log("\n📊 RESULTS");
  console.log(`Passed: ${passed}/${tests.length}`);
  
  if (failed.length > 0) {
    console.log("\nFailed Tests:");
    failed.forEach(f => console.log(`- ${f.name}: ${f.error.message}`));
    // Exit with failure code, but don't terminate prematurely
    process.exitCode = 1;
  }
}

// Run the tests
runTests();