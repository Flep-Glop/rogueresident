// app/utils/improvedMapGenerator.ts
import { GameMap, Node, NodePosition, mapUtils } from '../types/map';
import { 
  ChallengeContent, 
  ChallengeFormat,
  CharacterId
} from '../types/challenge';
import {
  createSeededRandom,
  generateSeedName,
  getRandomSeed
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
 * Enhanced force-directed layout algorithm with structural constraints
 * This version maintains a more predictable and legible progression path
 */
const applyStructuredLayout = (nodes: any[], iterations = 50, rng = Math.random) => {
  // Constants for better organized layouts
  const REPULSION_STRENGTH = 500;
  const ATTRACTION_STRENGTH = 0.3;
  const PROGRESSION_STRENGTH = 1.5; // Increased to create clearer progression
  const HORIZONTAL_BIAS = 1.8; // Bias towards horizontal progression
  const DAMPING = 0.85;
  const MIN_DISTANCE = 15;
  
  // Calculate node depths - this defines progression tiers
  const calculateNodeDepths = () => {
    const depths = new Map<string, number>();
    
    // Find start nodes (those with no incoming connections)
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
  const nodeDepths = calculateNodeDepths();
  
  // Group nodes by depth
  const nodesByDepth = new Map<number, any[]>();
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
  
  // Define canvas bounds - adjusted for better horizontal flow
  const bounds = {
    minX: 15,
    maxX: 85,
    minY: 15,
    maxY: 85,
  };
  
  // Find maximum depth for layout calculation
  const maxDepth = Math.max(...Array.from(nodeDepths.values(), d => d || 0), 0);
  
  // Enhanced initial positioning - with structured tiers
  nodes.forEach(node => {
    const depth = nodeDepths.get(node.id) || 0;
    const nodesInLayer = nodesByDepth.get(depth)?.length || 1;
    const indexInLayer = nodesByDepth.get(depth)?.indexOf(node) || 0;
    
    // Initial structured positioning
    // - Horizontal progression based on depth
    // - Vertical positioning using golden ratio distribution
    
    // Calculate horizontal position - weighted toward progression
    const horizontalStep = (bounds.maxX - bounds.minX) / (maxDepth + 1);
    const baseX = bounds.minX + (depth * horizontalStep * HORIZONTAL_BIAS);
    
    // Calculate vertical position - distribute evenly within depth
    const verticalStep = (bounds.maxY - bounds.minY) / (nodesInLayer + 1);
    let baseY = bounds.minY + ((indexInLayer + 1) * verticalStep);
    
    // Add weighted randomness based on node type for character
    if (node.character === 'kapoor') baseY -= 5 + (rng() * 3);
    else if (node.character === 'quinn') baseY += 5 + (rng() * 3);
    else baseY += (rng() * 6) - 3;
    
    // Add seeded randomness to positions for natural-looking layout
    // - Less randomness on X to preserve progression clarity
    // - More randomness on Y for visual interest
    const xVariation = (rng() * 3) - 1.5; // Reduced X variation
    const yVariation = (rng() * 6) - 3; // Increased Y variation
    
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
    
    // Apply progression constraint - stronger X-axis pull for progression clarity
    nodes.forEach(node => {
      const depth = nodeDepths.get(node.id) || 0;
      const horizontalStep = (bounds.maxX - bounds.minX) / (maxDepth + 1);
      const idealX = bounds.minX + (depth * horizontalStep * HORIZONTAL_BIAS);
      const dx = idealX - node.position.x;
      
      // Apply force toward ideal x position - stronger for progression clarity
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
  
  // Enhanced special node positioning
  nodes.forEach(node => {
    // Boss nodes positioned for final confrontation emphasis
    if (node.id === 'boss_node' || node.type === 'boss' || node.type === 'boss-ionix') {
      // Place boss at a dramatic position
      const depth = nodeDepths.get(node.id) || 0;
      node.position.x = bounds.maxX - 15; // Consistent X position near right edge
      node.position.y = Math.min(75, Math.max(25, node.position.y)); // Centered vertically
    }
    
    // Entrance/calibration nodes positioned for clear starting point
    if (node.content === 'calibration' && node.character === 'kapoor') {
      node.position.x = bounds.minX + 10; // Clear starting point
      // Keep Y position for variation
    }
  });
  
  // Additional adjustment to avoid overlapping nodes
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
  
  return nodes;
};

/**
 * Creates structured progression paths rather than random connections
 * This creates more meaningful progression choices and sidepaths
 */
const buildStructuredConnections = (nodes: any[], rng: () => number) => {
  // Clear existing connections
  nodes.forEach(node => {
    node.connections = [];
  });
  
  // Group nodes by type for smarter connections
  const nodesByType: Record<string, any[]> = {};
  nodes.forEach(node => {
    if (!nodesByType[node.type]) {
      nodesByType[node.type] = [];
    }
    nodesByType[node.type].push(node);
  });
  
  // Sort nodes by X position (rough progression order)
  const sortedNodes = [...nodes].sort((a, b) => a.position.x - b.position.x);
  
  // Find entrance/start node
  const entranceNode = nodes.find(n => n.type === 'entrance');
  const startNode = entranceNode || sortedNodes[0];
  
  // Find boss node
  const bossNode = nodes.find(n => n.type === 'boss' || n.type === 'boss-ionix');
  
  // Calculate progression tiers based on X position
  const xPositions = sortedNodes.map(n => n.position.x);
  const minX = Math.min(...xPositions);
  const maxX = Math.max(...xPositions);
  const range = maxX - minX;
  
  // Assign tier based on X position
  const tiers: Record<string, number> = {};
  nodes.forEach(node => {
    // Normalize position to 0-1 range
    const normalizedPos = (node.position.x - minX) / range;
    // Map to tiers 0-3
    const tier = Math.min(3, Math.floor(normalizedPos * 4));
    tiers[node.id] = tier;
  });
  
  // Special handling for boss node
  if (bossNode) {
    tiers[bossNode.id] = 3; // Boss is always final tier
  }
  
  // Build main progression path
  // Create 2-3 parallel progression paths
  const buildMainPath = () => {
    // Group nodes by tier for path creation
    const nodesByTier: any[][] = [[], [], [], []];
    sortedNodes.forEach(node => {
      const tier = tiers[node.id];
      nodesByTier[tier].push(node);
    });
    
    // Create 2-3 parallel paths from tier 0 to tier 3
    const pathCount = 2 + Math.floor(rng() * 2); // 2-3 paths
    const paths: any[][] = [];
    
    // Create starting point nodes for each path
    const startingNodes = [startNode];
    
    // Add additional starting nodes for multiple paths
    if (pathCount > 1 && nodesByTier[0].length > 1) {
      const availableStarters = nodesByTier[0].filter(n => n !== startNode);
      const additionalStarters = availableStarters.slice(0, pathCount - 1);
      startingNodes.push(...additionalStarters);
    }
    
    // Initialize paths with starting nodes
    startingNodes.forEach(startNode => {
      paths.push([startNode]);
    });
    
    // Build each path through the tiers
    paths.forEach(path => {
      let currentNode = path[0];
      
      // For each tier (except starting tier)
      for (let tier = 1; tier <= 3; tier++) {
        // Available nodes in this tier that aren't already in a path
        const availableNodes = nodesByTier[tier].filter(node => 
          !paths.some(p => p.includes(node)) && 
          node !== bossNode // Exclude boss from regular paths
        );
        
        // If no nodes available, stop this path
        if (availableNodes.length === 0) break;
        
        // Select node based on spatial proximity
        availableNodes.sort((a, b) => {
          const distanceA = distanceBetween(currentNode.position, a.position);
          const distanceB = distanceBetween(currentNode.position, b.position);
          return distanceA - distanceB;
        });
        
        // Select from closest nodes with some randomness
        const selectionPool = availableNodes.slice(0, Math.min(3, availableNodes.length));
        const nextNode = selectionPool[Math.floor(rng() * selectionPool.length)];
        
        // Add connection
        currentNode.connections.push(nextNode.id);
        path.push(nextNode);
        currentNode = nextNode;
      }
      
      // Connect final node to boss if it exists and this path reaches tier 3
      if (bossNode && path.length > 0 && tiers[path[path.length - 1].id] === 3) {
        path[path.length - 1].connections.push(bossNode.id);
      }
    });
    
    return paths;
  };
  
  // Build side paths that branch off main paths
  const buildSidePaths = (mainPaths: any[][]) => {
    // Collect all nodes that are part of main paths
    const mainPathNodes = new Set(mainPaths.flat().map(n => n.id));
    
    // Find nodes not in main paths
    const sideNodes = nodes.filter(n => !mainPathNodes.has(n.id) && n !== bossNode);
    
    // Exit if no side nodes
    if (sideNodes.length === 0) return;
    
    // For each side node, find a suitable connection point on main path
    sideNodes.forEach(sideNode => {
      // Find all main path nodes in same or lower tier
      const sideTier = tiers[sideNode.id];
      const eligibleConnectors = nodes.filter(n => 
        mainPathNodes.has(n.id) && tiers[n.id] <= sideTier
      );
      
      if (eligibleConnectors.length === 0) return;
      
      // Sort by distance to find closest main path node
      eligibleConnectors.sort((a, b) => {
        const distanceA = distanceBetween(sideNode.position, a.position);
        const distanceB = distanceBetween(sideNode.position, b.position);
        return distanceA - distanceB;
      });
      
      // Connect from main path to side node
      const connectorNode = eligibleConnectors[0];
      connectorNode.connections.push(sideNode.id);
      
      // Some side nodes might connect onward to the boss
      if (bossNode && sideTier === 3 && rng() < 0.3) {
        sideNode.connections.push(bossNode.id);
      }
    });
  };
  
  // Helper function to calculate distance between nodes
  const distanceBetween = (pos1: NodePosition, pos2: NodePosition) => {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  };
  
  // Execute the connection building
  const mainPaths = buildMainPath();
  buildSidePaths(mainPaths);
  
  // Ensure all nodes have valid connections only
  nodes.forEach(node => {
    node.connections = node.connections.filter((targetId: string) => 
      nodes.some(n => n.id === targetId)
    );
  });
  
  return nodes;
};

/**
 * Generates a game map with improved structural organization
 * Creates more predictable and logical progression paths
 */
export function generateImprovedMap(config: MapConfig = { mapType: 'tutorial' }): GameMap {
  console.log("Generating improved map with config:", config);
  
  // Determine seed for consistent generation
  const seed = config.seed || getRandomSeed();
  const rng = createSeededRandom(seed);
  
  // For prototype - create tutorial experience with better organized nodes
  let tutorialNodes = [
    {
      id: 'calibration_node',
      title: 'LINAC Output Calibration',
      description: 'Learn the critical process of linear accelerator calibration.',
      content: 'calibration',
      format: 'conversation', 
      character: 'kapoor',
      position: { x: 40, y: 40 },
      connections: [],
      insightReward: 50,
      type: 'entrance'
    },
    {
      id: 'reference_node',
      title: 'Calibration References',
      description: 'Review annotated protocol documents.',
      content: 'lecture',
      format: 'conversation',
      character: 'kapoor',
      position: { x: 60, y: 60 },
      connections: [],
      insightReward: 30,
      type: 'educational'
    },
    {
      id: 'patient_case_node',
      title: 'Patient Treatment Review',
      description: 'Evaluate a treatment plan for a clinical case.',
      content: 'patient_case',
      format: 'conversation',
      character: 'kapoor',
      position: { x: 75, y: 40 },
      connections: [],
      insightReward: 50,
      type: 'clinical'
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
      connections: [],
      insightReward: 60,
      type: 'qa'
    },
    {
      id: 'boss_node',
      title: 'Ionix Anomaly',
      description: 'An experimental ion chamber is exhibiting unexpected behavior.',
      content: 'storage',
      format: 'conversation',
      character: 'quinn',
      position: { x: 25, y: 65 },
      connections: [],
      insightReward: 100,
      type: 'boss-ionix'
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
      connections: [],
      insightReward: 20,
      type: 'storage'
    });
  }
  
  // Apply enhanced layout algorithm with structural constraints
  tutorialNodes = applyStructuredLayout(tutorialNodes, 50, rng);
  
  // Build meaningful connections rather than random ones
  tutorialNodes = buildStructuredConnections(tutorialNodes, rng);
  
  // Convert challenge nodes to map nodes
  const mapNodes: Node[] = tutorialNodes.map(node => mapUtils.convertChallengeNode(node));
  
  // Determine start node
  const entranceNode = tutorialNodes.find(n => 
    n.type === 'entrance' || (n.content === 'calibration' && n.character === 'kapoor')
  );
  
  const startNodeId = entranceNode?.id || (tutorialNodes.length > 0 ? tutorialNodes[0].id : 'calibration_node');
  
  // Determine boss node
  const bossNode = tutorialNodes.find(n => n.type === 'boss-ionix' || n.type === 'boss');
  const bossNodeId = bossNode?.id || startNodeId;
  
  // Create and return the improved game map
  return {
    nodes: mapNodes,
    startNodeId,
    bossNodeId,
    seed,
    seedName: generateSeedName(seed),
    dimensions: { width: 100, height: 100 }
  };
}