// app/components/challenges/ChallengeRouter.tsx
'use client';
import { useGameStore } from '../../store/gameStore';
import { 
  CharacterId, 
  ChallengeContent, 
  ChallengeFormat, 
  EquipmentType,
  isBaseEquipment,
  isInteractiveEquipment
} from '../../types/challenge';
import CalibrationChallenge from './CalibrationChallenge';
import PatientCaseChallenge from './PatientCaseChallenge';
import EquipmentQAChallenge from './EquipmentQAChallenge';
import QAProcedureChallenge from './QAProcedureChallenge';
import EquipmentInteractiveChallenge from './EquipmentInteractiveChallenge';
import StorageCloset from './StorageCloset';
import BossNode from './BossNode';

/**
 * ChallengeRouter dynamically renders the appropriate challenge component
 * based on the current node's content type, format, and other properties.
 * 
 * This approach follows a lightweight Factory pattern allowing for flexible
 * expansion of challenge types while maintaining type safety.
 */
export default function ChallengeRouter() {
  const { map, currentNodeId } = useGameStore();
  
  if (!map || !currentNodeId) return null;
  
  // Find the current node
  const node = map.nodes.find(n => n.id === currentNodeId);
  if (!node) return null;
  
  // Extract content, format, and character properties, handle legacy node types
  const content = node.challengeContent as ChallengeContent;
  const format = node.format as ChallengeFormat;
  const character = node.character as CharacterId;
  const equipmentType = node.equipmentType as EquipmentType;
  
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
      return <PatientCaseChallenge 
        character={character}
        caseId={node.caseId}
      />;
    
    // Equipment QA challenges - can be conversation or procedural
    case 'equipment_qa':
      // Format-based sub-routing
      if (format === 'procedural') {
        // Type guard to ensure equipment type is compatible
        if (isBaseEquipment(equipmentType)) {
          return <QAProcedureChallenge 
            character={character} 
            procedureType={node.procedureType || 'daily'}
            equipmentType={equipmentType}
          />;
        }
        
        // Fallback for invalid equipment type
        return <QAProcedureChallenge 
          character={character} 
          procedureType={node.procedureType || 'daily'}
          equipmentType="linac" // Default to linac
        />;
      } else if (format === 'interactive') {
        // Type guard to ensure equipment type is compatible
        if (isInteractiveEquipment(equipmentType)) {
          return <EquipmentInteractiveChallenge 
            character={character}
            equipmentType={equipmentType}
          />;
        }
        
        // Fallback for invalid equipment type
        return <EquipmentInteractiveChallenge 
          character={character}
          equipmentType="ionization_chamber" // Default type
        />;
      } else {
        // Default to conversation format for QA
        if (isBaseEquipment(equipmentType)) {
          return <EquipmentQAChallenge 
            character={character}
            equipmentType={equipmentType}
          />;
        }
        
        // Fallback for invalid equipment type
        return <EquipmentQAChallenge 
          character={character}
          equipmentType="linac" // Default to linac
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