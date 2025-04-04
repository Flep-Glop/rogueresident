// app/utils/mapGenerator.ts
import { GameMap, Node, NodePosition, mapUtils } from '../types/map';
import { 
  ChallengeNode, 
  ChallengeContent, 
  ChallengeFormat,
  CharacterId
} from '../types/challenge';
import {
  createSeededRandom,
  DEV_SEEDS,
  generateSeedName,
  getDailySeed,
  getRandomSeed,
  getSeedFromUrl
} from './seedUtils';

interface MapConfig {
  mapType: 'tutorial' | 'diagnostic' | 'treatment' | 'research';
  difficultyLevel?: number;
  includeStorage?: boolean;
  includeVendor?: boolean;
  seed?: number;
  useDailyChallenge?: boolean;
}

/**
 * Force-directed layout algorithm inspired by D3 for natural node spacing
 * Uses seeded RNG for deterministic but natural-feeling layouts
 */
const applyForceDirectedLayout = (nodes: ChallengeNode[], iterations = 50, rng = Math.random) => {
  // Constants for force simulation
  const REPULSION_STRENGTH = 500; // How strongly nodes repel each other
  const ATTRACTION_STRENGTH = 0.3; // How strongly connections pull nodes together
  const PROGRESSION_STRENGTH = 0.8; // How strongly nodes are pulled to their depth layer
  const DAMPING = 0.85; // Velocity reduction per iteration
  const MIN_DISTANCE = 20; // Minimum distance between nodes
  
  // Calculate depths for all nodes using breadth-first search - no recursion!
  const calculateAllNodeDepths = () => {
    // Map to store the depth of each node
    const depths = new Map<string, number>();
    
    // First, identify start nodes (those with no incoming connections)
    const startNodeIds = nodes
      .filter(node => nodes.every(n => !n.connections.includes(node.id)))
      .map(node => node.id);
    
    // Set all start nodes to depth 0
    startNodeIds.forEach(id => depths.set(id, 0));
    
    // If no start nodes found, use the first node as depth 0
    if (startNodeIds.length === 0 && nodes.length > 0) {
      depths.set(nodes[0].id, 0);
    }
    
    // Breadth-first search to calculate depths
    const queue: string[] = [...startNodeIds];
    if (queue.length === 0 && nodes.length > 0) {
      queue.push(nodes[0].id);
    }
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentDepth = depths.get(currentId) || 0;
      
      // Find the node
      const node = nodes.find(n => n.id === currentId);
      if (!node) continue;
      
      // Process all connections
      for (const targetId of node.connections) {
        // If target depth is undefined or greater than current + 1
        const existingDepth = depths.get(targetId);
        const newDepth = currentDepth + 1;
        
        if (existingDepth === undefined || existingDepth > newDepth) {
          depths.set(targetId, newDepth);
          queue.push(targetId);
        }
      }
    }
    
    return depths;
  };
  
  // Calculate depth for all nodes
  const nodeDepths = calculateAllNodeDepths();
  
  // Group nodes by depth
  const nodesByDepth = new Map<number, ChallengeNode[]>();
  nodeDepths.forEach((depth, nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      if (!nodesByDepth.has(depth)) {
        nodesByDepth.set(depth, []);
      }
      nodesByDepth.get(depth)?.push(node);
    }
  });
  
  // Initialize node velocities
  const velocities = new Map<string, {vx: number, vy: number}>();
  nodes.forEach(node => {
    velocities.set(node.id, {vx: 0, vy: 0});
  });
  
  // Define canvas bounds
  const bounds = {
    minX: 15, // Left margin
    maxX: 85, // Right margin
    minY: 15, // Top margin
    maxY: 85, // Bottom margin
  };
  
  // Balance canvas based on max depth
  const maxDepth = Math.max(...Array.from(nodeDepths.values(), d => d || 0), 0);
  const horizontalStep = (bounds.maxX - bounds.minX) / (maxDepth + 1);
  
  // Initial positioning - place nodes in depth layers with seeded randomness
  nodes.forEach(node => {
    const depth = nodeDepths.get(node.id) || 0;
    const nodesInLayer = nodesByDepth.get(depth)?.length || 1;
    const indexInLayer = nodesByDepth.get(depth)?.indexOf(node) || 0;
    
    // Position nodes in their depth layer with character-based offset
    const baseX = bounds.minX + (depth * horizontalStep);
    const totalHeight = bounds.maxY - bounds.minY;
    const verticalStep = totalHeight / (nodesInLayer + 1);
    let baseY = bounds.minY + ((indexInLayer + 1) * verticalStep);
    
    // Character-based adjustments within layer (subtle) with seeded randomness
    if (node.character === 'kapoor') baseY -= 3 + (rng() * 2);
    else if (node.character === 'quinn') baseY += 3 + (rng() * 2);
    else baseY += (rng() * 4) - 2; // Small random variation for others
    
    // Add seeded randomness to positions for natural-looking layout
    const xVariation = (rng() * 5) - 2.5;
    const yVariation = (rng() * 5) - 2.5;
    
    node.position = {
      x: baseX + xVariation,
      y: baseY + yVariation
    };
  });
  
  // Run force simulation iterations
  for (let i = 0; i < iterations; i++) {
    // Reset velocities for this iteration
    nodes.forEach(node => {
      velocities.set(node.id, {vx: 0, vy: 0});
    });
    
    // Calculate repulsive forces between all nodes
    for (let a = 0; a < nodes.length; a++) {
      for (let b = a + 1; b < nodes.length; b++) {
        const nodeA = nodes[a];
        const nodeB = nodes[b];
        
        // Calculate vector between nodes
        const dx = nodeB.position.x - nodeA.position.x;
        const dy = nodeB.position.y - nodeA.position.y;
        
        // Calculate distance
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance === 0) continue; // Avoid division by zero
        
        // Calculate repulsion force (inverse square law)
        const force = REPULSION_STRENGTH / (distance * distance);
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        
        // Apply force to velocities
        const vA = velocities.get(nodeA.id)!;
        const vB = velocities.get(nodeB.id)!;
        vA.vx -= fx;
        vA.vy -= fy;
        vB.vx += fx;
        vB.vy += fy;
      }
    }
    
    // Calculate attractive forces for connected nodes
    nodes.forEach(source => {
      source.connections.forEach(targetId => {
        const target = nodes.find(n => n.id === targetId);
        if (!target) return;
        
        // Calculate vector between nodes
        const dx = target.position.x - source.position.x;
        const dy = target.position.y - source.position.y;
        
        // Calculate distance
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance === 0) return; // Avoid division by zero
        
        // Attractive force increases with distance
        const force = ATTRACTION_STRENGTH * distance;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        
        // Apply force to velocities
        const vSource = velocities.get(source.id)!;
        const vTarget = velocities.get(targetId);
        
        if (vSource) {
          vSource.vx += fx;
          vSource.vy += fy;
        }
        
        if (vTarget) {
          vTarget.vx -= fx;
          vTarget.vy -= fy;
        }
      });
    });
    
    // Apply progression constraint - pull nodes toward their depth layer
    nodes.forEach(node => {
      const depth = nodeDepths.get(node.id) || 0;
      const idealX = bounds.minX + (depth * horizontalStep);
      const dx = idealX - node.position.x;
      
      // Apply force toward ideal x position
      const vNode = velocities.get(node.id);
      if (vNode) {
        vNode.vx += dx * PROGRESSION_STRENGTH;
      }
    });
    
    // Add slight jitter in early iterations for a more natural feel (using seeded RNG)
    if (i < iterations / 3) {
      nodes.forEach(node => {
        const vNode = velocities.get(node.id);
        if (vNode) {
          const jitterStrength = 0.3 * (1 - (i / (iterations / 3)));
          vNode.vx += (rng() * jitterStrength * 2) - jitterStrength;
          vNode.vy += (rng() * jitterStrength * 2) - jitterStrength;
        }
      });
    }
    
    // Apply velocities to positions with damping
    nodes.forEach(node => {
      const velocity = velocities.get(node.id);
      if (!velocity) return;
      
      // Apply damping
      velocity.vx *= DAMPING;
      velocity.vy *= DAMPING;
      
      // Update position
      node.position.x += velocity.vx;
      node.position.y += velocity.vy;
      
      // Constrain to bounds
      node.position.x = Math.max(bounds.minX, Math.min(bounds.maxX, node.position.x));
      node.position.y = Math.max(bounds.minY, Math.min(bounds.maxY, node.position.y));
    });
  }
  
  // Final adjustments for special node types
  nodes.forEach(node => {
    // Boss nodes positioned more dramatically
    if (node.id === 'boss_node') {
      // Pull boss slightly out of normal grid for emphasis
      const depth = nodeDepths.get(node.id) || 0;
      node.position.y = Math.min(75, node.position.y + 5);
    }
    
    // Make sure calibration/entry nodes are in a clear position
    if (node.content === 'calibration' && node.character === 'kapoor') {
      node.position.x = bounds.minX + 5;
    }
  });
  
  // Avoid nodes being too close together (minimum distance)
  let adjustmentNeeded = true;
  const maxAdjustments = 5;
  let adjustmentCount = 0;
  
  while (adjustmentNeeded && adjustmentCount < maxAdjustments) {
    adjustmentNeeded = false;
    adjustmentCount++;
    
    for (let a = 0; a < nodes.length; a++) {
      for (let b = a + 1; b < nodes.length; b++) {
        const nodeA = nodes[a];
        const nodeB = nodes[b];
        
        const dx = nodeB.position.x - nodeA.position.x;
        const dy = nodeB.position.y - nodeA.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < MIN_DISTANCE) {
          // Push nodes apart slightly
          const pushFactor = (MIN_DISTANCE - distance) / 2;
          const pushX = (dx / distance) * pushFactor;
          const pushY = (dy / distance) * pushFactor;
          
          nodeA.position.x -= pushX;
          nodeA.position.y -= pushY;
          nodeB.position.x += pushX;
          nodeB.position.y += pushY;
          
          // Constrain to bounds
          nodeA.position.x = Math.max(bounds.minX, Math.min(bounds.maxX, nodeA.position.x));
          nodeA.position.y = Math.max(bounds.minY, Math.min(bounds.maxY, nodeA.position.y));
          nodeB.position.x = Math.max(bounds.minX, Math.min(bounds.maxX, nodeB.position.x));
          nodeB.position.y = Math.max(bounds.minY, Math.min(bounds.maxY, nodeB.position.y));
          
          adjustmentNeeded = true;
        }
      }
    }
  }
  
  // Return nodes with new positions
  return nodes;
};

