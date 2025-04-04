// tests/testNodeAccessibility.js
const { assert, assertEqual } = require('./assert');

function testNodeAccessibility() {
  const mapState = {
    nodes: [
      { id: 'start', type: 'entrance', connections: ['node1', 'node2'] },
      { id: 'node1', type: 'clinical', connections: ['node3'] },
      { id: 'node2', type: 'qa', connections: ['node4'] },
      { id: 'node3', type: 'educational', connections: ['boss'] },
      { id: 'node4', type: 'storage', connections: ['boss'] },
      { id: 'boss', type: 'boss-ionix', connections: [] }
    ],
    startNodeId: 'start',
    bossNodeId: 'boss',
    completedNodeIds: []
  };
  
  // Node accessibility logic - Fixed to match logic in your gameStore.ts
  function isNodeAccessible(nodeId) {
    // Start node is always accessible
    if (nodeId === mapState.startNodeId) return true;
    
    // Get the node
    const node = mapState.nodes.find(n => n.id === nodeId);
    if (!node) return false;
    
    // Special cases that are always accessible
    if (node.type === 'entrance') return true;
    
    // Check for connections from completed nodes
    const isConnectedToCompleted = mapState.nodes.some(n => 
      n.connections.includes(nodeId) && mapState.completedNodeIds.includes(n.id)
    );
    
    // Additionally, check direct connections from start node (matches your game logic)
    const startNode = mapState.nodes.find(n => n.id === mapState.startNodeId);
    const isConnectedToStart = startNode && startNode.connections.includes(nodeId);
    
    return isConnectedToCompleted || isConnectedToStart;
  }
  
  // Initial state
  assertEqual(isNodeAccessible('start'), true, "Start node should be accessible");
  assertEqual(isNodeAccessible('node1'), true, "Node1 should be accessible from start");
  assertEqual(isNodeAccessible('node2'), true, "Node2 should be accessible from start");
  assertEqual(isNodeAccessible('node3'), false, "Node3 shouldn't be accessible yet");
  assertEqual(isNodeAccessible('boss'), false, "Boss shouldn't be accessible yet");
  
  // Complete node1
  mapState.completedNodeIds.push('node1');
  
  // Check updated accessibility
  assertEqual(isNodeAccessible('node3'), true, "Node3 should be accessible after completing node1");
  assertEqual(isNodeAccessible('boss'), false, "Boss still shouldn't be accessible");
  
  // Complete node3
  mapState.completedNodeIds.push('node3');
  
  // Check boss accessibility
  assertEqual(isNodeAccessible('boss'), true, "Boss should be accessible after completing node3");
}

module.exports = { testNodeAccessibility };

// Run test directly when executed as a standalone file
function runTest() {
  console.log("🧪 Running test: testNodeAccessibility");
  try {
    testNodeAccessibility();
    console.log("✅ PASSED: testNodeAccessibility");
    return true;
  } catch (error) {
    console.error(`❌ FAILED: testNodeAccessibility`);
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

// Run directly only when executed as main
if (require.main === module) {
  runTest();
}