// app/components/challenges/ChallengeRouter.tsx
'use client';
import { useGameStore } from '../../store/gameStore';
import { CharacterId, ChallengeContent, ChallengeFormat } from '../../types/challenge';
import CalibrationChallenge from './CalibrationChallenge';
import PatientCaseChallenge from './PatientCaseChallenge';
import EquipmentQAChallenge from './EquipmentQAChallenge';
import QAProcedureChallenge from './QAProcedureChallenge';
import EquipmentInteractiveChallenge from './EquipmentInteractiveChallenge';
import StorageCloset from './StorageCloset';
import BossNode from './BossNode';

export default function ChallengeRouter() {
  const { map, currentNodeId } = useGameStore();
  
  if (!map || !currentNodeId) return null;
  
  // Find the current node
  const node = map.nodes.find(n => n.id === currentNodeId);
  if (!node) return null;
  
  // Extract content, format, and character properties
  const content = node.content as ChallengeContent;
  const format = node.format as ChallengeFormat;
  const character = node.character as CharacterId;
  
  console.log(`Routing challenge: ${content} with format ${format} for character ${character}`);
  
  // Route based on content type and format
  // This creates a decision tree that handles all combinations
  
  // Content-based routing (primary dimension)
  switch (content) {
    // Calibration challenges - typically conversation-based
    case 'calibration':
      return <CalibrationChallenge character={character} />;
    
    // Patient case challenges - typically conversation-based  
    case 'patient_case':
      return <PatientCaseChallenge character={character} />;
    
    // Equipment QA challenges - can be conversation or procedural
    case 'equipment_qa':
      // Format-based sub-routing
      if (format === 'procedural') {
        return <QAProcedureChallenge 
          character={character} 
          procedureType={node.procedureType || 'daily'}
          equipmentType={node.equipmentType || 'linac'}
        />;
      } else if (format === 'interactive') {
        return <EquipmentInteractiveChallenge 
          character={character}
          equipmentType={node.equipmentType || 'ionization_chamber'} 
        />;
      } else {
        // Default to conversation format
        return <EquipmentQAChallenge 
          character={character}
          equipmentType={node.equipmentType || 'linac'} 
        />;
      }
    
    // Educational lecture challenges - typically conversation-based
    case 'lecture':
      // For future implementation
      return (
        <div className="p-6 max-w-4xl mx-auto bg-surface pixel-borders">
          <h2 className="text-2xl mb-4">Educational Lecture</h2>
          <p>This lecture-based challenge type is under development.</p>
        </div>
      );
  
    // Legacy support for node type-based routing during transition
    case 'storage':
    case undefined:
      // Route based on node.type as fallback
      switch (node.type) {
        case 'storage':
          return <StorageCloset />;
          
        case 'boss':
        case 'boss-ionix':
          return <BossNode />;
          
        default:
          // Fallback message
          return (
            <div className="p-6 max-w-4xl mx-auto bg-surface pixel-borders">
              <h2 className="text-2xl mb-4">Challenge Under Development</h2>
              <p>This challenge type ({content || node.type}) hasn't been implemented yet.</p>
            </div>
          );
      }
      
    // Default fallback  
    default:
      return (
        <div className="p-6 max-w-4xl mx-auto bg-surface pixel-borders">
          <h2 className="text-2xl mb-4">Challenge Under Development</h2>
          <p>This challenge type ({content || node.type}) hasn't been implemented yet.</p>
        </div>
      );
  }
}