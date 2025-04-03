// app/utils/mapGenerator.ts
import { GameMap, Node, mapUtils } from '../types/map';
import { 
  ChallengeNode, 
  ChallengeContent, 
  ChallengeFormat,
  CharacterId
} from '../types/challenge';

interface MapConfig {
  mapType: 'tutorial' | 'diagnostic' | 'treatment' | 'research';
  difficultyLevel?: number;
  includeStorage?: boolean;
  includeVendor?: boolean;
}

/**
 * Generates a game map based on the provided configuration
 * This is a streamlined implementation for the prototype phase
 */
export function generateMap(config: MapConfig = { mapType: 'tutorial' }): GameMap {
  console.log("Generating map with config:", config);
  
  // For prototype - just create our tutorial experience with calibration node
  const tutorialNodes: ChallengeNode[] = [
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
  
  // Convert challenge nodes to map nodes
  const mapNodes: Node[] = tutorialNodes.map(node => mapUtils.convertChallengeNode(node));
  
  // Create and return the game map
  return {
    nodes: mapNodes,
    startNodeId: 'calibration_node',
    bossNodeId: 'boss_node',
    dimensions: { width: 100, height: 100 }
  };
}

/**
 * Generates a more complex map for the full game experience
 * This is a placeholder for future development
 */
export function generateFullMap(config: MapConfig): GameMap {
  console.log("Generating full map with config:", config);
  
  // This would implement the full procedural generation algorithm
  // with proper node distribution, connection patterns, and progression gates
  
  // For now, just return the tutorial map
  return generateMap(config);
}