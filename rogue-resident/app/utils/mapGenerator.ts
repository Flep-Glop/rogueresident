// utils/mapGenerator.ts
import { nanoid } from 'nanoid';
import { GameMap, Node, NodeType, NodePosition } from '../types/map';

// Sample character associations for node types
const CHARACTER_ASSOCIATIONS: Record<NodeType, string> = {
  'kapoorCalibration': 'kapoor', // Explicit association for our featured node
  'clinical': 'kapoor',
  'qa': 'jesse',
  'educational': 'quinn',
  'storage': 'jesse', 
  'vendor': 'jesse',
  'experimental': 'quinn',
  'qualification': 'kapoor',
  'entrance': 'kapoor',
  'boss': 'quinn',
  'boss-ionix': 'quinn'
};

// Sample descriptions for node types
const NODE_DESCRIPTIONS: Record<NodeType, string[]> = {
  'kapoorCalibration': [
    'Dr. Kapoor is conducting monthly output measurements on LINAC 2.',
    'A precision calibration session with the department\'s Chief Medical Physicist.',
    'Critical calibration procedures that ensure accurate dose delivery to patients.'
  ],
  'clinical': [
    'A complex treatment planning case requires review.',
    'Dr. Kapoor is reviewing patient dose distributions.',
    'Review treatment plans with the radiation oncologist.'
  ],
  'qa': [
    'Equipment calibration is needed on LINAC 2.',
    'Daily QA procedures must be performed.',
    'Jesse needs help with monthly output measurements.'
  ],
  'educational': [
    'Dr. Quinn is explaining a new radiation physics concept.',
    'A training session on proper dosimetry techniques.',
    'Review the latest research findings with the physics team.'
  ],
  'storage': [
    'The equipment storage room might have useful tools.',
    'Jesse mentioned some spare parts in the storage closet.',
    'Check the storage area for calibration equipment.'
  ],
  'vendor': [
    'A vendor rep is demonstrating new QA equipment.',
    'Purchase supplies or equipment upgrades.',
    'Evaluate new measurement devices from vendors.'
  ],
  'experimental': [
    'Dr. Quinn is testing an unusual radiation detector.',
    'An experimental procedure with uncertain outcomes.',
    'Help with a research project using novel techniques.'
  ],
  'qualification': [
    'Demonstrate your knowledge before proceeding further.',
    'A testing station to verify your understanding.',
    'Dr. Kapoor needs to confirm your competency level.'
  ],
  'entrance': [
    'Your day begins here at the hospital entrance.',
    'The main entrance to the Medical Physics Department.',
    'Start your rounds from the department entrance.'
  ],
  'boss': [
    'A challenging synthesis of all your medical physics knowledge.',
    'A complex case requiring all your expertise.',
    'The department head wants to evaluate your overall competency.'
  ],
  'boss-ionix': [
    "Dr. Quinn's experimental ion chamber has developed unusual properties.",
    "The IONIX system requires careful calibration and understanding.",
    "A quantum-sensitive ion chamber with unexpected behavior."
  ]
};

// Sample titles for node types
const NODE_TITLES: Record<NodeType, string[]> = {
  'kapoorCalibration': [
    'LINAC Output Calibration',
    'Precision Dosimetry Session',
    'Calibration Protocol Review'
  ],
  'clinical': [
    'Patient Treatment Plan Review',
    'Dose Distribution Analysis',
    'Clinical Treatment Verification'
  ],
  'qa': [
    'LINAC Output Calibration',
    'Equipment Quality Assurance',
    'Beam Profile Measurement'
  ],
  'educational': [
    'Radiobiology Lecture',
    'Radiation Safety Training',
    'Treatment Optimization Seminar'
  ],
  'storage': [
    'Equipment Storage Room',
    'Supply Closet',
    'Measurement Device Storage'
  ],
  'vendor': [
    'Equipment Supplier Demo',
    'Vendor Showcase',
    'Technology Marketplace'
  ],
  'experimental': [
    'Experimental Detection Methods',
    'Research Protocol Testing',
    'Quantum Dosimetry Experiment'
  ],
  'qualification': [
    'Competency Verification',
    'Knowledge Assessment',
    'Qualification Test'
  ],
  'entrance': [
    'Department Entrance',
    'Hospital Entry Point',
    'Medical Physics Wing Entrance'
  ],
  'boss': [
    'Department Review Challenge',
    'Comprehensive Knowledge Test',
    'Chief Physicist Evaluation'
  ],
  'boss-ionix': [
    'IONIX Calibration Challenge',
    'Quantum Ion Chamber Mastery',
    'Experimental Detector Evaluation'
  ]
};

