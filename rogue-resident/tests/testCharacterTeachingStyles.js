// tests/testCharacterTeachingStyles.js
const { assert, assertEqual } = require('./assert');

function testCharacterTeachingStyles() {
  // Player knowledge representation
  const playerKnowledge = {
    nodes: {
      'calibration': { mastery: 0.2, confidence: 0.3 },
      'patient_care': { mastery: 0.1, confidence: 0.2 },
      'regulations': { mastery: 0.0, confidence: 0.0 }
    }
  };
  
  // Character teaching style definitions
  const characters = {
    'kapoor': {
      teachingStyle: 'structured',
      specialization: 'qa',
      masteryMultiplier: 1.2,
      confidenceMultiplier: 0.8, // Lower confidence gain (strict)
      focusAreas: ['calibration', 'regulations']
    },
    'jesse': {
      teachingStyle: 'practical',
      specialization: 'technical',
      masteryMultiplier: 0.9, // Lower mastery (shortcuts)
      confidenceMultiplier: 1.4, // Higher confidence gain (approachable)
      focusAreas: ['calibration']
    },
    'garcia': {
      teachingStyle: 'empathetic',
      specialization: 'clinical',
      masteryMultiplier: 1.0,
      confidenceMultiplier: 1.2,
      focusAreas: ['patient_care']
    }
  };
  
  // Teaching interaction system
  const learningSystem = {
    // Learn from a character about a topic
    learnFromCharacter(characterId, topicId, baseAmount = 0.1) {
      const character = characters[characterId];
      const topic = playerKnowledge.nodes[topicId];
      
      if (!character || !topic) return false;
      
      // Calculate learning modifiers
      let masteryGain = baseAmount;
      let confidenceGain = baseAmount;
      
      // Specialty bonus
      if (character.focusAreas.includes(topicId)) {
        masteryGain *= 1.5;
      }
      
      // Apply character-specific modifiers
      masteryGain *= character.masteryMultiplier;
      confidenceGain *= character.confidenceMultiplier;
      
      // Update player knowledge
      topic.mastery = Math.min(1.0, topic.mastery + masteryGain);
      topic.confidence = Math.min(1.0, topic.confidence + confidenceGain);
      
      return { 
        masteryGain, 
        confidenceGain,
        newMastery: topic.mastery,
        newConfidence: topic.confidence
      };
    }
  };
  
  // Test Kapoor's structured teaching of calibration
  const kapoorResult = learningSystem.learnFromCharacter('kapoor', 'calibration', 0.1);
  assert(kapoorResult.masteryGain > 0.1, "Kapoor should provide bonus mastery in his specialty");
  assert(kapoorResult.confidenceGain < 0.1, "Kapoor's strict approach should give less confidence");
  
  // Test Jesse's practical approach to the same topic
  const initialMastery = playerKnowledge.nodes['calibration'].mastery;
  const jesseResult = learningSystem.learnFromCharacter('jesse', 'calibration', 0.1);
  assert(jesseResult.masteryGain < kapoorResult.masteryGain, "Jesse should provide less mastery than Kapoor");
  assert(jesseResult.confidenceGain > kapoorResult.confidenceGain, "Jesse should boost confidence more");
  
  // Test Garcia teaching patient care (her specialty)
  const garciaResult = learningSystem.learnFromCharacter('garcia', 'patient_care', 0.1);
  assert(garciaResult.masteryGain > 0.1, "Garcia should provide bonus mastery in patient care");
  assert(garciaResult.confidenceGain > 0.1, "Garcia's empathetic approach should boost confidence");
  
  // Test teaching outside specialization
  const kapoorPatientResult = learningSystem.learnFromCharacter('kapoor', 'patient_care', 0.1);
  assert(kapoorPatientResult.masteryGain < garciaResult.masteryGain, "Teaching outside specialty should be less effective");
}

module.exports = { testCharacterTeachingStyles };

// Run test directly when executed as a standalone file
function runTest() {
  console.log("🧪 Running test: testCharacterTeachingStyles");
  try {
    testCharacterTeachingStyles();
    console.log("✅ PASSED: testCharacterTeachingStyles");
    return true;
  } catch (error) {
    console.error(`❌ FAILED: testCharacterTeachingStyles`);
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

// Run directly only when executed as main
if (require.main === module) {
  runTest();
}