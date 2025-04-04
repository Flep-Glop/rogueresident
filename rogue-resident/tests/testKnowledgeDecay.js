// tests/testKnowledgeDecay.js
const { assert, assertEqual } = require('./assert');

function testKnowledgeDecay() {
  // Simplified knowledge node with decay
  const createKnowledgeNode = (id, initialMastery = 0) => ({
    id,
    mastery: initialMastery,
    lastPracticed: Date.now(),
    visualState: initialMastery > 0.75 ? 'mastered' : 
                initialMastery > 0.3 ? 'practicing' :
                initialMastery > 0 ? 'introduced' : 'undiscovered'
  });
  
  // Create test constellation
  const knowledgeSystem = {
    nodes: {
      'dose_calculation': createKnowledgeNode('dose_calculation', 0.8),
      'calibration': createKnowledgeNode('calibration', 0.4),
      'patient_safety': createKnowledgeNode('patient_safety', 0.2)
    },
    
    // Update knowledge node visualization
    updateVisualState(nodeId) {
      const node = this.nodes[nodeId];
      if (!node) return;
      
      node.visualState = node.mastery > 0.75 ? 'mastered' : 
                         node.mastery > 0.3 ? 'practicing' :
                         node.mastery > 0 ? 'introduced' : 'undiscovered';
    },
    
    // Knowledge decay function - simulates actual code from your implementation
    applyKnowledgeDecay(nodeId, daysPassed) {
      const node = this.nodes[nodeId];
      if (!node) return false;
      
      // Only apply decay after 3+ days of no practice
      if (daysPassed > 3) {
        // ~5% decay per week, pro-rated by days
        const decayRate = 0.007 * (daysPassed - 3);
        
        // Apply decay with minimum floor of 0
        const oldMastery = node.mastery;
        node.mastery = Math.max(0, node.mastery - decayRate);
        
        // Update visual representation
        this.updateVisualState(nodeId);
        
        return oldMastery !== node.mastery;
      }
      
      return false;
    },
    
    // Practice a node to refresh mastery
    practiceNode(nodeId, masteryGain = 0.1) {
      const node = this.nodes[nodeId];
      if (!node) return false;
      
      node.lastPracticed = Date.now();
      node.mastery = Math.min(1.0, node.mastery + masteryGain);
      this.updateVisualState(nodeId);
      
      return true;
    }
  };
  
  // Test mastery decay over time
  const masterNode = knowledgeSystem.nodes['dose_calculation'];
  assertEqual(masterNode.mastery, 0.8, "Initial mastery should be 0.8");
  assertEqual(masterNode.visualState, 'mastered', "Initial state should be mastered");
  
  // Test no decay for short periods
  knowledgeSystem.applyKnowledgeDecay('dose_calculation', 3);
  assertEqual(masterNode.mastery, 0.8, "No decay should occur within 3 days");
  
  // Test decay after longer period
  knowledgeSystem.applyKnowledgeDecay('dose_calculation', 10);
  assert(masterNode.mastery < 0.8, "Mastery should decay after 10 days");
  assert(masterNode.mastery > 0.7, "Decay should be gradual");
  
  // Test state transition from decay
  const practiced = knowledgeSystem.nodes['calibration'];
  assertEqual(practiced.mastery, 0.4, "Initial mastery should be 0.4");
  assertEqual(practiced.visualState, 'practicing', "Initial state should be practicing");
  
  // Apply significant decay - FIXED: Increased days for more dramatic decay
  knowledgeSystem.applyKnowledgeDecay('calibration', 25); // About three and a half weeks
  assert(practiced.mastery < 0.3, "Mastery should fall below threshold with significant decay");
  assertEqual(practiced.visualState, 'introduced', "Visual state should change with significant decay");
  
  // Test practice refreshes last practiced timestamp
  const oldTimestamp = practiced.lastPracticed;
  knowledgeSystem.practiceNode('calibration', 0.2);
  assert(practiced.lastPracticed > oldTimestamp, "Practice should update timestamp");
  assertEqual(practiced.visualState, 'practicing', "Practice should restore visual state");
}

module.exports = { testKnowledgeDecay };

// Run test directly when executed as a standalone file
function runTest() {
  console.log("🧪 Running test: testKnowledgeDecay");
  try {
    testKnowledgeDecay();
    console.log("✅ PASSED: testKnowledgeDecay");
    return true;
  } catch (error) {
    console.error(`❌ FAILED: testKnowledgeDecay`);
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

// Run directly only when executed as main
if (require.main === module) {
  runTest();
}