// tests/gameInterface.js
// @ts-nocheck
/**
 * Game Interface
 * 
 * An abstraction layer for interacting with the game state during automated testing.
 * This provides a higher-level API for progression validators that mimics
 * actual player interactions rather than directly manipulating implementation.
 * 
 * Inspired by the Supergiant Games approach of testing real player journeys.
 */

import { useGameStore } from '../app/store/gameStore';
import { useJournalStore } from '../app/store/journalStore';
import { useDialogueStateMachine } from '../app/core/dialogue/DialogueStateMachine';
import { useEventBus, GameEventType } from '../app/core/events/CentralEventBus';
import { EventRecorder } from '../app/core/debug/EventRecorder';

/**
 * Wait for a specific event to be dispatched
 * @param {GameEventType} eventType - The event type to wait for
 * @param {Object} options - Options for waiting
 * @param {number} options.timeout - Maximum time to wait in ms
 * @param {Function} options.filter - Optional filter function to apply to events
 * @returns {Promise<GameEvent>} The event that was dispatched
 */
const waitForEvent = (eventType, options = {}) => {
  const timeout = options.timeout || 5000;
  const filter = options.filter || (() => true);
  
  return new Promise((resolve, reject) => {
    // Track if we've already resolved/rejected to avoid multiple calls
    let settled = false;
    
    // Setup timeout
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      unsubscribe();
      reject(new Error(`Timeout waiting for event ${eventType}`));
    }, timeout);
    
    // Subscribe to event
    const unsubscribe = useEventBus.getState().subscribe(eventType, (event) => {
      if (settled) return;
      
      // Check if event matches filter
      if (filter(event)) {
        settled = true;
        clearTimeout(timeoutId);
        unsubscribe();
        resolve(event);
      }
    });
  });
};

/**
 * Wait for multiple game frames to pass
 * @param {number} frames - Number of frames to wait
 * @returns {Promise<void>}
 */
const waitFrames = (frames = 2) => {
  return new Promise(resolve => {
    let framesElapsed = 0;
    
    const frameCallback = () => {
      framesElapsed++;
      
      if (framesElapsed >= frames) {
        resolve();
      } else {
        requestAnimationFrame(frameCallback);
      }
    };
    
    requestAnimationFrame(frameCallback);
  });
};

/**
 * Wait for a specific amount of time
 * @param {number} ms - Time to wait in milliseconds
 * @returns {Promise<void>}
 */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Game interface for automated testing
 */
