// tests/simpleRunner.js
/**
 * Simple Test Runner for Rogue Resident
 * 
 * Provides a clean, synchronous way to run test suites with proper reporting
 * and error handling, including support for asynchronous tests.
 */

const testDialogueSystem = require('./testDialogueSystem');
const testKnowledgeSystem = require('./testKnowledgeSystem');
const testResourceSystems = require('./testResourceSystems');
const runVerticalSliceTest = require('./verticalSliceIntegrationTest');

/**
 * Run the test suite with proper error handling and reporting
 */
async function runTests() {
  console.log("\n🎮 ROGUE RESIDENT - TEST SUITE 🎮");
  console.log("------------------------------------------");
  
  // Only include tests that actually exist in your project
  const tests = [
    testDialogueSystem,
    testKnowledgeSystem,
    testResourceSystems,
    runVerticalSliceTest
  ];
  
  let passed = 0;
  const failed = [];
  
  // Run each test
  for (const test of tests) {
    try {
      console.log(`\nRunning: ${test.name || 'Anonymous test'}`);
      console.log("------------------------------------------");
      
      // Handle both synchronous and asynchronous tests
      if (test.constructor.name === 'AsyncFunction') {
        await test();
      } else {
        test();
      }
      
      console.log(`✅ PASSED: ${test.name || 'Anonymous test'}`);
      passed++;
    } catch (error) {
      console.error(`❌ FAILED: ${test.name || 'Anonymous test'}`);
      console.error(`   Error: ${error.message}`);
      if (error.stack) {
        console.error(`   Stack: ${error.stack.split('\n')[1]}`);
      }
      failed.push({name: test.name || 'Anonymous test', error});
    }
  }
  
  // Summary
  console.log("\n📊 TEST RESULTS SUMMARY");
  console.log("------------------------------------------");
  console.log(`Passed: ${passed}/${tests.length} (${Math.round(passed/tests.length*100)}%)`);
  
  if (failed.length > 0) {
    console.log("\n❌ Failed Tests:");
    failed.forEach(f => console.log(`- ${f.name}: ${f.error.message}`));
    process.exitCode = 1;
  } else {
    console.log("\n🏆 All tests passed! Your systems are rock solid and ready for players.");
  }
}

// Run the tests
runTests().catch(error => {
  console.error("💥 Test runner crashed:", error);
  process.exitCode = 1;
});

// If the module is run directly
if (require.main === module) {
  // Already running tests via the call above
} else {
  // If imported, export the runner function
  module.exports = runTests;
}