/**
 * Generates a game map based on the provided configuration
 * This implementation uses seeded RNG for deterministic generation
 */
export function generateMap(config: MapConfig = { mapType: 'tutorial' }): GameMap {
  console.log("Generating map with config:", config);
  
  // Determine the seed to use
  let seed: number;
  
  // Check for specific seed in URL during development
  const urlSeed = getSeedFromUrl();
  
  if (config.seed) {
    // Use explicitly provided seed
    seed = config.seed;
  } else if (urlSeed && process.env.NODE_ENV !== 'production') {
    // Use URL seed in development
    seed = urlSeed;
  } else if (config.useDailyChallenge) {
    // Use daily challenge seed
    seed = getDailySeed();
  } else if (process.env.NODE_ENV !== 'production') {
    // In development, use a standard dev seed for consistency
    seed = DEV_SEEDS.STANDARD;
  } else {
    // In production with no other seed specified, use random
    seed = getRandomSeed();
  }
  
  // Create seeded RNG function
  const rng = createSeededRandom(seed);
  
  // Log seed for debugging
  console.log(`🎲 Generating map with seed: ${seed} (${generateSeedName(seed)})`);
  
  // For prototype - just create our tutorial experience with calibration node
  let tutorialNodes: ChallengeNode[] = [
    {
      id: 'calibration_node',
      title: 'LINAC Output Calibration',
      description: 'Learn the critical process of linear accelerator calibration.',
      content: 'calibration',
      format: 'conversation', 
      character: 'kapoor',
      position: { x: 40, y: 40 },
      connections: ['reference_node'],
      insightReward: 50,
      taughtConcepts: ['electronic_equilibrium', 'ptp_correction', 'output_calibration_tolerance']
    },
    {
      id: 'reference_node',
      title: 'Calibration References',
      description: 'Review annotated protocol documents.',
      content: 'lecture',
      format: 'conversation',
      character: 'kapoor',
      position: { x: 60, y: 60 },
      connections: ['patient_case_node'],
      insightReward: 30,
      requiredConcepts: ['electronic_equilibrium'],
      taughtConcepts: ['protocol_documentation', 'measurement_uncertainty']
    },
    {
      id: 'patient_case_node',
      title: 'Patient Treatment Review',
      description: 'Evaluate a treatment plan for a clinical case.',
      content: 'patient_case',
      format: 'conversation',
      character: 'kapoor',
      position: { x: 75, y: 40 },
      connections: ['qa_node'],
      insightReward: 50,
      caseId: 'breast-cancer-plan'
    },
    {
      id: 'qa_node',
      title: 'LINAC Quality Assurance',
      description: 'Perform daily QA checks on the linear accelerator.',
      content: 'equipment_qa',
      format: 'procedural',
      character: 'jesse',
      equipmentType: 'linac',
      procedureType: 'daily',
      position: { x: 50, y: 75 },
      connections: ['boss_node'],
      insightReward: 60
    },
    {
      id: 'boss_node',
      title: 'Ionix Anomaly',
      description: 'An experimental ion chamber is exhibiting unexpected behavior.',
      content: 'storage', // Special case for boss in prototype
      format: 'conversation',
      character: 'quinn',
      position: { x: 25, y: 65 },
      connections: [],
      insightReward: 100
    }
  ];
  
  // Add optional storage node if configured
  if (config.includeStorage) {
    tutorialNodes.push({
      id: 'storage_node',
      title: 'Equipment Storage',
      description: 'Find useful equipment for your challenges.',
      content: 'storage',
      format: 'interactive',
      character: 'jesse',
      position: { x: 30, y: 30 },
      connections: ['calibration_node'],
      insightReward: 20
    });
    
    // Connect calibration node to storage
    const calibrationNode = tutorialNodes.find(node => node.id === 'calibration_node');
    if (calibrationNode) {
      calibrationNode.connections.push('storage_node');
    }
  }
  
  // Apply our force-directed layout algorithm with seeded RNG
  tutorialNodes = applyForceDirectedLayout(tutorialNodes, 50, rng);
  
  // Clear and definitive start node selection
  // Choose first calibration node with Kapoor
  const entryNode = tutorialNodes.find(n => 
    n.content === 'calibration' && n.character === 'kapoor'
  );
  
  if (entryNode) {
    // Ensure other nodes don't have this as a connection - it's the beginning
    tutorialNodes.forEach(n => {
      if (n.id !== entryNode.id) {
        n.connections = n.connections.filter(id => id !== entryNode.id);
      }
    });
  }
  
  // Validate and potentially fix node connections (ensure no connections to non-existent nodes)
  tutorialNodes.forEach(node => {
    node.connections = node.connections.filter(targetId => 
      tutorialNodes.some(n => n.id === targetId)
    );
  });
  
  // Convert challenge nodes to map nodes
  const mapNodes: Node[] = tutorialNodes.map(node => mapUtils.convertChallengeNode(node));
  
  // Ensure each node has proper position if missing
  mapNodes.forEach((node, index) => {
    if (!node.position || (node.position.x === 0 && node.position.y === 0)) {
      // Generate a position if missing
      node.position = {
        x: 25 + (index * 15) % 50, 
        y: 30 + (index * 20) % 40
      };
      console.warn(`Generated missing position for node ${node.id}`);
    }
  });
  
  // Ensure map has valid startNodeId and bossNodeId
  const startNodeId = entryNode?.id || (tutorialNodes.length > 0 ? tutorialNodes[0].id : 'calibration_node');
  const bossNodeId = tutorialNodes.find(n => n.id === 'boss_node')?.id || startNodeId;
  
  // Debug output for the force-directed layout results
  console.log("Force-directed layout applied. Final positions:", 
    mapNodes.map(n => ({ id: n.id, x: n.position.x.toFixed(1), y: n.position.y.toFixed(1) }))
  );
  
  // Create and return the validated game map
  return {
    nodes: mapNodes,
    startNodeId,
    bossNodeId,
    seed,
    seedName: generateSeedName(seed),
    dimensions: { width: 100, height: 100 }
  };
}

/**
 * Generates a more complex map for the full game experience
 */
export function generateFullMap(config: MapConfig): GameMap {
  console.log("Generating full map with config:", config);
  
  // This would implement the full procedural generation algorithm
  // with proper node distribution, connection patterns, and progression gates
  
  // For now, just return the tutorial map
  return generateMap(config);
}