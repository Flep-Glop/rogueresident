// tests/js/testDefinitions.js
/**
 * Test Definitions - Centralized Configuration for Progression Tests
 * 
 * This module contains only static test definitions to avoid circular imports.
 * It defines test parameters but contains no direct imports of test execution code.
 */

// Define test constants for event types
const TEST_EVENT_TYPES = {
    SESSION_STARTED: 'session:started',
    NODE_COMPLETED: 'node:completed',
    JOURNAL_ACQUIRED: 'progression:journal:acquired',
    DIALOGUE_COMPLETED: 'dialogue:completed',
    DIALOGUE_OPTION_SELECTED: 'dialogue:option:selected',
    KNOWLEDGE_GAINED: 'knowledge:gained',
    PROGRESSION_REPAIR: 'progression:repair'
  };
  
  // Define node IDs used in tests (avoids hard-coding strings in multiple places)
  const TEST_NODE_IDS = {
    KAPOOR_CALIBRATION: 'kapoor-calibration-node',
    TUTORIAL_NODE: 'tutorial-node'
  };
  
  // Define character IDs used in tests
  const TEST_CHARACTER_IDS = {
    KAPOOR: 'kapoor',
    JESSE: 'jesse',
    QUINN: 'quinn',
    GARCIA: 'garcia'
  };
  
  // Export named test sequences that can be imported by both the runner and suite
  const TEST_SEQUENCES = {
    NORMAL_JOURNAL_ACQUISITION: 'normal-journal-acquisition',
    DIALOGUE_LOOP_RECOVERY: 'dialogue-loop-recovery',
    PROGRESSION_GUARANTOR_FALLBACK: 'progression-guarantor-fallback',
    CHECKPOINT_RECOVERY: 'checkpoint-recovery'
  };
  
  module.exports = {
    TEST_EVENT_TYPES,
    TEST_NODE_IDS,
    TEST_CHARACTER_IDS,
    TEST_SEQUENCES
  };