// tests/js/runTests.js
/**
 * Progression Test Runner
 * 
 * A streamlined test runner that focuses on progression validation
 * without the constraints of TypeScript's type system.
 * 
 * Run with: node tests/js/runTests.js
 */

// Configure environment for testing
global.window = global.window || {
  localStorage: {
    getItem: (key) => global.localStorage[key],
    setItem: (key, value) => { global.localStorage[key] = value; },
    removeItem: (key) => { delete global.localStorage[key]; },
    clear: () => { global.localStorage = {}; }
  },
  fs: {
    readFile: (path, options) => Promise.resolve(Buffer.from('Mock file content'))
  }
};

// Initialize localStorage
global.localStorage = {};

// Mock for Jest if needed
global.jest = {
  fn: () => {
    const mockFn = (...args) => {
      mockFn.mock.calls.push(args);
      return mockFn.mockImplementation ? mockFn.mockImplementation(...args) : undefined;
    };
    mockFn.mock = { calls: [] };
    mockFn.mockReturnValue = (val) => {
      mockFn.mockImplementation = () => val;
      return mockFn;
    };
    mockFn.mockImplementation = (impl) => {
      mockFn.mockImplementation = impl;
      return mockFn;
    };
    return mockFn;
  },
  clearAllMocks: () => console.log('Clearing all mocks'),
  resetAllMocks: () => console.log('Resetting all mocks'),
  restoreAllMocks: () => console.log('Restoring all mocks'),
  mock: (moduleName, factory) => console.log(`Mocking module: ${moduleName}`)
};

// Import the test suite
const { runProgressionTestSuite } = require('./progressionTestSuite');

/**
 * Run the test suite with formatted output
 */
async function main() {
  console.log("🧪 ROGUE RESIDENT - PROGRESSION TEST SUITE 🧪");
  console.log("==============================================");
  console.log("Testing critical game progression paths...\n");
  
  try {
    // Run tests and get results
    const results = await runProgressionTestSuite();
    
    // Format and display results
    console.log("\n📊 RESULTS SUMMARY");
    console.log("==============================================");
    console.log(`Total tests: ${results.summary.total}`);
    console.log(`Passed: ${results.summary.passed}`);
    console.log(`Failed: ${results.summary.failed}`);
    console.log(`Critical failures: ${results.summary.criticalFailures}`);
    
    // Output detailed results for failed tests
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
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('CRITICAL: Unhandled promise rejection in tests:', error);
  process.exit(1);
});

// Execute the main function
main().catch(error => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});