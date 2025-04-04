// runTests.ts - Test runner for progression guarantees

import { runProgressionTestSuite } from './ProgressionTestSuite';

/**
 * Simple test runner for Rogue Resident's progression tests
 * 
 * Run with: npx ts-node runTests.ts
 * 
 * This validates critical progression paths using the state machine
 * and progression guarantor systems, ensuring reliable game flow.
 */

console.log("🧪 ROGUE RESIDENT - PROGRESSION TEST SUITE 🧪");
console.log("==============================================");
console.log("Testing critical game progression paths...\n");

// Set up mock DOM environment if needed
// This is only necessary if your tests require browser APIs
if (typeof window === 'undefined') {
  global.window = {} as any;
}

// Ensure we can catch unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('CRITICAL: Unhandled promise rejection in tests:', error);
  process.exit(1);
});

// Run the test suite and output formatted results
try {
  const results = runProgressionTestSuite();
  
  console.log("\n📊 RESULTS SUMMARY");
  console.log("==============================================");
  console.log(`Total tests: ${results.summary.total}`);
  console.log(`Passed: ${results.summary.passed}`);
  console.log(`Failed: ${results.summary.failed}`);
  console.log(`Critical failures: ${results.summary.criticalFailures}`);
  
  // Generate detailed report for failed tests
  if (results.summary.failed > 0) {
    console.log("\n⚠️ FAILED TESTS DETAILS");
    console.log("==============================================");
    
    results.tests
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(`\n❌ ${test.name}`);
        console.log(`   Failed expectations:`);
        test.failedExpectations.forEach(failure => {
          console.log(`   - ${failure}`);
        });
        
        if (test.criticalFailures.length > 0) {
          console.log(`   CRITICAL FAILURES:`);
          test.criticalFailures.forEach(critical => {
            console.log(`   - 🚨 ${critical}`);
          });
        }
      });
  }
  
  // Exit with appropriate code
  process.exit(results.summary.failed > 0 ? 1 : 0);
} catch (error) {
  console.error("❌ Test runner failed with error:", error);
  process.exit(1);
}
