// tests/simpleRunner.js
/**
 * Simple Test Runner for Rogue Resident
 * 
 * A straightforward testing framework designed specifically for game systems,
 * supporting both individual test runs and comprehensive test suites.
 * 
 * Features:
 * - Styled console output for better readability
 * - Timeout protection for long-running or stuck tests
 * - Game state reset between tests
 * - Test statistics and summary
 */

const fs = require('fs');
const path = require('path');
const { useGameStore } = require('../app/store/gameStore');
const { useJournalStore } = require('../app/store/journalStore');
const { useKnowledgeStore } = require('../app/store/knowledgeStore');

class TestRunner {
  constructor() {
    this.testDir = __dirname;
    this.testFiles = [];
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      totalDuration: 0
    };
    this.startTime = 0;
    this.testTimeout = 10000; // Default timeout: 10 seconds
  }

  /**
   * Set test timeout duration
   * @param {number} milliseconds - Timeout in milliseconds
   */
  setTimeout(milliseconds) {
    this.testTimeout = milliseconds;
  }

  /**
   * Load all available test files from the tests directory
   * @param {string} [pattern] - Optional pattern to match test files
   * @returns {Array} Array of test file objects
   */
  loadTestFiles(pattern = null) {
    const testPattern = pattern || /(^test|Test\.js$)/;
    
    this.testFiles = fs.readdirSync(this.testDir)
      .filter(file => testPattern.test(file) && file.endsWith('.js'))
      .map(file => ({
        name: file.replace('.js', ''),
        path: path.join(this.testDir, file),
        executed: false,
        success: null,
        error: null,
        duration: 0
      }));
    
    return this.testFiles;
  }

  /**
   * Reset game state between tests
   */
  resetGameState() {
    try {
      // Reset game stores to clean state
      const gameStore = useGameStore.getState();
      const journalStore = useJournalStore.getState();
      const knowledgeStore = useKnowledgeStore.getState();
      
      if (gameStore.resetGame) gameStore.resetGame();
      if (journalStore.reset) journalStore.reset();
      if (knowledgeStore.reset) knowledgeStore.reset();
      
      // Clear localStorage (browser environment) if available
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('rogue-resident-game');
        localStorage.removeItem('rogue-resident-journal');
        localStorage.removeItem('rogue-resident-knowledge');
      }
      
      console.log('🧹 Game state reset');
    } catch (e) {
      console.warn('⚠️ Unable to reset game state:', e.message);
    }
  }

  /**
   * Run a specific test by name
   * @param {string} testName - Name of the test to run
   * @returns {Promise<boolean>} True if test passed
   */
  async runTest(testName) {
    console.log(`\n${boxText(`🧪 RUNNING TEST: ${testName}`, 'blue')}`);
    
    const testFile = this.testFiles.find(t => t.name === testName);
    if (!testFile) {
      console.error(colorText(`Test "${testName}" not found!`, 'red'));
      return false;
    }
    
    // Reset game state before test
    this.resetGameState();
    
    // Record start time
    const testStartTime = Date.now();
    testFile.startTime = testStartTime;
    
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Test timed out after ${this.testTimeout}ms`));
      }, this.testTimeout);
    });
    
    try {
      // Load test module
      const testModule = require(testFile.path);
      
      // Run test with timeout protection
      await Promise.race([
        // Execute test function
        (async () => {
          if (typeof testModule === 'function') {
            await testModule();
          } else if (typeof testModule.run === 'function') {
            await testModule.run();
          } else if (typeof testModule.default === 'function') {
            await testModule.default();
          } else {
            throw new Error(`Test file ${testName} does not export a runnable function`);
          }
        })(),
        timeoutPromise
      ]);
      
      // Calculate duration
      const testDuration = Date.now() - testStartTime;
      testFile.duration = testDuration;
      this.results.totalDuration += testDuration;
      
      // Mark as successful
      testFile.executed = true;
      testFile.success = true;
      this.results.passed++;
      
      console.log(`\n${boxText(`✅ TEST PASSED: ${testName} (${formatDuration(testDuration)})`, 'green')}\n`);
      return true;
    } catch (error) {
      // Calculate duration
      const testDuration = Date.now() - testStartTime;
      testFile.duration = testDuration;
      this.results.totalDuration += testDuration;
      
      // Mark as failed
      testFile.executed = true;
      testFile.success = false;
      testFile.error = error;
      this.results.failed++;
      
      console.error(`\n${boxText(`❌ TEST FAILED: ${testName} (${formatDuration(testDuration)})`, 'red')}`);
      console.error(colorText(error.stack || error.message, 'red'));
      console.error('\n');
      return false;
    } finally {
      // Clean up any leftover timers or resources
      if (global.gc) {
        try {
          global.gc();
        } catch (e) {
          // Ignore GC errors
        }
      }
    }
  }

  /**
   * Run all tests
   * @param {boolean} [stopOnFailure=false] - Whether to stop on first failure
   */
  async runAllTests(stopOnFailure = false) {
    console.log(boxText('🧪 RUNNING ALL TESTS', 'blue'));
    
    // Record overall start time
    this.startTime = Date.now();
    
    // Load test files if not already loaded
    if (this.testFiles.length === 0) {
      this.loadTestFiles();
    }
    
    let stopTests = false;
    
    // Run each test
    for (const testFile of this.testFiles) {
      if (stopTests) {
        testFile.executed = false;
        testFile.success = null;
        this.results.skipped++;
        continue;
      }
      
      const success = await this.runTest(testFile.name);
      
      if (!success && stopOnFailure) {
        console.log(colorText('⛔ Stopping tests due to failure', 'yellow'));
        stopTests = true;
      }
      
      // Small delay between tests to allow state cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Print summary
    this.printSummary();
  }

  /**
   * Print test run summary
   */
  printSummary() {
    const totalDuration = Date.now() - this.startTime;
    
    console.log(`\n${boxText('📊 TEST RESULTS SUMMARY', 'blue')}`);
    console.log(`Total Tests: ${this.testFiles.length}`);
    console.log(`${colorText(`✅ Passed: ${this.results.passed}`, 'green')}`);
    console.log(`${colorText(`❌ Failed: ${this.results.failed}`, this.results.failed > 0 ? 'red' : 'default')}`);
    console.log(`${colorText(`⏩ Skipped: ${this.results.skipped}`, this.results.skipped > 0 ? 'yellow' : 'default')}`);
    console.log(`🕒 Total Duration: ${formatDuration(totalDuration)}`);
    
    if (this.results.failed > 0) {
      console.log('\nFailed Tests:');
      this.testFiles
        .filter(test => test.executed && !test.success)
        .forEach(test => {
          console.log(colorText(`  - ${test.name}: ${test.error?.message || 'Unknown error'}`, 'red'));
        });
    }
    
    console.log('\nFastest Tests:');
    this.testFiles
      .filter(test => test.executed && test.success)
      .sort((a, b) => a.duration - b.duration)
      .slice(0, 3)
      .forEach(test => {
        console.log(`  - ${test.name}: ${formatDuration(test.duration)}`);
      });
    
    if (this.testFiles.filter(test => test.executed && test.success).length > 3) {
      console.log('\nSlowest Tests:');
      this.testFiles
        .filter(test => test.executed && test.success)
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 3)
        .forEach(test => {
          console.log(`  - ${test.name}: ${formatDuration(test.duration)}`);
        });
    }
    
    console.log('\n');
  }
}

/**
 * Create a box around text
 * @param {string} text - Text to box
 * @param {string} [color] - Color for the box
 * @returns {string} Boxed text
 */
function boxText(text, color) {
  const boxWidth = text.length + 4;
  const horizontalBar = '━'.repeat(boxWidth);
  
  return colorText(
    `┏${horizontalBar}┓\n` +
    `┃  ${text}  ┃\n` +
    `┗${horizontalBar}┛`,
    color
  );
}

/**
 * Apply ANSI color to text
 * @param {string} text - Text to color
 * @param {string} [color='default'] - Color name
 * @returns {string} Colored text
 */
function colorText(text, color = 'default') {
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    default: '\x1b[0m'
  };
  
  const selectedColor = colors[color] || colors.default;
  const reset = '\x1b[0m';
  
  return `${selectedColor}${text}${reset}`;
}

/**
 * Format duration in milliseconds to a readable string
 * @param {number} milliseconds - Duration in milliseconds
 * @returns {string} Formatted duration
 */
function formatDuration(milliseconds) {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  } else if (milliseconds < 60000) {
    return `${(milliseconds / 1000).toFixed(2)}s`;
  } else {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = ((milliseconds % 60000) / 1000).toFixed(2);
    return `${minutes}m ${seconds}s`;
  }
}

// If this script is run directly, execute all tests
if (require.main === module) {
  const runner = new TestRunner();
  
  // Check if a specific test was requested
  const requestedTest = process.argv[2];
  if (requestedTest) {
    runner.loadTestFiles();
    runner.runTest(requestedTest);
  } else {
    runner.runAllTests();
  }
}

module.exports = new TestRunner();