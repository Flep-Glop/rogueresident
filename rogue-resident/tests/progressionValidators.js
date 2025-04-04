// tests/progressionValidators.js
/**
 * Progression Validators
 * 
 * A collection of automated "players" that attempt to complete critical game paths.
 * Each validator represents a specific progression scenario that is essential
 * for the game to function correctly.
 * 
 * This approach tests actual player experiences rather than implementation details,
 * following the Supergiant Games philosophy of player-centered testing.
 */

import gameInterface from './gameInterface';
import { EventRecorder } from '../app/core/debug/EventRecorder';

/**
 * Results of a validation run
 * @typedef {Object} ValidationResult
 * @property {boolean} success - Whether the validation succeeded
 * @property {string} name - Name of the validator
 * @property {string} description - Description of what was being validated
 * @property {Object} recordedData - Recorded events and state snapshots
 * @property {Array<string>} steps - Steps that were executed
 * @property {string|null} failureReason - Reason for failure if unsuccessful
 * @property {number} startTime - Time validation started
 * @property {number} endTime - Time validation ended
 * @property {number} duration - Duration of validation in ms
 */

/**
 * Run a validator with error handling and timing
 * @param {Function} validatorFn - The validator function to run
 * @param {Object} validatorInfo - Information about the validator
 * @returns {Promise<ValidationResult>} Result of validation
 */
const runValidator = async (validatorFn, validatorInfo) => {
  console.log(`🧪 Running validator: ${validatorInfo.name}`);
  console.log(`📝 Description: ${validatorInfo.description}`);
  
  const startTime = Date.now();
  const steps = [];
  
  // Create a step logger that will track progress
  const logStep = (stepDescription) => {
    console.log(`  ▶️ ${stepDescription}`);
    steps.push(stepDescription);
    EventRecorder.captureSnapshot(`step:${steps.length}:${stepDescription.slice(0, 20)}`);
  };
  
  try {
    // Run the validator
    const success = await validatorFn(gameInterface, logStep);
    
    const endTime = Date.now();
    
    // Get recorded data
    const recordedData = gameInterface.finishRecording();
    
    console.log(`${success ? '✅ PASSED' : '❌ FAILED'}: ${validatorInfo.name}`);
    
    return {
      success,
      name: validatorInfo.name,
      description: validatorInfo.description,
      recordedData,
      steps,
      failureReason: success ? null : 'Validator returned false',
      startTime,
      endTime,
      duration: endTime - startTime
    };
  } catch (error) {
    console.error(`🚨 Error in validator "${validatorInfo.name}":`, error);
    
    const endTime = Date.now();
    
    // Get recorded data even if there was an error
    const recordedData = gameInterface.finishRecording();
    
    return {
      success: false,
      name: validatorInfo.name,
      description: validatorInfo.description,
      recordedData,
      steps,
      failureReason: `Error: ${error.message}`,
      startTime,
      endTime,
      duration: endTime - startTime
    };
  }
};

