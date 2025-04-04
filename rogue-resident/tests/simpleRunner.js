// tests/simpleRunner.js
// Add this import at the top of your file
const { testJournalAcquisition, testDialogueProgression, testBossEncounter } = require('./progressionTests');

function runTests() {
  console.log("🧪 ROGUE RESIDENT - PROGRESSION TESTS 🧪");
  
  // Collection of test functions to run
  const tests = [
    testJournalAcquisition,
    testDialogueProgression,
    testBossEncounter
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
      process.exit(1);
    }
  }
  
  // Run the tests
  runTests();