const gameInterface = {
  /**
   * Start a new game
   * @param {Object} config - Game start configuration
   * @returns {Promise<void>}
   */
  startNewGame: async (config = {}) => {
    // Record starting event
    EventRecorder.startCapture({
      recordingMode: 'automated',
      seed: config.seed
    });
    
    console.log('🎮 Starting new game with config:', config);
    
    // Reset game state if needed
    if (useGameStore.getState().gameState !== 'not_started') {
      useGameStore.getState().resetGame();
      await waitFrames(5);
    }
    
    // Start new game
    useGameStore.getState().startGame(config);
    
    // Wait for session started event
    await waitForEvent(GameEventType.SESSION_STARTED, { timeout: 2000 })
      .catch(() => console.log('No SESSION_STARTED event, continuing anyway'));
    
    // Wait for map generation
    await waitForEvent(GameEventType.MAP_GENERATED, { timeout: 2000 })
      .catch(() => console.log('No MAP_GENERATED event, continuing anyway'));
    
    // Additional wait to ensure everything is loaded
    await waitFrames(10);
    
    EventRecorder.captureSnapshot('game_started');
    
    return true;
  },
  
  /**
   * Get all accessible nodes in the current state
   * @returns {Array<string>} Array of accessible node IDs
   */
  getAccessibleNodes: () => {
    const { map, completedNodeIds } = useGameStore.getState();
    
    if (!map || !map.nodes) {
      console.warn('No map available when getting accessible nodes');
      return [];
    }
    
    return map.nodes
      .filter(node => useGameStore.getState().isNodeAccessible(node.id))
      .map(node => node.id);
  },
  
  /**
   * Select a node on the map
   * @param {string} nodeId - The ID of the node to select
   * @returns {Promise<boolean>} True if node was selected successfully
   */
  selectNode: async (nodeId) => {
    console.log(`🗺️ Selecting node: ${nodeId}`);
    
    const { map, isNodeAccessible } = useGameStore.getState();
    
    if (!map || !map.nodes) {
      console.error('No map available when selecting node');
      return false;
    }
    
    // Check if node exists
    const node = map.nodes.find(n => n.id === nodeId);
    if (!node) {
      console.error(`Node ${nodeId} does not exist on the map`);
      return false;
    }
    
    // Check if node is accessible
    if (!isNodeAccessible(nodeId)) {
      console.error(`Node ${nodeId} is not accessible`);
      return false;
    }
    
    EventRecorder.captureSnapshot(`before_select_node_${nodeId}`);
    
    // Select the node
    useGameStore.getState().setCurrentNode(nodeId);
    
    // Wait for node selection event
    await waitForEvent(GameEventType.NODE_SELECTED, { 
      timeout: 2000,
      filter: (event) => event.payload?.nodeId === nodeId
    }).catch(() => console.log(`No NODE_SELECTED event for ${nodeId}, continuing anyway`));
    
    EventRecorder.captureSnapshot(`after_select_node_${nodeId}`);
    
    // Wait for a short time to allow UI updates
    await waitFrames(5);
    
    return useGameStore.getState().currentNodeId === nodeId;
  },
  
  /**
   * Complete the current challenge/node
   * @returns {Promise<boolean>} True if node was completed successfully
   */
  completeCurrentNode: async () => {
    const { currentNodeId } = useGameStore.getState();
    
    if (!currentNodeId) {
      console.error('No current node to complete');
      return false;
    }
    
    console.log(`🏁 Completing node: ${currentNodeId}`);
    EventRecorder.captureSnapshot(`before_complete_node_${currentNodeId}`);
    
    // Complete the node
    useGameStore.getState().completeNode(currentNodeId);
    
    // Wait for node completion event
    await waitForEvent(GameEventType.NODE_COMPLETED, { 
      timeout: 2000,
      filter: (event) => event.payload?.nodeId === currentNodeId
    }).catch(() => console.log('No NODE_COMPLETED event, continuing anyway'));
    
    EventRecorder.captureSnapshot(`after_complete_node_${currentNodeId}`);
    
    return useGameStore.getState().completedNodeIds.includes(currentNodeId);
  },
  
  /**
   * Complete dialogue sequence by following a specified path
   * @param {string} flowId - The ID of the dialogue flow
   * @param {Array<string>} optionPath - Option IDs to select in sequence (optional)
   * @returns {Promise<boolean>} True if dialogue was completed successfully
   */
  completeDialogueSequence: async (flowId, optionPath = []) => {
    const dialogueStateMachine = useDialogueStateMachine.getState();
    
    console.log(`💬 Completing dialogue sequence: ${flowId}`);
    EventRecorder.captureSnapshot(`before_dialogue_${flowId}`);
    
    // Check if we need to initialize the dialogue
    if (!dialogueStateMachine.activeFlow || dialogueStateMachine.activeFlow.id !== flowId) {
      // Find a flow factory function - for example, createKapoorCalibrationFlow
      const flowFactory = findDialogueFlowFactory(flowId);
      
      if (!flowFactory) {
        console.error(`No dialogue flow factory found for ${flowId}`);
        return false;
      }
      
      // Initialize the flow
      const flow = flowFactory(useGameStore.getState().currentNodeId || 'unknown-node');
      dialogueStateMachine.initializeFlow(flow);
      
      // Wait for dialogue started event
      await waitForEvent(GameEventType.DIALOGUE_STARTED, {
        timeout: 2000,
        filter: (event) => event.payload?.flowId === flowId
      }).catch(() => console.log('No DIALOGUE_STARTED event, continuing anyway'));
      
      // Wait for a short time to allow UI updates
      await waitFrames(5);
    }
    
    // If option path is provided, follow it
    if (optionPath.length > 0) {
      for (const optionId of optionPath) {
        await selectDialogueOption(optionId);
      }
    } else {
      // Auto-complete by selecting best options and advancing until complete
      await autoCompleteDialogue();
    }
    
    EventRecorder.captureSnapshot(`after_dialogue_${flowId}`);
    
    // Check if dialogue was successfully completed
    return !dialogueStateMachine.activeFlow;
  },
  
  /**
   * Complete the current day phase
   * @returns {Promise<boolean>} True if day was completed successfully
   */
  completeDay: async () => {
    const { gameState, gamePhase } = useGameStore.getState();
    
    if (gameState !== 'in_progress' || gamePhase !== 'day') {
      console.error('Not in day phase, cannot complete day');
      return false;
    }
    
    console.log('🌞 Completing day phase');
    EventRecorder.captureSnapshot('before_complete_day');
    
    // Complete the day
    useGameStore.getState().completeDay();
    
    // Wait for night phase
    await waitForEvent(GameEventType.GAME_PHASE_CHANGED, {
      timeout: 5000,
      filter: (event) => event.payload?.to === 'night'
    }).catch(() => console.log('No GAME_PHASE_CHANGED event, continuing anyway'));
    
    EventRecorder.captureSnapshot('after_complete_day');
    
    return useGameStore.getState().gamePhase === 'night';
  },
  
  /**
   * Complete the current night phase
   * @returns {Promise<boolean>} True if night was completed successfully
   */
  completeNight: async () => {
    const { gameState, gamePhase } = useGameStore.getState();
    
    if (gameState !== 'in_progress' || gamePhase !== 'night') {
      console.error('Not in night phase, cannot complete night');
      return false;
    }
    
    console.log('🌙 Completing night phase');
    EventRecorder.captureSnapshot('before_complete_night');
    
    // Complete the night
    useGameStore.getState().completeNight();
    
    // Wait for day phase
    await waitForEvent(GameEventType.GAME_PHASE_CHANGED, {
      timeout: 5000,
      filter: (event) => event.payload?.to === 'day'
    }).catch(() => console.log('No GAME_PHASE_CHANGED event, continuing anyway'));
    
    EventRecorder.captureSnapshot('after_complete_night');
    
    return useGameStore.getState().gamePhase === 'day';
  },
  
  /**
   * Check if the player has the journal
   * @returns {boolean} True if player has journal
   */
  hasJournal: () => {
    return useJournalStore.getState().hasJournal;
  },
  
  /**
   * Get the current game phase
   * @returns {string} Current game phase
   */
  getCurrentPhase: () => {
    return useGameStore.getState().gamePhase;
  },
  
  /**
   * Get the current game state
   * @returns {string} Current game state
   */
  getGameState: () => {
    return useGameStore.getState().gameState;
  },
  
  /**
   * Get completed node IDs
   * @returns {Array<string>} Array of completed node IDs
   */
  getCompletedNodeIds: () => {
    return [...useGameStore.getState().completedNodeIds];
  },
  
  /**
   * Get player health
   * @returns {number} Current player health
   */
  getPlayerHealth: () => {
    return useGameStore.getState().player.health;
  },
  
  /**
   * Get player insight
   * @returns {number} Current player insight
   */
  getPlayerInsight: () => {
    return useGameStore.getState().player.insight;
  },
  
  /**
   * Get current day number
   * @returns {number} Current day
   */
  getCurrentDay: () => {
    return useGameStore.getState().currentDay;
  },
  
  /**
   * Export current game state for debugging
   * @returns {Object} Current game state
   */
  exportCurrentState: () => {
    return {
      gameStore: {
        gameState: useGameStore.getState().gameState,
        gamePhase: useGameStore.getState().gamePhase,
        currentNodeId: useGameStore.getState().currentNodeId,
        completedNodeIds: useGameStore.getState().completedNodeIds,
        player: useGameStore.getState().player,
        currentDay: useGameStore.getState().currentDay
      },
      journalStore: {
        hasJournal: useJournalStore.getState().hasJournal,
        currentUpgrade: useJournalStore.getState().currentUpgrade
      },
      dialogueState: dialogueStateInfo()
    };
  },
  
  /**
   * Export recorded events and state snapshots
   * @returns {Object} Recorded data
   */
  exportRecordedData: () => {
    return EventRecorder.exportSession();
  },
  
  /**
   * Stop recording and export data
   * @returns {Object} Recorded data
   */
  finishRecording: () => {
    return EventRecorder.stopCapture();
  }
};

