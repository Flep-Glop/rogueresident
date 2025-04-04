// tests/runTests.ts
/**
 * Test Runner for Progression Tests
 * 
 * This module dynamically imports the test suite to avoid circular dependencies.
 * It sets up a minimal test environment and formats test results.
 * 
 * Run with: npm run test:progression
 */

// Set up any global mocks needed
if (typeof window === 'undefined') {
  // Use standard JS syntax instead of TypeScript type assertion
  global.window = {
    // Mock any browser APIs needed for tests
    localStorage: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn()
    },
    fs: {
      readFile: jest.fn().mockImplementation((path, options) => {
        return Promise.resolve(Buffer.from('Mock file content'));
      })
    }
  };
}

// Set up mock for Jest
if (typeof jest === 'undefined') {
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
    mock: (moduleName, factory) => {
      // Simple mock for testing
      console.log(`Mocking module: ${moduleName}`);
    },
    clearAllMocks: () => {
      console.log('Clearing all mocks');
    },
    resetAllMocks: () => {
      console.log('Resetting all mocks');
    },
    restoreAllMocks: () => {
      console.log('Restoring all mocks');
    }
  };
}

/**
 * Run the test suite
 */
async function main() {
  console.log("🧪 ROGUE RESIDENT - PROGRESSION TEST SUITE 🧪");
  console.log("==============================================");
  console.log("Testing critical game progression paths...\n");
  
  try {
    // Dynamically import the test suite to avoid circular dependencies
    const { runProgressionTestSuite } = await import('./ProgressionTestSuite.js');
    
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