// Reward scaling based on node type
const INSIGHT_REWARDS: Record<NodeType, number> = {
  'kapoorCalibration': 50, // High reward for our focused calibration experience
  'entrance': 5,
  'clinical': 15,
  'qa': 15,
  'educational': 20,
  'storage': 10,
  'vendor': 15,
  'experimental': 25,
  'qualification': 30,
  'boss': 40,
  'boss-ionix': 50
};

// Enhanced function to generate a procedural map for the game
export function generateMap(): GameMap {
  // For the prototype phase, use our focused calibration map
  return generateKapoorCalibrationMap();
}

// Generate a focused map with just the Kapoor calibration node
function generateKapoorCalibrationMap(): GameMap {
  // Create nodes with meaningful spatial relationships and connected pathways
  const nodes: Node[] = [
    {
      id: 'kapoorCalibrationNode',
      title: 'LINAC Output Calibration',
      description: 'Dr. Kapoor is conducting monthly output measurements on LINAC 2.',
      character: 'kapoor',
      type: 'kapoorCalibration',
      position: { x: 50, y: 50 }, // Center of the map
      connections: [], // No connections needed for single-node flow
      isLocked: false,
      insightReward: INSIGHT_REWARDS['kapoorCalibration']
    }
  ];
  
  return {
    nodes,
    startNodeId: 'kapoorCalibrationNode', // This is now our only node
    bossNodeId: 'kapoorCalibrationNode', // Setting this to the same node since we only have one
    dimensions: {
      width: 100,
      height: 100
    }
  };
}

// Original prototype map generation - kept for reference or future expansion
function generatePrototypeMap(): GameMap {
  // Create nodes with meaningful spatial relationships and connected pathways
  const nodes: Node[] = [
    {
      id: 'start',
      title: 'Department Entrance',
      description: 'Your day begins here at the hospital entrance.',
      character: 'kapoor',
      type: 'entrance',
      position: { x: 50, y: 10 },
      connections: ['qa-1', 'clinical-1'],
      isLocked: false,
      insightReward: 5
    },
    {
      id: 'qa-1',
      title: 'LINAC Output Calibration',
      description: 'Dr. Kapoor is conducting monthly output measurements on LINAC 2.',
      character: 'kapoor',
      type: 'qa',
      position: { x: 30, y: 30 },
      connections: ['storage-1'],
      isLocked: false,
      insightReward: 15
    },
    {
      id: 'clinical-1',
      title: 'Patient Plan Review',
      description: 'Review treatment plans with Dr. Garcia.',
      character: 'garcia',
      type: 'clinical',
      position: { x: 70, y: 30 },
      connections: ['experimental-1'],
      isLocked: false,
      insightReward: 15
    },
    {
      id: 'storage-1',
      title: 'Equipment Storage',
      description: 'Jesse might have some useful items here.',
      character: 'jesse',
      type: 'storage',
      position: { x: 25, y: 50 },
      connections: ['qualification-1'],
      isLocked: false,
      insightReward: 10
    },
    {
      id: 'experimental-1',
      title: 'Experimental Detection',
      description: 'Dr. Quinn is testing a modified radiation detector with unusual results.',
      character: 'quinn',
      type: 'experimental',
      position: { x: 75, y: 50 },
      connections: ['qualification-1'],
      isLocked: false,
      insightReward: 20
    },
    {
      id: 'qualification-1',
      title: 'Qualification Test',
      description: 'Demonstrate your knowledge before facing Ionix.',
      character: 'kapoor',
      type: 'qualification',
      position: { x: 50, y: 70 },
      connections: ['boss-ionix'],
      isLocked: false,
      insightReward: 25
    },
    {
      id: 'boss-ionix',
      title: 'IONIX Challenge',
      description: "Dr. Quinn's experimental ion chamber needs calibration. Demonstrate your mastery.",
      character: 'quinn',
      type: 'boss-ionix',
      position: { x: 50, y: 90 },
      connections: [],
      isLocked: false,
      insightReward: 50
    },
  ];
  
  return {
    nodes,
    startNodeId: 'start',
    bossNodeId: 'boss-ionix',
    dimensions: {
      width: 100,
      height: 100
    }
  };
}

