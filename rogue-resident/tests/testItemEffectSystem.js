// tests/testItemEffectSystem.js
const { assert, assertEqual } = require('./assert');

function testItemEffectSystem() {
  // Player state with modifiable stats
  const player = {
    stats: {
      clinical: 0,
      qa: 0,
      knowledge: 0,
      insight: 100
    },
    activeEffects: []
  };
  
  // Basic item system
  const itemSystem = {
    // Item database
    items: {
      'calibration_manual': {
        id: 'calibration_manual',
        name: 'Calibration Manual',
        effects: [
          { type: 'qa', value: 10 }
        ],
        duration: 'permanent'
      },
      'focus_lens': {
        id: 'focus_lens', 
        name: 'Focus Lens',
        effects: [
          { type: 'clinical', value: 5 },
          { type: 'knowledge', value: 5 }
        ],
        duration: 3 // lasts for 3 days
      }
    },
    
    // Add item to player
    addItem(playerId, itemId) {
      const item = this.items[itemId];
      if (!item) return false;
      
      // Apply immediate stat bonuses
      item.effects.forEach(effect => {
        player.stats[effect.type] += effect.value;
      });
      
      // Track temporary effects
      if (item.duration !== 'permanent') {
        player.activeEffects.push({
          sourceItem: itemId,
          daysRemaining: item.duration,
          effects: item.effects
        });
      }
      
      return true;
    },
    
    // Process day advancement
    processDayEnd() {
      // Process temporary effects
      for (let i = player.activeEffects.length - 1; i >= 0; i--) {
        const effect = player.activeEffects[i];
        effect.daysRemaining--;
        
        if (effect.daysRemaining <= 0) {
          // Remove expired effects
          effect.effects.forEach(e => {
            player.stats[e.type] -= e.value;
          });
          player.activeEffects.splice(i, 1);
        }
      }
    }
  };
  
  // Test adding permanent item
  itemSystem.addItem('player1', 'calibration_manual');
  assertEqual(player.stats.qa, 10, "QA stat should increase by 10");
  assertEqual(player.activeEffects.length, 0, "Permanent items shouldn't create active effects");
  
  // Test adding temporary item
  itemSystem.addItem('player1', 'focus_lens');
  assertEqual(player.stats.clinical, 5, "Clinical stat should increase by 5");
  assertEqual(player.stats.knowledge, 5, "Knowledge stat should increase by 5");
  assertEqual(player.activeEffects.length, 1, "Should track temporary effect");
  
  // Test effect duration
  itemSystem.processDayEnd();
  assertEqual(player.activeEffects[0].daysRemaining, 2, "Effect duration should decrease");
  
  // Advance to expiration
  itemSystem.processDayEnd();
  itemSystem.processDayEnd();
  assertEqual(player.activeEffects.length, 0, "Effect should be removed after expiration");
  assertEqual(player.stats.clinical, 0, "Stat should revert when effect expires");
  assertEqual(player.stats.knowledge, 0, "Stat should revert when effect expires");
  assertEqual(player.stats.qa, 10, "Permanent effects should remain");
}

module.exports = { testItemEffectSystem };

// Run test directly when executed as a standalone file
function runTest() {
  console.log("🧪 Running test: testItemEffectSystem");
  try {
    testItemEffectSystem();
    console.log("✅ PASSED: testItemEffectSystem");
    return true;
  } catch (error) {
    console.error(`❌ FAILED: testItemEffectSystem`);
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

// Run directly only when executed as main
if (require.main === module) {
  runTest();
}