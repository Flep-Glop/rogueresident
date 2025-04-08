// tests/testResourceSystems.js
const { assert, assertEqual, assertIncludes } = require('./assert');
const { createEventRecorder } = require('./eventRecorder');

/**
 * Tests the resource systems: Insight and Momentum
 */
function testResourceSystems() {
  const events = createEventRecorder();
  
  // Test doubles for game state
  const gameState = {
    player: {
      insight: 100, // Full insight
      momentum: 0,  // No momentum initially
      strategicActions: {
        reframe: { unlocked: false, threshold: 25 },
        extrapolate: { unlocked: false, threshold: 50 },
        boast: { unlocked: false, threshold: 75 }
      }
    },
    
    // Methods to modify resources
    decreaseInsight(amount) {
      const oldValue = this.player.insight;
      this.player.insight = Math.max(0, this.player.insight - amount);
      
      events.record('insight-changed', { 
        oldValue, 
        newValue: this.player.insight,
        change: -amount
      });
      
      // Update strategic actions availability
      this.updateStrategicActions();
      
      return this.player.insight;
    },
    
    increaseInsight(amount) {
      const oldValue = this.player.insight;
      this.player.insight = Math.min(100, this.player.insight + amount);
      
      events.record('insight-changed', { 
        oldValue, 
        newValue: this.player.insight,
        change: amount
      });
      
      // Update strategic actions availability
      this.updateStrategicActions();
      
      return this.player.insight;
    },
    
    setMomentum(level) {
      const oldValue = this.player.momentum;
      this.player.momentum = Math.max(0, Math.min(3, level));
      
      events.record('momentum-changed', { 
        oldValue, 
        newValue: this.player.momentum
      });
      
      // Update strategic actions availability
      this.updateStrategicActions();
      
      return this.player.momentum;
    },
    
    increaseMomentum() {
      if (this.player.momentum < 3) {
        const oldValue = this.player.momentum;
        this.player.momentum++;
        
        events.record('momentum-changed', { 
          oldValue, 
          newValue: this.player.momentum
        });
        
        // Update strategic actions availability
        this.updateStrategicActions();
      }
      
      return this.player.momentum;
    },
    
    resetMomentum() {
      if (this.player.momentum > 0) {
        const oldValue = this.player.momentum;
        this.player.momentum = 0;
        
        events.record('momentum-changed', { 
          oldValue, 
          newValue: 0
        });
        
        // Update strategic actions availability
        this.updateStrategicActions();
      }
      
      return 0;
    },
    
    updateStrategicActions() {
      // Reframe available at 25% insight
      const oldReframe = this.player.strategicActions.reframe.unlocked;
      const newReframe = this.player.insight >= 25;
      this.player.strategicActions.reframe.unlocked = newReframe;
      
      if (oldReframe !== newReframe) {
        events.record('strategic-action-changed', { 
          action: 'reframe', 
          unlocked: newReframe 
        });
      }
      
      // Extrapolate available at 50% insight
      const oldExtrapolate = this.player.strategicActions.extrapolate.unlocked;
      const newExtrapolate = this.player.insight >= 50;
      this.player.strategicActions.extrapolate.unlocked = newExtrapolate;
      
      if (oldExtrapolate !== newExtrapolate) {
        events.record('strategic-action-changed', { 
          action: 'extrapolate', 
          unlocked: newExtrapolate 
        });
      }
      
      // Boast available at max momentum (level 3)
      const oldBoast = this.player.strategicActions.boast.unlocked;
      const newBoast = this.player.momentum >= 3;
      this.player.strategicActions.boast.unlocked = newBoast;
      
      if (oldBoast !== newBoast) {
        events.record('strategic-action-changed', { 
          action: 'boast', 
          unlocked: newBoast 
        });
      }
    }
  };
  
  // Initialize strategic actions
  gameState.updateStrategicActions();
  
  // ---- TEST 1: Insight Management ----
  console.log("Testing Insight management...");
  
  // Insight starts at 100
  assertEqual(gameState.player.insight, 100, "Insight should start at 100");
  
  // Decrease insight
  gameState.decreaseInsight(30);
  assertEqual(gameState.player.insight, 70, "Insight should decrease correctly");
  assert(events.hasEventType('insight-changed'), "Insight changed event should fire");
  
  // Decrease insight below 0 (should clamp to 0)
  gameState.decreaseInsight(100);
  assertEqual(gameState.player.insight, 0, "Insight should not go below 0");
  
  // Increase insight
  gameState.increaseInsight(50);
  assertEqual(gameState.player.insight, 50, "Insight should increase correctly");
  
  // Increase insight above 100 (should clamp to 100)
  gameState.increaseInsight(100);
  assertEqual(gameState.player.insight, 100, "Insight should not exceed 100");
  
  console.log("✅ Insight management tests passed");
  
  // ---- TEST 2: Momentum Management ----
  console.log("Testing Momentum management...");
  
  // Momentum starts at 0
  assertEqual(gameState.player.momentum, 0, "Momentum should start at 0");
  
  // Increase momentum
  gameState.increaseMomentum();
  assertEqual(gameState.player.momentum, 1, "Momentum should increase by 1");
  assert(events.hasEventType('momentum-changed'), "Momentum changed event should fire");
  
  // Increase to max
  gameState.increaseMomentum();
  gameState.increaseMomentum();
  assertEqual(gameState.player.momentum, 3, "Momentum should reach maximum of 3");
  
  // Try to exceed max (should stay at 3)
  gameState.increaseMomentum();
  assertEqual(gameState.player.momentum, 3, "Momentum should not exceed 3");
  
  // Reset momentum
  gameState.resetMomentum();
  assertEqual(gameState.player.momentum, 0, "Reset should return momentum to 0");
  
  // Set specific momentum level
  gameState.setMomentum(2);
  assertEqual(gameState.player.momentum, 2, "Should set momentum to specified level");
  
  console.log("✅ Momentum management tests passed");
  
  // ---- TEST 3: Strategic Actions ----
  console.log("Testing Strategic Actions unlocking...");
  
  // Set insight to test action unlocking
  gameState.decreaseInsight(100); // Set to 0
  gameState.resetMomentum();      // Set to 0
  
  // Verify all actions locked at 0 insight and 0 momentum
  assertEqual(gameState.player.strategicActions.reframe.unlocked, false, 
             "Reframe should be locked at 0 insight");
  assertEqual(gameState.player.strategicActions.extrapolate.unlocked, false, 
             "Extrapolate should be locked at 0 insight");
  assertEqual(gameState.player.strategicActions.boast.unlocked, false, 
             "Boast should be locked at 0 momentum");
  
  // Unlock Reframe (25% insight threshold)
  gameState.increaseInsight(25);
  assertEqual(gameState.player.insight, 25, "Insight should be set to 25");
  assertEqual(gameState.player.strategicActions.reframe.unlocked, true, 
             "Reframe should unlock at 25 insight");
  assert(events.hasEventType('strategic-action-changed'), 
         "Strategic action changed event should fire");
  
  // Unlock Extrapolate (50% insight threshold)
  gameState.increaseInsight(25);
  assertEqual(gameState.player.insight, 50, "Insight should be set to 50");
  assertEqual(gameState.player.strategicActions.extrapolate.unlocked, true, 
             "Extrapolate should unlock at 50 insight");
  
  // Unlock Boast (max momentum threshold)
  gameState.setMomentum(3);
  assertEqual(gameState.player.momentum, 3, "Momentum should be set to 3");
  assertEqual(gameState.player.strategicActions.boast.unlocked, true, 
             "Boast should unlock at momentum 3");
  
  // Lock actions again by reducing resources
  gameState.decreaseInsight(30);
  gameState.resetMomentum();
  
  assertEqual(gameState.player.strategicActions.reframe.unlocked, false, 
             "Reframe should lock when insight drops below threshold");
  assertEqual(gameState.player.strategicActions.extrapolate.unlocked, false, 
             "Extrapolate should lock when insight drops below threshold");
  assertEqual(gameState.player.strategicActions.boast.unlocked, false, 
             "Boast should lock when momentum drops below threshold");
  
  console.log("✅ Strategic Actions tests passed");
  
  return true;
}

// Export the test
module.exports = testResourceSystems;

// Run test directly when executed as a standalone file
if (require.main === module) {
  console.log("🧪 Running Resource Systems Test");
  try {
    testResourceSystems();
    console.log("✅ PASSED: Resource Systems Test");
  } catch (error) {
    console.error(`❌ FAILED: Resource Systems Test`);
    console.error(`   Error: ${error.message}`);
    process.exit(1);
  }
}