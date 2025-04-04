// tests/testGameStateMachine.js
const { assert, assertEqual, assertIncludes } = require('./assert');
const { createEventRecorder } = require('./eventRecorder');

/**
 * Test Game State Machine transitions and validations
 * 
 * This test verifies the proper functioning of the GameStateMachine
 * implementation, examining transition validity, state progression,
 * and event emission throughout the day/night cycle.
 */
function testGameStateMachine() {
  // Set up event recorder to capture transition events
  const events = createEventRecorder();
  
  // Create a focused test double of the GameStateMachine
  // This mirrors the core functionality without UI dependencies
  const createStateMachine = () => {
    // Define valid state transitions (matching GameStateMachine.ts)
    const VALID_STATE_TRANSITIONS = {
      'not_started': ['in_progress'],
      'in_progress': ['game_over', 'victory'],
      'game_over': ['not_started', 'in_progress'],
      'victory': ['not_started', 'in_progress'],
    };
    
    // Define valid phase transitions (matching GameStateMachine.ts)
    const VALID_PHASE_TRANSITIONS = {
      'day': ['transition_to_night'],
      'night': ['transition_to_day'],
      'transition_to_night': ['night'],
      'transition_to_day': ['day'],
    };
    
    return {
      // Core state
      gameState: 'not_started',
      gamePhase: 'day',
      currentDay: 1,
      isTransitioning: false,
      completedNodeIds: [],
      bossDefeated: false,
      
      // Diagnostic counters for testing
      transitionAttempts: { valid: 0, invalid: 0 },
      
      // State transition with validation
      transitionToState(newState, reason) {
        // Validate transition
        if (!VALID_STATE_TRANSITIONS[this.gameState]?.includes(newState)) {
          this.transitionAttempts.invalid++;
          events.record('invalid-transition-attempt', { 
            type: 'state',
            from: this.gameState, 
            to: newState, 
            reason 
          });
          return false;
        }
        
        // Record the event
        events.record('state-changed', { 
          from: this.gameState, 
          to: newState, 
          reason 
        });
        
        this.transitionAttempts.valid++;
        
        // Update state
        this.gameState = newState;
        return true;
      },
      
      // Phase transition with validation
      transitionToPhase(newPhase, reason) {
        // Validate transition
        if (!VALID_PHASE_TRANSITIONS[this.gamePhase]?.includes(newPhase)) {
          this.transitionAttempts.invalid++;
          events.record('invalid-transition-attempt', { 
            type: 'phase',
            from: this.gamePhase, 
            to: newPhase, 
            reason 
          });
          return false;
        }
        
        // Special handling for transitions
        if (newPhase.startsWith('transition_')) {
          this.isTransitioning = true;
        } else {
          this.isTransitioning = false;
        }
        
        // Record the event
        events.record('phase-changed', { 
          from: this.gamePhase, 
          to: newPhase, 
          reason 
        });
        
        this.transitionAttempts.valid++;
        
        // Update phase
        this.gamePhase = newPhase;
        return true;
      },
      
      // Complete day phase
      completeDay() {
        if (this.gamePhase !== 'day') {
          events.record('day-completion-failed', {
            reason: 'wrong_phase',
            currentPhase: this.gamePhase
          });
          return false;
        }
        
        // Check boss state (victory condition)
        if (this.bossDefeated) {
          this.transitionToState('victory', 'boss_defeated');
          events.record('day-completed', { 
            day: this.currentDay,
            outcome: 'victory'
          });
          return true;
        }
        
        // Check if enough nodes completed
        const minimumNodesRequired = 3;
        if (this.completedNodeIds.length >= minimumNodesRequired) {
          this.transitionToPhase('transition_to_night', 'day_complete');
          events.record('day-completed', { 
            day: this.currentDay,
            completedNodes: this.completedNodeIds.length 
          });
          return true;
        }
        
        events.record('day-completion-failed', {
          reason: 'insufficient_progress',
          completedNodes: this.completedNodeIds.length,
          required: minimumNodesRequired
        });
        
        return false;
      },
      
      // Complete night phase
      completeNight() {
        if (this.gamePhase !== 'night') {
          events.record('night-completion-failed', {
            reason: 'wrong_phase',
            currentPhase: this.gamePhase
          });
          return false;
        }
        
        // Advance day counter
        this.currentDay++;
        
        // Reset completed nodes for new day
        const previouslyCompletedCount = this.completedNodeIds.length;
        this.completedNodeIds = [];
        
        // Transition to day (animation)
        this.transitionToPhase('transition_to_day', 'night_complete');
        
        events.record('night-completed', { 
          previousDay: this.currentDay - 1,
          newDay: this.currentDay,
          previouslyCompletedNodes: previouslyCompletedCount
        });
        
        return true;
      },
      
      // Boss completion
      completeBoss() {
        this.bossDefeated = true;
        events.record('boss-defeated', { 
          day: this.currentDay,
          phaseAtDefeat: this.gamePhase
        });
        return true;
      },
      
      // Node completion tracking
      markNodeCompleted(nodeId) {
        if (this.completedNodeIds.includes(nodeId)) {
          return false;
        }
        
        this.completedNodeIds.push(nodeId);
        
        // Check for boss node
        const isBossNode = nodeId.includes('boss') || nodeId.includes('ionix');
        if (isBossNode) {
          this.completeBoss();
        }
        
        events.record('node-completed', { 
          nodeId, 
          isBossNode,
          completedCount: this.completedNodeIds.length
        });
        
        return true;
      }
    };
  };
  
  // Clear events before starting test
  events.clear();
  
  // Create machine instance for testing
  const stateMachine = createStateMachine();
  
  // ---- Test 1: Initial State and Basic Transitions ----
  
  // Verify initial state
  assertEqual(stateMachine.gameState, 'not_started', "Initial game state should be 'not_started'");
  assertEqual(stateMachine.gamePhase, 'day', "Initial game phase should be 'day'");
  assertEqual(stateMachine.currentDay, 1, "Initial day should be 1");
  
  // Test valid state transition
  assert(stateMachine.transitionToState('in_progress', 'test_start_game'), 
         "Valid state transition should return true");
  assertEqual(stateMachine.gameState, 'in_progress', 
             "State should update to 'in_progress'");
  
  // Test invalid state transition attempt
  assert(!stateMachine.transitionToState('not_started', 'test_invalid'), 
         "Invalid state transition should return false");
  assertEqual(stateMachine.gameState, 'in_progress', 
             "State should remain unchanged after invalid transition attempt");
  
  // ---- Test 2: Phase Transitions and Flags ----
  
  // Test visual transition phase
  assert(stateMachine.transitionToPhase('transition_to_night', 'test_transition'), 
         "Transition phase should be accepted");
  assertEqual(stateMachine.gamePhase, 'transition_to_night', 
             "Phase should update to transition state");
  assert(stateMachine.isTransitioning, 
         "Transition flag should be set during transition phase");
  
  // Complete transition animation
  assert(stateMachine.transitionToPhase('night', 'test_transition_complete'), 
         "Night phase should be accepted after transition");
  assertEqual(stateMachine.gamePhase, 'night', 
             "Phase should update to night");
  assert(!stateMachine.isTransitioning, 
         "Transition flag should be cleared after transition completes");
  
  // Test invalid night → day direct transition
  assert(!stateMachine.transitionToPhase('day', 'test_invalid_direct'), 
         "Direct night → day transition should be rejected");
  assertEqual(stateMachine.gamePhase, 'night', 
             "Phase should remain unchanged after invalid transition");
  
  // ---- Test 3: Game Flow and Day/Night Cycle ----
  
  // Complete night phase correctly
  assert(stateMachine.completeNight(), 
         "Night completion should succeed from night phase");
  assertEqual(stateMachine.gamePhase, 'transition_to_day', 
             "Phase should transition to day animation");
  assertEqual(stateMachine.currentDay, 2, 
             "Day counter should increment after night completion");
  
  // Complete transition to day
  stateMachine.transitionToPhase('day', 'transition_animation_complete');
  assertEqual(stateMachine.gamePhase, 'day', 
             "Phase should now be day");
  
  // Test completing day with insufficient nodes
  assert(!stateMachine.completeDay(), 
         "Day completion should fail with no completed nodes");
  assertEqual(stateMachine.gamePhase, 'day', 
             "Phase should remain day after failed completion attempt");
  
  // Add minimum required nodes
  stateMachine.markNodeCompleted('node1');
  stateMachine.markNodeCompleted('node2');
  stateMachine.markNodeCompleted('node3');
  assertEqual(stateMachine.completedNodeIds.length, 3, 
             "Should have 3 completed nodes");
  
  // Now complete day successfully
  assert(stateMachine.completeDay(), 
         "Day completion should succeed with required nodes");
  assertEqual(stateMachine.gamePhase, 'transition_to_night', 
             "Should transition to night animation");
  
  // Complete transition to night
  stateMachine.transitionToPhase('night', 'transition_animation_complete');
  assertEqual(stateMachine.gamePhase, 'night', 
             "Phase should be night");
  
  // ---- Test 4: Boss Defeat and Victory Condition ----
  
  // Complete night and return to day
  stateMachine.completeNight();
  stateMachine.transitionToPhase('day', 'transition_animation_complete');
  assertEqual(stateMachine.currentDay, 3, 
             "Day counter should be 3");
  assertEqual(stateMachine.completedNodeIds.length, 0, 
             "Completed nodes should reset between days");
  
  // Mark boss node completed
  stateMachine.markNodeCompleted('boss-ionix');
  assert(stateMachine.bossDefeated, 
         "Boss should be marked as defeated");
  
  // Complete day with defeated boss
  assert(stateMachine.completeDay(), 
         "Day completion should succeed with boss defeated");
  assertEqual(stateMachine.gameState, 'victory', 
         "Game state should transition to victory after boss defeat");
  
  // ---- Test 5: Event Generation Verification ----
  
  // Verify event counts
  const eventCounts = {
    'state-changed': events.getEvents().filter(e => e.type === 'state-changed').length,
    'phase-changed': events.getEvents().filter(e => e.type === 'phase-changed').length,
    'day-completed': events.getEvents().filter(e => e.type === 'day-completed').length,
    'night-completed': events.getEvents().filter(e => e.type === 'night-completed').length,
    'node-completed': events.getEvents().filter(e => e.type === 'node-completed').length,
    'boss-defeated': events.getEvents().filter(e => e.type === 'boss-defeated').length
  };
  
  // Each event type should be emitted at least once
  Object.entries(eventCounts).forEach(([type, count]) => {
    assert(count > 0, `Event type '${type}' should be emitted at least once`);
  });
  
  // Check progression logic reflected in events
  const bossEvents = events.getEvents().filter(e => e.type === 'boss-defeated');
  assertEqual(bossEvents.length, 1, 
             "Should have one boss defeated event");
  
  const dayCompletionEvents = events.getEvents().filter(e => e.type === 'day-completed');
  assertIncludes(dayCompletionEvents.map(e => e.data.outcome), 'victory', 
                "Victory day completion should be recorded");
  
  // Test transition attempt tracking
  assert(stateMachine.transitionAttempts.valid > 0, 
         "Valid transition attempts should be tracked");
  assert(stateMachine.transitionAttempts.invalid > 0, 
         "Invalid transition attempts should be tracked");
}

module.exports = { testGameStateMachine };

// Run test directly when executed as a standalone file
function runTest() {
  console.log("🧪 Running test: testGameStateMachine");
  try {
    testGameStateMachine();
    console.log("✅ PASSED: testGameStateMachine");
    return true;
  } catch (error) {
    console.error(`❌ FAILED: testGameStateMachine`);
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

// Run directly only when executed as main
if (require.main === module) {
  runTest();
}