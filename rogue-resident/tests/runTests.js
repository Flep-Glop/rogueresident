// tests/runTests.js
/**
 * Progression Test Runner
 * 
 * A lightweight runner for executing progression validators and
 * displaying results in a readable format. Follows the Supergiant approach
 * of focusing on player experiences over implementation details.
 * 
 * Run with: node tests/runTests.js [validatorName]
 */

// Configure environment for browser-like testing
global.window = global.window || {
  localStorage: {
    getItem: (key) => global.localStorage[key],
    setItem: (key, value) => { global.localStorage[key] = value; },
    removeItem: (key) => { delete global.localStorage[key]; },
    clear: () => { global.localStorage = {}; },
    key: (i) => Object.keys(global.localStorage)[i],
    length: 0
  },
  requestAnimationFrame: (callback) => setTimeout(callback, 16),
  addEventListener: () => {}
};

// Initialize localStorage
global.localStorage = {};

// Mock for document
global.document = global.document || {
  createElement: () => ({
    setAttribute: () => {},
    click: () => {}
  }),
  querySelector: () => null,
  querySelectorAll: () => []
};

// Import validators
const progressionValidators = require('./progressionValidators').default;
const gameInterface = require('./gameInterface').default;

/**
 * Run a single validator
 * @param {string} validatorName - Name of the validator to run
 */
async function runSingleValidator(validatorName) {
  console.log(`🧪 Running validator: ${validatorName}`);
  
  const validator = progressionValidators[validatorName];
  
  if (!validator) {
    console.error(`❌ Validator "${validatorName}" not found`);
    console.log('Available validators:');
    Object.keys(progressionValidators).forEach(name => {
      console.log(`  - ${name}`);
    });
    process.exit(1);
  }
  
  console.log(`📝 Description: ${validator.description}`);
  
  // Create a step logger
  const steps = [];
  const logStep = (stepDescription) => {
    console.log(`  ▶️ ${stepDescription}`);
    steps.push(stepDescription);
  };
  
  const startTime = Date.now();
  
  try {
    // Run the validator
    const success = await validator.run(gameInterface, logStep);
    
    const endTime = Date.now();
    
    console.log(`\n${success ? '✅ PASSED' : '❌ FAILED'}: ${validator.name}`);
    console.log(`⏱️ Duration: ${((endTime - startTime) / 1000).toFixed(2)}s`);
    
    // Print execution steps
    console.log('\n📋 Executed Steps:');
    steps.forEach((step, index) => {
      console.log(`  ${index + 1}. ${step}`);
    });
    
    // Print event statistics if available
    const recordedData = gameInterface.finishRecording();
    if (recordedData) {
      console.log('\n📊 Event Statistics:');
      console.log(`  Total Events: ${recordedData.events.length}`);
      console.log(`  State Snapshots: ${recordedData.snapshots.length}`);
      
      // Print critical path completion
      if (recordedData.summary.criticalPathsCompleted.length > 0) {
        console.log('\n✓ Critical Paths Completed:');
        recordedData.summary.criticalPathsCompleted.forEach(path => {
          console.log(`  - ${path}`);
        });
      }
      
      // Print progression blocks if any
      if (recordedData.summary.progressionBlocks.length > 0) {
        console.log('\n⚠️ Progression Issues Detected:');
        recordedData.summary.progressionBlocks.forEach(block => {
          console.log(`  - ${block.description} (${block.blockType})`);
        });
      }
    }
    
    return success;
  } catch (error) {
    console.error(`\n🚨 Error in validator "${validator.name}":`, error);
    return false;
  }
}

/**
 * Run all validators
 */
async function runAllValidators() {
  console.log('🧪 Running all progression validators');
  
  const results = [];
  
  for (const [name, validator] of Object.entries(progressionValidators)) {
    console.log('\n' + '='.repeat(50));
    
    try {
      const success = await runSingleValidator(name);
      results.push({ name, success });
    } catch (error) {
      console.error(`Error running validator "${name}":`, error);
      results.push({ name, success: false, error: error.message });
    }
  }
  
  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results Summary:');
  
  const passedCount = results.filter(r => r.success).length;
  
  console.log(`Total validators: ${results.length}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${results.length - passedCount}`);
  
  console.log('\nDetailed Results:');
  results.forEach(result => {
    console.log(`  ${result.success ? '✅' : '❌'} ${result.name}`);
  });
  
  return passedCount === results.length;
}

/**
 * Main function
 */
async function main() {
  console.log('🎮 ROGUE RESIDENT - PROGRESSION TEST RUNNER 🎮');
  console.log('='.repeat(50));
  
  const args = process.argv.slice(2);
  const validatorName = args[0];
  const isDebug = args.includes('--debug');
  
  // Set debug mode
  if (isDebug) {
    console.log('🔍 Debug mode enabled');
    global.DEBUG = true;
  }
  
  try {
    if (validatorName) {
      // Run a specific validator
      const success = await runSingleValidator(validatorName);
      process.exit(success ? 0 : 1);
    } else {
      // Run all validators
      const allPassed = await runAllValidators();
      process.exit(allPassed ? 0 : 1);
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
  process.exit(1);
});

// Run the main function
main();