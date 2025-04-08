// tests/assert.js
/**
 * Enhanced assertion utility for Rogue Resident testing
 * 
 * Provides descriptive error messages and context for test failures,
 * helping identify exactly which aspect of the game state is incorrect.
 * 
 * Game-specific assertions are particularly helpful for complex state 
 * management like checking state machine transitions and event sequences.
 */

/**
 * General purpose assertion with enhanced error reporting
 * 
 * @param {boolean} condition - The condition to test
 * @param {string} message - Description of what's being tested
 * @param {Object} [details] - Optional extra details for debugging
 * @throws {Error} When assertion fails
 */
function assert(condition, message, details = {}) {
    if (!condition) {
      // Create detailed error message
      console.error(`\n❌ ASSERTION FAILED: ${message}`);
      
      if (Object.keys(details).length > 0) {
        console.error('Details:', JSON.stringify(details, null, 2));
      }
      
      // Get a clean stack trace (avoiding library frames)
      const stackTrace = getCleanStackTrace();
      console.error('Location:', stackTrace);
      
      // Throw descriptive error
      throw new Error(`Assertion failed: ${message}`);
    } else {
      console.log(`  ✓ ${message}`);
    }
  }
  
  /**
   * Assert that an event of a specific type was dispatched
   * 
   * @param {Array} eventLog - Event log from EventRecorder
   * @param {string} eventType - Event type to look for
   * @param {Object} [expectedPayload] - Optional partial payload to match
   * @param {string} [message] - Custom error message
   */
  assert.eventDispatched = function(eventLog, eventType, expectedPayload, message) {
    const matchingEvents = eventLog.filter(event => event.type === eventType);
    
    // Check that at least one event of the type exists
    const eventExists = matchingEvents.length > 0;
    
    // If payload needs to match, check that too
    let payloadMatches = true;
    if (eventExists && expectedPayload) {
      payloadMatches = matchingEvents.some(event => {
        // Check that each property in expectedPayload exists and matches in the event
        return Object.entries(expectedPayload).every(([key, value]) => {
          return event.payload && event.payload[key] === value;
        });
      });
    }
    
    const condition = eventExists && payloadMatches;
    const defaultMessage = expectedPayload
      ? `Event ${eventType} with matching payload should have been dispatched`
      : `Event ${eventType} should have been dispatched`;
    
    assert(condition, message || defaultMessage, {
      eventsFound: matchingEvents.length,
      payloadMatches: payloadMatches,
      sampleEvent: matchingEvents[0]
    });
  };
  
  /**
   * Assert that a state machine transition occurred
   * 
   * @param {Object} stateMachine - State machine instance with currentState getter
   * @param {string} expectedState - Expected state
   * @param {string} [message] - Custom error message
   */
  assert.stateTransition = function(stateMachine, expectedState, message) {
    const currentState = typeof stateMachine.getCurrentState === 'function' 
      ? stateMachine.getCurrentState()
      : stateMachine.gamePhase || stateMachine.currentState || stateMachine.state;
    
    const condition = currentState === expectedState;
    const defaultMessage = `State machine should be in state '${expectedState}'`;
    
    assert(condition, message || defaultMessage, {
      currentState: currentState,
      expectedState: expectedState
    });
  };
  
  /**
   * Assert that a game store property has expected value
   * 
   * @param {Object} store - Store instance
   * @param {string} property - Property to check (can use dot notation)
   * @param {any} expectedValue - Expected value
   * @param {string} [message] - Custom error message
   */
  assert.storeProperty = function(store, property, expectedValue, message) {
    // Handle nested properties with dot notation
    const value = property.split('.').reduce((obj, prop) => {
      return obj && obj[prop] !== undefined ? obj[prop] : undefined;
    }, store);
    
    // For arrays, handle special expected values
    let condition = false;
    let specialCheck = '';
    
    if (Array.isArray(value)) {
      if (expectedValue === '<non-empty>') {
        condition = value.length > 0;
        specialCheck = 'non-empty array';
      } else if (expectedValue === '<empty>') {
        condition = value.length === 0;
        specialCheck = 'empty array';
      } else if (Array.isArray(expectedValue)) {
        condition = arraysEqual(value, expectedValue);
      } else {
        condition = value.includes(expectedValue);
        specialCheck = 'includes value';
      }
    } else {
      condition = value === expectedValue;
    }
    
    const defaultMessage = specialCheck
      ? `Store property ${property} should be ${specialCheck}`
      : `Store property ${property} should equal ${expectedValue}`;
    
    assert(condition, message || defaultMessage, {
      property: property,
      actualValue: value,
      expectedValue: expectedValue
    });
  };
  
  /**
   * Assert that multiple conditions are all true
   * 
   * @param {Array<boolean>} conditions - Array of conditions
   * @param {string} message - Error message
   */
  assert.all = function(conditions, message) {
    const allTrue = conditions.every(Boolean);
    
    if (!allTrue) {
      const failedIndices = conditions
        .map((condition, index) => ({ condition, index }))
        .filter(item => !item.condition)
        .map(item => item.index);
        
      assert(false, message, { failedConditions: failedIndices });
    } else {
      assert(true, message);
    }
  };
  
  /**
   * Assert that an event sequence occurred in order
   * 
   * @param {Array} eventLog - Event log from EventRecorder
   * @param {Array<string>} sequence - Expected sequence of event types
   * @param {string} [message] - Custom error message
   */
  assert.eventSequence = function(eventLog, sequence, message) {
    let currentIndex = 0;
    
    for (const event of eventLog) {
      if (event.type === sequence[currentIndex]) {
        currentIndex++;
        
        if (currentIndex === sequence.length) {
          break; // Sequence completed
        }
      }
    }
    
    const condition = currentIndex === sequence.length;
    const defaultMessage = `Event sequence ${sequence.join(' → ')} should have occurred`;
    
    assert(condition, message || defaultMessage, {
      sequenceProgress: `${currentIndex}/${sequence.length} events matched`,
      completedEvents: sequence.slice(0, currentIndex),
      missingEvents: sequence.slice(currentIndex)
    });
  };
  
  /**
   * Get a clean stack trace without library frames
   * @returns {string} Formatted stack trace
   */
  function getCleanStackTrace() {
    const stack = new Error().stack;
    
    if (!stack) return 'Stack unavailable';
    
    return stack
      .split('\n')
      .slice(3) // Remove Error constructor and assert function calls
      .filter(line => !line.includes('node_modules'))
      .filter(line => !line.includes('node:internal'))
      .join('\n');
  }
  
  /**
   * Check if two arrays are equal
   * @param {Array} arr1 - First array
   * @param {Array} arr2 - Second array
   * @returns {boolean} True if arrays are equal
   */
  function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    
    for (let i = 0; i < arr1.length; i++) {
      if (arr1[i] !== arr2[i]) return false;
    }
    
    return true;
  }
  
  // Export the main assert function
  module.exports = assert;