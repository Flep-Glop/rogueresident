// utils/mapGenerator.ts
import { nanoid } from 'nanoid';

export type NodeType = 'clinical' | 'qa' | 'educational' | 'storage' | 'vendor' | 'boss';

export interface Node {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  connections: string[]; // IDs of connected nodes
  isLocked: boolean;
}

export interface GameMap {
  nodes: Node[];
  startNodeId: string;
  bossNodeId: string;
}

// For prototype, generate a simple map with predefined structure
export function generateMap(): GameMap {
  const nodeTypes: NodeType[] = ['clinical', 'qa', 'storage', 'vendor'];
  
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
      
      // Make one storage closet in each row for the prototype
      let randomType: NodeType;
      if (col === 0) {
        randomType = 'storage';
      } else {
        // For simplicity in the prototype, only use clinical and storage nodes
        // You can uncomment this for more variety once those node types are implemented
        // randomType = nodeTypes[Math.floor(Math.random() * nodeTypes.length)];
        randomType = 'clinical';
      }
      
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

// Helper function to get node type given a node ID
export function getNodeTypeById(map: GameMap, nodeId: string): NodeType | null {
  const node = map.nodes.find(n => n.id === nodeId);
  return node ? node.type : null;
}