/**
 * Helper to select a dialogue option
 * @param {string} optionId - The ID of the option to select
 * @returns {Promise<void>}
 */
async function selectDialogueOption(optionId) {
  const dialogueStateMachine = useDialogueStateMachine.getState();
  
  if (!dialogueStateMachine.activeFlow) {
    console.error('No active dialogue flow when selecting option');
    return false;
  }
  
  // Select the option
  dialogueStateMachine.selectOption(optionId);
  
  // Wait for option selected event
  await waitForEvent(GameEventType.DIALOGUE_OPTION_SELECTED, {
    timeout: 2000,
    filter: (event) => event.payload?.optionId === optionId
  }).catch(() => console.log(`No DIALOGUE_OPTION_SELECTED event for ${optionId}, continuing anyway`));
  
  // Wait for a short time to allow responses to show
  await wait(500);
  
  // Advance state after response is shown
  if (dialogueStateMachine.showResponse || dialogueStateMachine.showBackstory) {
    dialogueStateMachine.advanceState();
    await wait(500);
  }
  
  return true;
}

/**
 * Automatically complete dialogue by selecting options and advancing
 * @returns {Promise<boolean>} True if completed successfully
 */
async function autoCompleteDialogue() {
  const dialogueStateMachine = useDialogueStateMachine.getState();
  let iterations = 0;
  const MAX_ITERATIONS = 50; // Safety to prevent infinite loops
  
  while (dialogueStateMachine.activeFlow && iterations < MAX_ITERATIONS) {
    iterations++;
    
    // Handle showing response or backstory
    if (dialogueStateMachine.showResponse || dialogueStateMachine.showBackstory) {
      dialogueStateMachine.advanceState();
      await wait(300);
      continue;
    }
    
    // Get available options
    const options = dialogueStateMachine.getAvailableOptions();
    
    if (options && options.length > 0) {
      // Prefer options marked as critical path
      const criticalOption = options.find(o => o.isCriticalPath);
      const selectedOption = criticalOption || options[0];
      
      await selectDialogueOption(selectedOption.id);
    } else {
      // No options, just advance
      dialogueStateMachine.advanceState();
      await wait(300);
    }
    
    // Wait a bit between interactions
    await wait(200);
  }
  
  if (iterations >= MAX_ITERATIONS) {
    console.error('Auto-complete dialogue reached maximum iterations, possible dialogue loop');
    return false;
  }
  
  return true;
}