// Collection of progression validators
const progressionValidators = {
  /**
   * Tests the critical journal acquisition path through Dr. Kapoor's calibration
   */
  journalAcquisition: {
    name: 'Journal Acquisition',
    description: 'Validates that the player can acquire the journal through Dr. Kapoor\'s calibration node',
    run: async (gameInterface, logStep) => {
      logStep('Starting new game');
      await gameInterface.startNewGame();
      
      logStep('Getting accessible nodes');
      const accessibleNodes = gameInterface.getAccessibleNodes();
      
      if (accessibleNodes.length === 0) {
        logStep('No accessible nodes found');
        return false;
      }
      
      // Find a Kapoor calibration node
      logStep('Looking for Kapoor calibration node');
      const kapoorNode = accessibleNodes.find(nodeId => 
        nodeId.includes('kapoor') || nodeId.includes('calibration')
      );
      
      if (!kapoorNode) {
        logStep('No Kapoor calibration node found');
        return false;
      }
      
      logStep(`Selecting Kapoor node: ${kapoorNode}`);
      const nodeSelected = await gameInterface.selectNode(kapoorNode);
      
      if (!nodeSelected) {
        logStep('Failed to select Kapoor node');
        return false;
      }
      
      logStep('Completing dialogue sequence');
      await gameInterface.completeDialogueSequence('kapoor-calibration');
      
      logStep('Checking if player has journal');
      const hasJournal = gameInterface.hasJournal();
      
      logStep('Completing node');
      await gameInterface.completeCurrentNode();
      
      return hasJournal;
    }
  },
  
  /**
   * Tests the day-night cycle progression
   */
  dayNightCycle: {
    name: 'Day-Night Cycle',
    description: 'Validates that the player can progress from day phase to night phase and back',
    run: async (gameInterface, logStep) => {
      logStep('Starting new game');
      await gameInterface.startNewGame();
      
      // Complete a few nodes to enable day completion
      logStep('Completing nodes to enable day completion');
      
      for (let i = 0; i < 3; i++) {
        const accessibleNodes = gameInterface.getAccessibleNodes();
        
        if (accessibleNodes.length === 0) {
          logStep(`No accessible nodes found on iteration ${i+1}`);
          return false;
        }
        
        logStep(`Selecting node ${i+1}: ${accessibleNodes[0]}`);
        await gameInterface.selectNode(accessibleNodes[0]);
        
        logStep(`Completing node ${i+1}`);
        await gameInterface.completeCurrentNode();
      }
      
      logStep('Completing day phase');
      const dayCompleted = await gameInterface.completeDay();
      
      if (!dayCompleted) {
        logStep('Failed to complete day phase');
        return false;
      }
      
      logStep('Checking if player is in night phase');
      const inNightPhase = gameInterface.getCurrentPhase() === 'night';
      
      if (!inNightPhase) {
        logStep('Player is not in night phase');
        return false;
      }
      
      logStep('Completing night phase');
      const nightCompleted = await gameInterface.completeNight();
      
      if (!nightCompleted) {
        logStep('Failed to complete night phase');
        return false;
      }
      
      logStep('Checking if player is in day phase of next day');
      const inDayPhase = gameInterface.getCurrentPhase() === 'day';
      const onNextDay = gameInterface.getCurrentDay() === 2;
      
      return inDayPhase && onNextDay;
    }
  },
  
  /**
   * Tests progression through multiple days
   */
  multiDayProgression: {
    name: 'Multi-Day Progression',
    description: 'Validates that the player can progress through multiple days',
    run: async (gameInterface, logStep) => {
      logStep('Starting new game');
      await gameInterface.startNewGame();
      
      // Progress through 3 days
      for (let day = 1; day <= 3; day++) {
        logStep(`Starting day ${day}`);
        
        // Complete a few nodes
        for (let i = 0; i < 3; i++) {
          const accessibleNodes = gameInterface.getAccessibleNodes();
          
          if (accessibleNodes.length === 0) {
            logStep(`No accessible nodes found on day ${day}, node ${i+1}`);
            return false;
          }
          
          logStep(`Selecting node ${i+1} on day ${day}: ${accessibleNodes[0]}`);
          await gameInterface.selectNode(accessibleNodes[0]);
          
          logStep(`Completing node ${i+1} on day ${day}`);
          await gameInterface.completeCurrentNode();
        }
        
        logStep(`Completing day ${day}`);
        const dayCompleted = await gameInterface.completeDay();
        
        if (!dayCompleted) {
          logStep(`Failed to complete day ${day}`);
          return false;
        }
        
        logStep(`Completing night ${day}`);
        const nightCompleted = await gameInterface.completeNight();
        
        if (!nightCompleted) {
          logStep(`Failed to complete night ${day}`);
          return false;
        }
        
        // Verify day counter increased
        const currentDay = gameInterface.getCurrentDay();
        logStep(`Checking current day: ${currentDay}`);
        
        if (currentDay !== day + 1) {
          logStep(`Day counter did not increase correctly. Expected ${day + 1}, got ${currentDay}`);
          return false;
        }
      }
      
      return true;
    }
  },
  
  /**
   * Tests the critical progression protection system
   */
  progressionProtection: {
    name: 'Progression Protection',
    description: 'Validates that critical progression sequences are protected against failures',
    run: async (gameInterface, logStep) => {
      // This validator intentionally tries to "break" the game progression
      // to verify the protection systems catch and repair the issues
      
      logStep('Starting new game');
      await gameInterface.startNewGame();
      
      // Get a Kapoor calibration node but don't complete dialogue properly
      logStep('Finding and selecting Kapoor node');
      const accessibleNodes = gameInterface.getAccessibleNodes();
      const kapoorNode = accessibleNodes.find(nodeId => 
        nodeId.includes('kapoor') || nodeId.includes('calibration')
      );
      
      if (!kapoorNode) {
        logStep('No Kapoor calibration node found');
        return false;
      }
      
      await gameInterface.selectNode(kapoorNode);
      
      // Instead of properly completing dialogue, just complete the node
      // This should trigger progression protection when completing the node
      logStep('Completing node without proper dialogue completion');
      await gameInterface.completeCurrentNode();
      
      // Check if journal was acquired despite skipping dialogue
      logStep('Checking if journal was acquired through progression protection');
      const hasJournal = gameInterface.hasJournal();
      
      return hasJournal;
    }
  }
};

/**
 * Run a specific validator by name
 * @param {string} validatorName - Name of the validator to run
 * @returns {Promise<ValidationResult>} Result of validation
 */
export async function runValidator(validatorName) {
  const validator = progressionValidators[validatorName];
  
  if (!validator) {
    throw new Error(`Validator "${validatorName}" not found`);
  }
  
  return runValidatorFn(validator.run, validator);
}

/**
 * Run all progression validators
 * @returns {Promise<Array<ValidationResult>>} Results of all validations
 */
export async function runAllValidators() {
  const results = [];
  
  for (const [name, validator] of Object.entries(progressionValidators)) {
    results.push(await runValidatorFn(validator.run, validator));
  }
  
  return results;
}

/**
 * Run a validator function with proper setup and teardown
 * @param {Function} validatorFn - The validator function to run
 * @param {Object} validatorInfo - Information about the validator
 * @returns {Promise<ValidationResult>} Result of validation
 */
async function runValidatorFn(validatorFn, validatorInfo) {
  // Create step logger
  const steps = [];
  const logStep = (stepDescription) => {
    console.log(`  ▶️ ${stepDescription}`);
    steps.push(stepDescription);
  };
  
  const startTime = Date.now();
  
  try {
    // Run the validator
    const success = await validatorFn(gameInterface, logStep);
    
    const endTime = Date.now();
    const recordedData = gameInterface.exportRecordedData();
    
    console.log(`${success ? '✅ PASSED' : '❌ FAILED'}: ${validatorInfo.name}`);
    
    return {
      success,
      name: validatorInfo.name,
      description: validatorInfo.description,
      recordedData,
      steps,
      failureReason: success ? null : 'Validator returned false',
      startTime,
      endTime,
      duration: endTime - startTime
    };
  } catch (error) {
    console.error(`🚨 Error in validator "${validatorInfo.name}":`, error);
    
    const endTime = Date.now();
    
    return {
      success: false,
      name: validatorInfo.name,
      description: validatorInfo.description,
      recordedData: gameInterface.exportRecordedData(),
      steps,
      failureReason: `Error: ${error.message}`,
      startTime,
      endTime,
      duration: endTime - startTime
    };
  }
}

export default progressionValidators;