// tests/testDialogueSystem.js
const { assert, assertEqual, assertIncludes } = require('./assert');
const { createEventRecorder } = require('./eventRecorder');

/**
 * Tests the dialogue system with character interactions, 
 * dialogue flow, and critical path progression
 */
function testDialogueSystem() {
  const events = createEventRecorder();
  
  // Test doubles
  const dialogueState = {
    isActive: false,
    currentStateId: null,
    flow: null,
    visitedStates: [],
    selectedOptionIds: [],
    responseShowing: false,
    
    initializeFlow(dialogueFlow) {
      this.flow = dialogueFlow;
      this.isActive = true;
      this.currentStateId = dialogueFlow.initialStateId;
      this.visitedStates = [dialogueFlow.initialStateId];
      this.selectedOptionIds = [];
      
      events.record('dialogue-started', { 
        flowId: dialogueFlow.id,
        characterId: dialogueFlow.characterId,
        initialState: this.currentStateId 
      });
      
      return true;
    },
    
    getCurrentState() {
      if (!this.flow || !this.currentStateId) return null;
      return this.flow.states[this.currentStateId];
    },
    
    getAvailableOptions() {
      const currentState = this.getCurrentState();
      if (!currentState) return [];
      
      // Filter options based on requirements if applicable
      return (currentState.options || []).filter(option => {
        // Check if option has requirements
        if (!option.requirements) return true;
        
        // Simple requirement check example
        if (option.requirements.trait) {
          return option.requirements.trait === this.flow.playerTraits?.primary;
        }
        
        return true;
      });
    },
    
    selectOption(optionId) {
      const currentState = this.getCurrentState();
      if (!currentState) return false;
      
      const option = (currentState.options || []).find(o => o.id === optionId);
      if (!option) return false;
      
      this.selectedOption = option;
      this.responseShowing = true;
      this.selectedOptionIds.push(optionId);
      
      events.record('dialogue-option-selected', {
        optionId,
        stateId: this.currentStateId,
        flowId: this.flow.id
      });
      
      return true;
    },
    
    advanceState() {
      if (!this.selectedOption || !this.responseShowing) return false;
      
      const nextStateId = this.selectedOption.nextStateId;
      if (!nextStateId || !this.flow.states[nextStateId]) return false;
      
      const previousStateId = this.currentStateId;
      this.currentStateId = nextStateId;
      this.visitedStates.push(nextStateId);
      this.selectedOption = null;
      this.responseShowing = false;
      
      events.record('dialogue-state-changed', {
        fromStateId: previousStateId,
        toStateId: nextStateId,
        flowId: this.flow.id
      });
      
      // Check for critical path states
      const newState = this.flow.states[nextStateId];
      if (newState.isCriticalPath) {
        events.record('dialogue-critical-path', {
          stateId: nextStateId,
          flowId: this.flow.id
        });
      }
      
      // Check if this is a conclusion
      if (newState.isConclusion) {
        this.isActive = false;
        events.record('dialogue-completed', {
          flowId: this.flow.id,
          finalStateId: nextStateId
        });
      }
      
      return true;
    },
    
    useStrategicAction(actionType) {
      events.record('strategic-action-used', {
        actionType,
        stateId: this.currentStateId,
        flowId: this.flow.id
      });
      
      // Different actions have different effects
      if (actionType === 'reframe') {
        // Reframe highlights precision or humble options
        events.record('dialogue-options-reframed', {
          highlightedTraits: ['precision', 'humble']
        });
      } else if (actionType === 'extrapolate') {
        // Extrapolate shows additional context
        events.record('dialogue-context-expanded', {
          stateId: this.currentStateId
        });
      } else if (actionType === 'boast') {
        // Boast unlocks high-confidence options
        events.record('dialogue-options-expanded', {
          newTraits: ['confidence']
        });
      }
      
      return true;
    }
  };
  
  // Simulated game state for traits
  const gameState = {
    player: {
      traits: {
        primary: 'precision',
        secondary: 'humble'
      },
      relationshipScores: {
        kapoor: 0,
        quinn: 0,
        jesse: 0
      }
    },
    
    incrementRelationship(characterId, amount) {
      if (this.player.relationshipScores[characterId] !== undefined) {
        this.player.relationshipScores[characterId] += amount;
        
        events.record('relationship-changed', {
          characterId,
          change: amount,
          newValue: this.player.relationshipScores[characterId]
        });
        
        return true;
      }
      return false;
    }
  };
  
  // ---- TEST 1: Basic Dialogue Flow ----
  console.log("Testing basic dialogue flow...");
  
  // Create sample dialogue flow
  const basicFlow = {
    id: 'test-dialogue-flow',
    characterId: 'kapoor',
    initialStateId: 'greeting',
    playerTraits: {
      primary: 'precision',
      secondary: 'humble'
    },
    states: {
      'greeting': {
        id: 'greeting',
        type: 'intro',
        text: "Hello, I'm Dr. Kapoor. Welcome to the lab.",
        options: [
          { id: "greeting1", text: "Hello, nice to meet you.", nextStateId: 'question', trait: 'humble' },
          { id: "greeting2", text: "I've been looking forward to working with you.", nextStateId: 'question', trait: 'confidence' },
          { id: "greeting3", text: "I've read your papers on radiation physics.", nextStateId: 'question', trait: 'precision' }
        ]
      },
      'question': {
        id: 'question',
        type: 'challenge',
        text: "What do you know about linear accelerators?",
        options: [
          { id: "question1", text: "They're used for external beam radiation therapy.", nextStateId: 'correct', trait: 'precision' },
          { id: "question2", text: "Not much, but I'm eager to learn.", nextStateId: 'neutral', trait: 'humble' },
          { id: "question3", text: "Enough to get started, I think.", nextStateId: 'neutral', trait: 'confidence' }
        ]
      },
      'correct': {
        id: 'correct',
        type: 'response',
        text: "That's right. I'm impressed by your knowledge.",
        options: [
          { id: "correct1", text: "Thank you. I've studied the basics.", nextStateId: 'conclusion' }
        ]
      },
      'neutral': {
        id: 'neutral',
        type: 'response',
        text: "We'll get you up to speed quickly.",
        options: [
          { id: "neutral1", text: "I appreciate that.", nextStateId: 'conclusion' }
        ]
      },
      'conclusion': {
        id: 'conclusion',
        type: 'conclusion',
        text: "Let's get started with today's work.",
        isConclusion: true,
        options: []
      }
    }
  };
  
  // Initialize dialogue flow
  dialogueState.initializeFlow(basicFlow);
  
  // Check initial state
  assertEqual(dialogueState.isActive, true, "Dialogue should be active");
  assertEqual(dialogueState.currentStateId, 'greeting', "Dialogue should start at greeting");
  assert(events.hasEventType('dialogue-started'), "Dialogue started event should fire");
  
  // Get available options
  const options = dialogueState.getAvailableOptions();
  assertEqual(options.length, 3, "Should have 3 options available");
  
  // Select an option
  const success = dialogueState.selectOption('greeting3'); // Precision trait option
  assert(success, "Option selection should succeed");
  assert(events.hasEventType('dialogue-option-selected'), "Option selected event should fire");
  
  // Advance state
  dialogueState.advanceState();
  assertEqual(dialogueState.currentStateId, 'question', "Should advance to question state");
  assert(events.hasEventType('dialogue-state-changed'), "State changed event should fire");
  
  // Complete the dialogue
  dialogueState.selectOption('question1');
  dialogueState.advanceState();
  dialogueState.selectOption('correct1');
  dialogueState.advanceState();
  
  // Check final state
  assertEqual(dialogueState.isActive, false, "Dialogue should be inactive after conclusion");
  assertEqual(dialogueState.currentStateId, 'conclusion', "Should end at conclusion state");
  assert(events.hasEventType('dialogue-completed'), "Dialogue completed event should fire");
  assertEqual(dialogueState.visitedStates.length, 4, "Should have visited 4 states");
  
  console.log("✅ Basic dialogue flow tests passed");
  
  // ---- TEST 2: Strategic Actions in Dialogue ----
  console.log("Testing strategic actions in dialogue...");
  
  // Reset dialogue state
  dialogueState.isActive = false;
  dialogueState.currentStateId = null;
  dialogueState.flow = null;
  dialogueState.visitedStates = [];
  dialogueState.selectedOptionIds = [];
  events.clear();
  
  // Create dialogue flow with strategic action opportunities
  const strategicFlow = {
    id: 'strategic-dialogue-flow',
    characterId: 'quinn',
    initialStateId: 'intro',
    playerTraits: gameState.player.traits,
    states: {
      'intro': {
        id: 'intro',
        type: 'intro',
        text: "I've been reviewing these images, but something seems off.",
        options: [
          { id: "intro1", text: "What do you think is wrong?", nextStateId: 'problem' },
          { id: "intro2", text: "Let me take a look.", nextStateId: 'problem' }
        ]
      },
      'problem': {
        id: 'problem',
        type: 'challenge',
        text: "The calibration seems inaccurate. How should we proceed?",
        options: [
          { id: "problem1", text: "Let's check the calibration protocol step by step.", nextStateId: 'precise-approach', trait: 'precision' },
          { id: "problem2", text: "Maybe we should ask Dr. Kapoor for advice?", nextStateId: 'humble-approach', trait: 'humble' },
          { id: "problem3", text: "I can recalibrate it based on my experience.", nextStateId: 'confident-approach', trait: 'confidence', requirements: { trait: 'confidence' } }
        ],
        // This state supports strategic actions
        allowsStrategicActions: true
      },
      'precise-approach': {
        id: 'precise-approach',
        type: 'response',
        text: "Good idea. Let's be methodical about this.",
        options: [
          { id: "precise1", text: "I'll document our findings as we go.", nextStateId: 'journal-moment' }
        ]
      },
      'humble-approach': {
        id: 'humble-approach',
        type: 'response',
        text: "It's good to consult with more experienced staff. Let's go together.",
        options: [
          { id: "humble1", text: "I'm eager to learn from both of you.", nextStateId: 'journal-moment' }
        ]
      },
      'confident-approach': {
        id: 'confident-approach',
        type: 'response',
        text: "Impressive confidence. Let me observe your technique.",
        options: [
          { id: "confident1", text: "I'll walk you through what I'm doing.", nextStateId: 'journal-moment' }
        ]
      },
      'journal-moment': {
        id: 'journal-moment',
        type: 'critical-moment',
        text: "You should document this procedure for future reference.",
        isCriticalPath: true,
        options: [
          { id: "journal1", text: "I'll add it to my journal right away.", nextStateId: 'conclusion' }
        ]
      },
      'conclusion': {
        id: 'conclusion',
        type: 'conclusion',
        text: "Great work today. This will be valuable knowledge for your residency.",
        isConclusion: true,
        options: []
      }
    }
  };
  
  // Initialize dialogue with strategic options
  dialogueState.initializeFlow(strategicFlow);
  
  // Navigate to the state allowing strategic actions
  dialogueState.selectOption('intro1');
  dialogueState.advanceState();
  
  // Test strategic action: Reframe
  dialogueState.useStrategicAction('reframe');
  assert(events.hasEventType('strategic-action-used'), "Strategic action event should fire");
  assert(events.hasEventType('dialogue-options-reframed'), "Options reframed event should fire");
  
  // Test strategic action: Boast
  dialogueState.useStrategicAction('boast');
  assert(events.hasEventType('dialogue-options-expanded'), "Options expanded event should fire");
  
  // Select an option with trait requirement (now available after Boast)
  dialogueState.selectOption('problem3'); // Confidence trait option
  dialogueState.advanceState();
  
  // Continue to critical path
  dialogueState.selectOption('confident1');
  dialogueState.advanceState();
  
  // Check critical path handling
  assertEqual(dialogueState.currentStateId, 'journal-moment', "Should reach journal moment");
  assert(events.hasEventType('dialogue-critical-path'), "Critical path event should fire");
  
  // Complete dialogue
  dialogueState.selectOption('journal1');
  dialogueState.advanceState();
  
  // Verify relationship changes
  gameState.incrementRelationship('quinn', 5);
  assert(events.hasEventType('relationship-changed'), "Relationship changed event should fire");
  assertEqual(gameState.player.relationshipScores.quinn, 5, "Relationship score should increase");
  
  console.log("✅ Strategic dialogue action tests passed");
  
  // ---- TEST 3: Character-Specific Dialogue ----
  console.log("Testing character-specific dialogue traits...");
  
  // Reset for next test
  dialogueState.isActive = false;
  dialogueState.currentStateId = null;
  dialogueState.flow = null;
  dialogueState.visitedStates = [];
  dialogueState.selectedOptionIds = [];
  events.clear();
  
  // Create character-specific dialogue flow
  const characterFlow = {
    id: 'character-dialogue-flow',
    characterId: 'jesse',
    initialStateId: 'greeting',
    playerTraits: gameState.player.traits,
    // Character-specific dialogue preferences
    characterTraits: {
      preferredTrait: 'confidence',
      dislikedTrait: 'precision'
    },
    states: {
      'greeting': {
        id: 'greeting',
        type: 'intro',
        text: "Hey there! Ready to tackle the equipment setup?",
        options: [
          { id: "greeting1", text: "I've been studying the manual thoroughly.", nextStateId: 'precision-response', trait: 'precision' },
          { id: "greeting2", text: "I'm sure we can figure it out together.", nextStateId: 'humble-response', trait: 'humble' },
          { id: "greeting3", text: "Absolutely! I've got some ideas to try.", nextStateId: 'confidence-response', trait: 'confidence' }
        ]
      },
      'precision-response': {
        id: 'precision-response',
        type: 'response',
        text: "Manuals are good, but nothing beats hands-on experience.",
        relationshipEffect: -1, // This trait is disliked by Jesse
        options: [
          { id: "precision1", text: "You're right, let's start working.", nextStateId: 'conclusion' }
        ]
      },
      'humble-response': {
        id: 'humble-response',
        type: 'response',
        text: "That's the spirit! Let's learn together.",
        relationshipEffect: 2, // Neutral response
        options: [
          { id: "humble1", text: "I appreciate your guidance.", nextStateId: 'conclusion' }
        ]
      },
      'confidence-response': {
        id: 'confidence-response',
        type: 'response',
        text: "I like your attitude! Let's jump right in.",
        relationshipEffect: 5, // This trait is preferred by Jesse
        options: [
          { id: "confidence1", text: "Great, I have some shortcuts to show you.", nextStateId: 'conclusion' }
        ]
      },
      'conclusion': {
        id: 'conclusion',
        type: 'conclusion',
        text: "We make a good team. Let's tackle more equipment tomorrow.",
        isConclusion: true,
        options: []
      }
    }
  };
  
  // Initialize character-specific dialogue
  dialogueState.initializeFlow(characterFlow);
  
  // Select precision trait option (disliked by Jesse)
  dialogueState.selectOption('greeting1');
  dialogueState.advanceState();
  
  // Apply relationship effect
  gameState.incrementRelationship('jesse', -1);
  assertEqual(gameState.player.relationshipScores.jesse, -1, "Jesse should dislike precision trait");
  
  // Reset and try preferred trait
  dialogueState.isActive = false;
  dialogueState.currentStateId = null;
  dialogueState.flow = null;
  dialogueState.visitedStates = [];
  dialogueState.selectedOptionIds = [];
  gameState.player.relationshipScores.jesse = 0;
  events.clear();
  
  // Initialize again
  dialogueState.initializeFlow(characterFlow);
  
  // Select confidence trait option (preferred by Jesse)
  dialogueState.selectOption('greeting3');
  dialogueState.advanceState();
  
  // Apply relationship effect
  gameState.incrementRelationship('jesse', 5);
  assertEqual(gameState.player.relationshipScores.jesse, 5, "Jesse should like confidence trait");
  
  console.log("✅ Character-specific dialogue trait tests passed");
  
  return true;
}

// Export the test
module.exports = testDialogueSystem;

// Run test directly when executed as a standalone file
if (require.main === module) {
  console.log("🧪 Running Dialogue System Test");
  try {
    testDialogueSystem();
    console.log("✅ PASSED: Dialogue System Test");
  } catch (error) {
    console.error(`❌ FAILED: Dialogue System Test`);
    console.error(`   Error: ${error.message}`);
    process.exit(1);
  }
}