/**
 * Helper to find dialogue flow factory function based on ID
 * @param {string} flowId - The ID of the dialogue flow
 * @returns {Function|null} Flow factory function or null if not found
 */
function findDialogueFlowFactory(flowId) {
  // These would map to the actual flow factory functions in your game
  const flowFactories = {
    'kapoor-calibration': createKapoorCalibrationFlow,
    // Add other flow factories as needed
  };
  
  return flowFactories[flowId] || null;
}

/**
 * Get basic info about current dialogue state
 * @returns {Object} Dialogue state info
 */
function dialogueStateInfo() {
  const dialogueStateMachine = useDialogueStateMachine.getState();
  
  if (!dialogueStateMachine.activeFlow) {
    return { activeFlow: null };
  }
  
  return {
    flowId: dialogueStateMachine.activeFlow.id,
    currentState: dialogueStateMachine.currentState?.id,
    showResponse: dialogueStateMachine.showResponse,
    showBackstory: dialogueStateMachine.showBackstory,
    optionCount: dialogueStateMachine.getAvailableOptions().length
  };
}

/**
 * Placeholder for dialogue flow factory
 * In a real implementation, this would be imported from your game code
 */
function createKapoorCalibrationFlow(nodeId) {
  // This is just a placeholder - in the real implementation this would
  // be imported from DialogueStateMachine.ts
  console.log(`Creating Kapoor calibration flow for node ${nodeId}`);
  
  return {
    id: 'kapoor-calibration',
    initialStateId: 'intro',
    states: {
      'intro': {
        id: 'intro',
        type: 'intro',
        text: "Good morning. I see you've arrived precisely on schedule. I'm conducting the monthly output measurements on LINAC 2. Since this is your first day, observing proper protocol will be instructive.",
        options: [
          { 
            id: 'option1', 
            text: 'Good morning. I'm looking forward to learning the protocols.', 
            nextStateId: 'calibration-explanation'
          }
        ]
      },
      'calibration-explanation': {
        id: 'calibration-explanation',
        type: 'question',
        text: 'Excellent. Monthly output checks are fundamental quality assurance procedures. We'll be measuring the dose output of this linear accelerator using a calibrated ionization chamber.',
        options: [
          {
            id: 'ask-purpose',
            text: 'What parameters will we be measuring specifically?',
            nextStateId: 'parameters-explanation',
            isCriticalPath: true
          }
        ]
      },
      'parameters-explanation': {
        id: 'parameters-explanation',
        type: 'response',
        text: 'We'll be measuring photon and electron beam outputs, symmetry, flatness, and energy constancy. These measurements verify the machine is delivering dose as prescribed.',
        nextStateId: 'setup-question'
      },
      'setup-question': {
        id: 'setup-question',
        type: 'question',
        text: 'Now, what is the first step in setting up the ionization chamber?',
        options: [
          {
            id: 'correct-setup',
            text: 'Position the chamber at reference depth and apply appropriate correction factors.',
            nextStateId: 'correct-response',
            isCriticalPath: true
          },
          {
            id: 'incorrect-setup',
            text: 'Maximize the signal by placing it at the beam center.',
            nextStateId: 'incorrect-response'
          }
        ]
      },
      'correct-response': {
        id: 'correct-response',
        type: 'response',
        text: 'Correct. Proper chamber positioning and correction factors are essential for accurate measurements.',
        nextStateId: 'conclusion'
      },
      'incorrect-response': {
        id: 'incorrect-response',
        type: 'response',
        text: 'Incorrect. While beam center is important, we must first establish proper reference conditions. Position the chamber at reference depth with appropriate correction factors.',
        nextStateId: 'conclusion'
      },
      'conclusion': {
        id: 'conclusion',
        type: 'conclusion',
        text: 'I'm pleased with your grasp of the fundamentals. Quality assurance is the foundation of medical physics practice.',
        isConclusion: true,
        nextStateId: 'journal-presentation'
      },
      'journal-presentation': {
        id: 'journal-presentation',
        type: 'critical-moment',
        text: 'Every medical physicist must maintain meticulous records. This journal will serve you throughout your residency. Use it to document observations, track your knowledge development, and maintain procedural notes.',
        isCriticalPath: true,
        onEnter: (context) => {
          // This would normally initialize the journal
          console.log('Journal presentation entered - normally would initialize journal');
        }
      }
    },
    context: { characterId: 'kapoor', nodeId },
    transitions: [],
    progressionCheckpoints: ['journal-presentation']
  };
}

export default gameInterface;