// Generate a fully procedural map with dynamic node placement and connections
function generateProceduralMap(): GameMap {
  const nodeTypes: NodeType[] = ['clinical', 'qa', 'educational', 'storage', 'vendor', 'experimental'];
  
  // Create a simple map with 12 nodes (3 rows of 4 nodes)
  const nodes: Node[] = [];
  
  // Start node (entrance)
  const startNodeId = nanoid();
  nodes.push(createEnhancedNode(
    startNodeId,
    'entrance',
    { x: 50, y: 10 }, // Center-top position
    [],
    false
  ));
  
  // Generate middle layer nodes (row 1)
  const row1Nodes: Node[] = [];
  for (let i = 0; i < 3; i++) {
    const nodeId = nanoid();
    // Distribute horizontally with variation
    const xPos = 25 + (i * 25) + (Math.random() * 10 - 5);
    const nodeType = pickRandomNodeType(nodeTypes);
    
    row1Nodes.push(createEnhancedNode(
      nodeId,
      nodeType,
      { x: xPos, y: 30 + (Math.random() * 10 - 5) },
      [],
      false
    ));
  }
  nodes.push(...row1Nodes);
  
  // Generate middle layer nodes (row 2)
  const row2Nodes: Node[] = [];
  for (let i = 0; i < 4; i++) {
    const nodeId = nanoid();
    // Distribute horizontally with variation
    const xPos = 20 + (i * 20) + (Math.random() * 10 - 5);
    const nodeType = pickRandomNodeType(nodeTypes);
    
    row2Nodes.push(createEnhancedNode(
      nodeId,
      nodeType,
      { x: xPos, y: 55 + (Math.random() * 10 - 5) },
      [],
      false
    ));
  }
  nodes.push(...row2Nodes);
  
  // Add qualification node(s)
  const qualNodeId = nanoid();
  nodes.push(createEnhancedNode(
    qualNodeId,
    'qualification',
    { x: 50, y: 75 },
    [],
    false
  ));
  
  // Boss node
  const bossNodeId = nanoid();
  nodes.push(createEnhancedNode(
    bossNodeId,
    'boss-ionix',
    { x: 50, y: 90 }, // Center-bottom position
    [],
    false
  ));
  
  // Connect nodes
  // Start node connects to 2 row1 nodes
  const startNode = nodes.find(n => n.id === startNodeId)!;
  startNode.connections = row1Nodes.slice(0, 2).map(n => n.id);
  
  // Row 1 connects to row 2 with branching
  row1Nodes.forEach((node, idx) => {
    // Each row1 node connects to 1-2 row2 nodes
    const connections = [];
    const baseIdx = Math.min(Math.max(0, idx), row2Nodes.length - 2);
    
    // Always connect to at least one node
    connections.push(row2Nodes[baseIdx].id);
    
    // 60% chance to connect to a second node
    if (Math.random() < 0.6) {
      const secondIdx = baseIdx + 1;
      connections.push(row2Nodes[secondIdx].id);
    }
    
    node.connections = connections;
  });
  
  // Row 2 connects to qualification node
  row2Nodes.forEach(node => {
    node.connections = [qualNodeId];
  });
  
  // Qualification node connects to boss
  const qualNode = nodes.find(n => n.id === qualNodeId)!;
  qualNode.connections = [bossNodeId];
  
  return {
    nodes,
    startNodeId,
    bossNodeId,
    dimensions: {
      width: 100,
      height: 100
    }
  };
}

// Helper function to create an enhanced node with all required properties
function createEnhancedNode(
  id: string,
  type: NodeType,
  position: NodePosition,
  connections: string[],
  isLocked: boolean
): Node {
  // Select random title and description based on node type
  const titles = NODE_TITLES[type] || ['Unknown Node'];
  const descriptions = NODE_DESCRIPTIONS[type] || ['No description available'];
  
  // Get character association
  const character = CHARACTER_ASSOCIATIONS[type] || 'kapoor';
  
  // Get insight reward
  const insightReward = INSIGHT_REWARDS[type] || 10;
  
  return {
    id,
    type,
    title: titles[Math.floor(Math.random() * titles.length)],
    description: descriptions[Math.floor(Math.random() * descriptions.length)],
    character,
    position,
    connections,
    isLocked,
    insightReward
  };
}

// Helper function to pick a random node type, excluding certain types
function pickRandomNodeType(nodeTypes: NodeType[]): NodeType {
  return nodeTypes[Math.floor(Math.random() * nodeTypes.length)];
}

// Helper function to get node details given a node ID
export function getNodeDetails(map: GameMap, nodeId: string): Node | null {
  return map.nodes.find(n => n.id === nodeId) || null;
}

// For backward compatibility during the transition
export function getNodeTypeById(map: GameMap, nodeId: string): NodeType | null {
  const node = map.nodes.find(n => n.id === nodeId);
  return node ? node.type : null;
}