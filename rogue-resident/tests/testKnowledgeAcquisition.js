// tests/testKnowledgeAcquisition.js
const { assert, assertEqual } = require('./assert');

function testKnowledgeAcquisition() {
  // Create test double for knowledge constellation
  const constellation = {
    stars: {
      'dose_measurement': { mastery: 0.0, visualState: 'undiscovered' },
      'calibration_protocol': { mastery: 0.0, visualState: 'undiscovered' }
    },
    connections: []
  };
  
  // Test knowledge manager
  const knowledgeManager = {
    updateMastery(nodeId, success, amount = 0.1) {
      const star = constellation.stars[nodeId];
      if (!star) return false;
      
      if (success) {
        // Success: move up toward 1.0, but slower as you approach mastery
        const room = 1.0 - star.mastery;
        star.mastery += (amount * room);
      } else {
        // Failure: move down toward 0.0, but slower as you approach zero
        const room = star.mastery;
        star.mastery -= (amount * 0.5 * room);
      }
      
      // Update visual state based on mastery
      if (star.mastery >= 0.75) {
        star.visualState = 'mastered';
      } else if (star.mastery >= 0.3) {
        star.visualState = 'practicing';
      } else if (star.mastery > 0) {
        star.visualState = 'introduced';
      }
      
      return true;
    },
    
    formConnection(starA, starB) {
      if (constellation.stars[starA]?.mastery > 0.3 && 
          constellation.stars[starB]?.mastery > 0.3) {
        // Only form connections between stars with sufficient mastery
        const connection = [starA, starB].sort().join(':');
        if (!constellation.connections.includes(connection)) {
          constellation.connections.push(connection);
          return true;
        }
      }
      return false;
    }
  };
  
  // Test mastery updates
  knowledgeManager.updateMastery('dose_measurement', true, 0.4);
  assertEqual(constellation.stars['dose_measurement'].mastery, 0.4, "Mastery should increase by 0.4");
  assertEqual(constellation.stars['dose_measurement'].visualState, 'practicing', "Visual state should update to practicing");
  
  knowledgeManager.updateMastery('calibration_protocol', true, 0.35);
  assertEqual(constellation.stars['calibration_protocol'].mastery, 0.35, "Mastery should increase by 0.35");
  
  // Test connection formation
  const connectionFormed = knowledgeManager.formConnection('dose_measurement', 'calibration_protocol');
  assert(connectionFormed, "Connection should form when both stars have sufficient mastery");
  assertEqual(constellation.connections.length, 1, "Should have one connection");
}

module.exports = { testKnowledgeAcquisition };

// Run test directly when executed as a standalone file
function runTest() {
  console.log("🧪 Running test: testKnowledgeAcquisition");
  try {
    testKnowledgeAcquisition();
    console.log("✅ PASSED: testKnowledgeAcquisition");
    return true;
  } catch (error) {
    console.error(`❌ FAILED: testKnowledgeAcquisition`);
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

// Run directly only when executed as main
if (require.main === module) {
  runTest();
}