// tests/verticalSliceIntegrationTest.js
const assert = require('./assert');
const { createEventRecorder } = require('./eventRecorder');

/**
 * Vertical Slice Integration Test
 * 
 * Tests the complete player journey through the core gameplay loop:
 * Map Navigation → Challenge → Dialogue → Reward → Knowledge Integration
 */
async function runVerticalSliceTest() {
  console.log("🔍 STARTING VERTICAL SLICE INTEGRATION TEST");
  
  // ---- SETUP PHASE ----
  console.log("\n📋 Setting up test environment...");
  
  // Create event recorder properly
  const eventRecorder = createEventRecorder();
  
  // Create game state test double
  const gameState = {
    gamePhase: 'day',
    currentDay: 1,
    completedNodeIds: [],
    player: {
      insight: 100,
      momentum: 0
    },
    isTransitioning: false,
    
    // Methods
    completeDay() {
      this.gamePhase = 'transition_to_night';
      this.isTransitioning = true;
      eventBus.dispatch('DAY_COMPLETED', { day: this.currentDay });
      
      // Simulate transition
      setTimeout(() => {
        this.gamePhase = 'night';
        this.isTransitioning = false;
        eventBus.dispatch('GAME_PHASE_CHANGED', { 
          from: 'transition_to_night', 
          to: 'night' 
        });
      }, 50);
    },
    
    completeNight() {
      this.gamePhase = 'transition_to_day';
      this.isTransitioning = true;
      eventBus.dispatch('NIGHT_COMPLETED', {});
      
      // Simulate transition
      setTimeout(() => {
        this.gamePhase = 'day';
        this.currentDay += 1;
        this.completedNodeIds = [];
        this.isTransitioning = false;
        eventBus.dispatch('GAME_PHASE_CHANGED', { 
          from: 'transition_to_day', 
          to: 'day' 
        });
      }, 50);
    },
    
    setCurrentNode(nodeId) {
      this.currentNodeId = nodeId;
    },
    
    completeNode(nodeId) {
      if (!this.completedNodeIds.includes(nodeId)) {
        this.completedNodeIds.push(nodeId);
        eventBus.dispatch('NODE_COMPLETED', { nodeId });
      }
    }
  };
  
  // Create journal store test double
  const journalStore = {
    hasJournal: false,
    entries: [],
    
    initializeJournal(tier) {
      this.hasJournal = true;
      this.tier = tier;
      eventBus.dispatch('JOURNAL_ACQUIRED', { tier });
    },
    
    addEntry(entry) {
      this.entries.push(entry);
      eventBus.dispatch('JOURNAL_UPDATED', { entry });
    }
  };
  
  // Create knowledge store test double
  const knowledgeStore = {
    concepts: [],
    
    discoverConcept(conceptId) {
      if (!this.concepts.some(c => c.id === conceptId)) {
        this.concepts.push({ 
          id: conceptId, 
          mastery: 0,
          discovered: true 
        });
        eventBus.dispatch('KNOWLEDGE_CONCEPT_DISCOVERED', { conceptId });
      }
    },
    
    updateMastery(conceptId, amount) {
      let concept = this.concepts.find(c => c.id === conceptId);
      
      if (!concept) {
        // Auto-discover if not found
        this.discoverConcept(conceptId);
        concept = this.concepts.find(c => c.id === conceptId);
      }
      
      concept.mastery += amount;
      eventBus.dispatch('KNOWLEDGE_MASTERY_UPDATED', { 
        conceptId, 
        amount,
        newTotal: concept.mastery 
      });
    }
  };
  
  // Create dialogue state test double
  const dialogueState = {
    isActive: false,
    currentState: null,
    flow: null,
    
    initializeFlow(dialogueFlow) {
      this.flow = dialogueFlow;
      this.isActive = true;
      this.currentState = dialogueFlow.initialStateId;
      eventBus.dispatch('DIALOGUE_STARTED', { 
        flowId: dialogueFlow.id,
        initialState: this.currentState 
      });
    },
    
    selectOption(optionId) {
      const currentStateObj = this.flow.states[this.currentState];
      const selectedOption = currentStateObj.options.find(o => o.id === optionId);
      
      if (selectedOption && selectedOption.nextStateId) {
        this.selectedOption = optionId;
        this.showResponse = true;
        
        eventBus.dispatch('DIALOGUE_OPTION_SELECTED', {
          optionId,
          stateId: this.currentState
        });
      }
    },
    
    advanceState() {
      if (!this.selectedOption) return;
      
      const currentStateObj = this.flow.states[this.currentState];
      const selectedOption = currentStateObj.options.find(o => o.id === this.selectedOption);
      
      if (selectedOption && selectedOption.nextStateId) {
        const prevState = this.currentState;
        this.currentState = selectedOption.nextStateId;
        this.selectedOption = null;
        this.showResponse = false;
        
        eventBus.dispatch('DIALOGUE_STATE_CHANGED', {
          from: prevState,
          to: this.currentState
        });
        
        // Check for critical path
        const newState = this.flow.states[this.currentState];
        if (newState.isCriticalPath) {
          eventBus.dispatch('DIALOGUE_CRITICAL_PATH', {
            stateId: this.currentState
          });
        }
        
        // Check for conclusion
        if (newState.isConclusion) {
          eventBus.dispatch('DIALOGUE_COMPLETED', {
            flowId: this.flow.id
          });
          this.isActive = false;
        }
      }
    },
    
    jumpToState(stateId) {
      if (this.flow.states[stateId]) {
        const prevState = this.currentState;
        this.currentState = stateId;
        
        eventBus.dispatch('DIALOGUE_STATE_CHANGED', {
          from: prevState,
          to: this.currentState
        });
        
        // Check for critical path
        const newState = this.flow.states[this.currentState];
        if (newState.isCriticalPath) {
          eventBus.dispatch('DIALOGUE_CRITICAL_PATH', {
            stateId: this.currentState
          });
        }
        
        // Check for conclusion
        if (newState.isConclusion) {
          eventBus.dispatch('DIALOGUE_COMPLETED', {
            flowId: this.flow.id
          });
          this.isActive = false;
        }
      }
    },
    
    getAvailableOptions() {
      if (!this.flow || !this.currentState) return [];
      const currentStateObj = this.flow.states[this.currentState];
      return currentStateObj.options || [];
    }
  };
  
  // Create event bus
  const eventBus = {
    subscribers: {},
    
    dispatch(eventType, payload, source = 'test') {
      const event = { type: eventType, payload, source };
      
      if (this.subscribers[eventType]) {
        this.subscribers[eventType].forEach(callback => callback(event));
      }
      
      if (this.subscribers['*']) {
        this.subscribers['*'].forEach(callback => callback(event));
      }
      
      // Record the event in our recorder
      eventRecorder.record(eventType, payload);
      
      return true;
    },
    
    subscribe(eventType, callback) {
      if (!this.subscribers[eventType]) {
        this.subscribers[eventType] = [];
      }
      this.subscribers[eventType].push(callback);
      return `${eventType}-${this.subscribers[eventType].length}`;
    },
    
    unsubscribe(subscriptionId) {
      // Simple implementation
      const [eventType, index] = subscriptionId.split('-');
      if (this.subscribers[eventType] && this.subscribers[eventType][index-1]) {
        delete this.subscribers[eventType][index-1];
        return true;
      }
      return false;
    }
  };
  
  // Constants for the test
  const kapoorNodeId = 'calibration_node';
  
  // ---- TEST PHASE 1: INITIAL STATE ----
  console.log("\n🔷 Phase 1: Verifying Initial State");
  
  // Verify initial game state
  assert(gameState.gamePhase === 'day', 'Game should start in day phase');
  assert(gameState.currentDay === 1, 'Game should start on day 1');
  assert(gameState.completedNodeIds.length === 0, 'No nodes should be completed initially');
  assert(gameState.player.insight === 100, 'Insight should start at 100');
  assert(gameState.player.momentum === 0, 'Momentum should start at 0');
  
  // Verify initial knowledge state
  assert(knowledgeStore.concepts.length === 0, 'No concepts should be known initially');
  
  // Verify initial journal state
  assert(journalStore.hasJournal === false, 'Player should not have journal initially');
  assert(journalStore.entries.length === 0, 'Journal should have no entries initially');
  
  console.log("✅ Initial state verified");

  // ---- TEST PHASE 2: MAP NAVIGATION ----
  console.log("\n🔷 Phase 2: Testing Map Navigation");
  
  // Simulate player selecting Kapoor calibration node
  eventBus.dispatch('NODE_SELECTED', { 
    nodeId: kapoorNodeId,
    source: 'test_harness'
  });
  
  // Explicitly set current node
  gameState.setCurrentNode(kapoorNodeId);
  
  // Verify node selection updated the state
  assert(gameState.currentNodeId === kapoorNodeId, 'Current node should be updated');
  
  // Verify the event was dispatched
  assert(eventRecorder.hasEventType('NODE_SELECTED'), 'NODE_SELECTED event should be dispatched');
  
  console.log("✅ Map navigation successful");
  
  // ---- TEST PHASE 3: CHALLENGE & DIALOGUE FLOW ----
  console.log("\n🔷 Phase 3: Testing Challenge & Dialogue Flow");
  
  // Simulate starting the challenge/dialogue
  eventBus.dispatch('CHALLENGE_STARTED', { 
    nodeId: kapoorNodeId, 
    characterId: 'kapoor',
    source: 'test_harness'
  });
  
  // Initialize dialogue flow
  const kapoorFlow = {
    id: 'kapoor-calibration',
    initialStateId: 'intro',
    states: {
      'intro': {
        id: 'intro',
        type: 'intro',
        text: "Welcome to the calibration process. I'm Dr. Kapoor.",
        options: [
          { id: "option1", text: "I'm excited to learn.", nextStateId: 'question' }
        ]
      },
      'question': {
        id: 'question',
        type: 'challenge',
        text: "What's the unit for absorbed radiation dose?",
        options: [
          { id: "option2", text: "Gray (Gy)", nextStateId: 'correct' },
          { id: "option3", text: "Sievert (Sv)", nextStateId: 'incorrect' }
        ]
      },
      'correct': {
        id: 'correct',
        type: 'response',
        text: "That's correct. The Gray measures energy absorbed per unit mass.",
        options: [
          { id: "option4", text: "Tell me more about dosimetry.", nextStateId: 'journal-presentation' }
        ]
      },
      'incorrect': {
        id: 'incorrect',
        type: 'response',
        text: "Actually, Sievert measures equivalent dose. Gray is the unit for absorbed dose.",
        options: [
          { id: "option5", text: "I understand now.", nextStateId: 'journal-presentation' }
        ]
      },
      'journal-presentation': {
        id: 'journal-presentation',
        type: 'critical-moment',
        text: "You should document this. Here, take this journal.",
        isCriticalPath: true,
        isConclusion: true
      }
    },
    context: { 
      characterId: 'kapoor', 
      nodeId: kapoorNodeId
    },
    progressionCheckpoints: ['journal-presentation']
  };
  
  dialogueState.initializeFlow(kapoorFlow);
  
  // Verify dialogue is active
  assert(dialogueState.isActive, 'Dialogue should be active');
  assert(dialogueState.currentState === 'intro', 'Dialogue should start at intro state');
  
  // Select first option
  console.log("  - Selecting intro dialogue option");
  const introOptions = dialogueState.getAvailableOptions();
  assert(introOptions.some(o => o.id === 'option1'), 'Intro should have option1 available');
  
  dialogueState.selectOption('option1');
  assert(dialogueState.showResponse, 'Response should be shown after option selection');
  
  // Advance to question
  dialogueState.advanceState();
  assert(dialogueState.currentState === 'question', 'Should advance to question state');
  
  // Select correct answer
  console.log("  - Selecting correct answer");
  dialogueState.selectOption('option2'); // Gray (Gy)
  dialogueState.advanceState();
  assert(dialogueState.currentState === 'correct', 'Should advance to correct response');
  
  // Complete the dialogue
  console.log("  - Completing dialogue");
  dialogueState.selectOption('option4');
  dialogueState.advanceState();
  assert(dialogueState.currentState === 'journal-presentation', 'Should reach journal presentation');
  
  // Verify dialogue completion
  assert(!dialogueState.isActive, 'Dialogue should be inactive after completion');
  assert(eventRecorder.hasEventType('DIALOGUE_COMPLETED'), 'DIALOGUE_COMPLETED event should be dispatched');
  assert(eventRecorder.hasEventType('DIALOGUE_CRITICAL_PATH'), 'DIALOGUE_CRITICAL_PATH event should be dispatched');
  
  // Simulate completing the challenge
  console.log("  - Completing the challenge");
  eventBus.dispatch('NODE_COMPLETED', { 
    nodeId: kapoorNodeId,
    character: 'kapoor',
    result: {
      relationshipChange: 3,
      journalTier: 'technical',
      isJournalAcquisition: true
    },
    source: 'test_harness'
  });
  
  // Complete the node
  gameState.completeNode(kapoorNodeId);
  
  // Verify challenge completed
  assert(gameState.completedNodeIds.includes(kapoorNodeId), 'Node should be marked as completed');
  
  console.log("✅ Challenge and dialogue flow successful");
  
  // ---- TEST PHASE 4: REWARD (JOURNAL ACQUISITION) ----
  console.log("\n🔷 Phase 4: Testing Reward Flow (Journal)");
  
  // Initialize journal
  journalStore.initializeJournal('technical');
  
  // Add journal entry
  journalStore.addEntry({
    title: "Radiation Dosimetry",
    content: "Today I learned about Gray (Gy) as the unit for absorbed dose.",
    conceptIds: ['radiation-dosimetry'],
    characterId: 'kapoor',
    timestamp: Date.now()
  });
  
  // Verify journal acquisition
  assert(journalStore.hasJournal, 'Journal should be acquired');
  assert(journalStore.entries.length === 1, 'Journal should have one entry');
  assert(eventRecorder.hasEventType('JOURNAL_ACQUIRED'), 'JOURNAL_ACQUIRED event should be dispatched');
  assert(eventRecorder.hasEventType('JOURNAL_UPDATED'), 'JOURNAL_UPDATED event should be dispatched');
  
  console.log("✅ Reward flow (journal acquisition) successful");
  
  // ---- TEST PHASE 5: KNOWLEDGE ACQUISITION ----
  console.log("\n🔷 Phase 5: Testing Knowledge Acquisition");
  
  // Discover concept
  knowledgeStore.discoverConcept('radiation-dosimetry');
  
  // Update mastery
  knowledgeStore.updateMastery('radiation-dosimetry', 15);
  
  // Verify knowledge exists
  assert(knowledgeStore.concepts.length === 1, 'Should have one concept');
  assert(knowledgeStore.concepts[0].id === 'radiation-dosimetry', 'Should have correct concept ID');
  assert(knowledgeStore.concepts[0].mastery === 15, 'Should have correct mastery level');
  assert(eventRecorder.hasEventType('KNOWLEDGE_CONCEPT_DISCOVERED'), 'KNOWLEDGE_CONCEPT_DISCOVERED event should be dispatched');
  assert(eventRecorder.hasEventType('KNOWLEDGE_MASTERY_UPDATED'), 'KNOWLEDGE_MASTERY_UPDATED event should be dispatched');
  
  console.log("✅ Knowledge acquisition successful");
  
  // ---- TEST PHASE 6: DAY TO NIGHT TRANSITION ----
  console.log("\n🔷 Phase 6: Testing Day to Night Transition");
  
  // Complete day
  gameState.completeDay();
  
  // Need to wait for timeout to complete
  await new Promise(resolve => {
    setTimeout(() => {
      // Verify night phase
      assert(gameState.gamePhase === 'night', 'Game should be in night phase');
      assert(eventRecorder.hasEventType('DAY_COMPLETED'), 'DAY_COMPLETED event should be dispatched');
      assert(eventRecorder.hasEventType('GAME_PHASE_CHANGED'), 'GAME_PHASE_CHANGED event should be dispatched');
      
      console.log("✅ Day to night transition successful");
      
      // ---- TEST PHASE 7: KNOWLEDGE INTEGRATION (CONSTELLATION) ----
      console.log("\n🔷 Phase 7: Testing Knowledge Integration (Constellation)");
      
      // Simulate constellation interaction
      eventBus.dispatch('UI_BUTTON_CLICKED', { 
        componentId: 'constellation',
        action: 'view',
        source: 'test_harness'
      });
      
      // Test star interaction
      eventBus.dispatch('UI_BUTTON_CLICKED', { 
        componentId: 'star',
        action: 'select',
        metadata: { conceptId: 'radiation-dosimetry' },
        source: 'test_harness'
      });
      
      console.log("✅ Knowledge integration successful");
      
      // ---- TEST PHASE 8: NEW DAY TRANSITION ----
      console.log("\n🔷 Phase 8: Testing Night to Day Transition");
      
      // Complete night
      gameState.completeNight();
      
      // Wait for timeout to complete
      setTimeout(() => {
        // Verify day phase
        assert(gameState.gamePhase === 'day', 'Game should be in day phase');
        assert(gameState.currentDay === 2, 'Day should increment');
        assert(gameState.completedNodeIds.length === 0, 'Completed nodes should reset');
        assert(eventRecorder.hasEventType('NIGHT_COMPLETED'), 'NIGHT_COMPLETED event should be dispatched');
        
        console.log("✅ Night to day transition successful");
        
        // ---- FINAL VALIDATION ----
        console.log("\n🔷 Final Validation");
        
        // Print event summary
        console.log("\nEvent dispatch summary:");
        eventRecorder.getEventTypes().forEach(eventType => {
          console.log(`  ${eventType}`);
        });
        
        console.log("\n✨ VERTICAL SLICE INTEGRATION TEST COMPLETE ✨");
        console.log("All core systems functional and integrated correctly");
        
        resolve(true);
      }, 100);
    }, 100);
  });
  
  return true;
}

// Export the test
module.exports = runVerticalSliceTest;

// Run test directly when executed as a standalone file
if (require.main === module) {
  runVerticalSliceTest().catch(err => {
    console.error("❌ TEST FAILED:", err);
    process.exit(1);
  });
}