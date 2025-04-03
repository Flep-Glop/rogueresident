// app/utils/mapGenerator.ts - Streamlined version
import { GameMap } from '../types/map';
import { ChallengeNode } from '../types/challenge';

export function generateMap(config = { mapType: 'tutorial' }): GameMap {
  // For now, just create our tutorial experience
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
      connections: [],
      insightReward: 30,
      requiredConcepts: ['electronic_equilibrium'],
      taughtConcepts: ['protocol_documentation', 'measurement_uncertainty']
    }
  ];
  
  return {
    nodes: tutorialNodes,
    startNodeId: 'calibration_node',
    bossNodeId: 'future_boss_node',
    dimensions: { width: 100, height: 100 }
  };
}