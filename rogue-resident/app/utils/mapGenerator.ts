import { nanoid } from 'nanoid';
import { GameMap, Node, NodeType } from '../types/map';

// For prototype, generate a simple map with predefined structure
export function generateMap(): GameMap {
  const nodeTypes: NodeType[] = ['clinical', 'qa', 'educational', 'storage', 'vendor'];
  
  // Create a simple map with 12 nodes (3 rows of 4 nodes)
  const nodes: Node[] = [];
  
  // Start node (row 0, position 1)
  const startNodeId = nanoid();
  nodes.push({
    id: startNodeId,
    type: 'clinical',
    position: { x: 1, y: 0 },
    connections: [],
    isLocked: false,
  });
  
  // Middle nodes (rows 1-2)
  for (let row = 1; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const nodeId = nanoid();
      const randomType = nodeTypes[Math.floor(Math.random() * nodeTypes.length)];
      
      nodes.push({
        id: nodeId,
        type: randomType,
        position: { x: col, y: row },
        connections: [],
        isLocked: true,
      });
    }
  }
  
  // Boss node (row 3, position 2)
  const bossNodeId = nanoid();
  nodes.push({
    id: bossNodeId,
    type: 'boss',
    position: { x: 2, y: 3 },
    connections: [],
    isLocked: true,
  });
  
  // Connect nodes
  // First connect start node to first row
  const firstRowNodes = nodes.filter(node => node.position.y === 1);
  nodes.find(n => n.id === startNodeId)!.connections = firstRowNodes.slice(0, 2).map(n => n.id);
  
  // Connect first row to second row
  firstRowNodes.forEach((node, idx) => {
    const secondRowStart = Math.max(0, idx - 1);
    const secondRowEnd = Math.min(firstRowNodes.length - 1, idx + 1);
    const connectedNodes = nodes
      .filter(n => n.position.y === 2)
      .slice(secondRowStart, secondRowEnd + 1);
    
    node.connections = connectedNodes.map(n => n.id);
  });
  
  // Connect second row to boss
  const secondRowNodes = nodes.filter(node => node.position.y === 2);
  secondRowNodes.forEach(node => {
    if (node.position.x >= 1 && node.position.x <= 2) {
      node.connections = [bossNodeId];
    }
  });
  
  return {
    nodes,
    startNodeId,
    bossNodeId,
  };
}