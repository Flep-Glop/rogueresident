// app/components/challenges/ChallengeRouter.tsx
'use client';
import { useGameStore } from '../../store/gameStore';
import { CharacterId, ChallengeContent } from '../../types/challenge';
import CalibrationChallenge from './CalibrationChallenge';
import StorageCloset from './StorageCloset';
import BossNode from './BossNode';

export default function ChallengeRouter() {
  const { map, currentNodeId } = useGameStore();
  
  if (!map || !currentNodeId) return null;
  
  // Find the current node
  const node = map.nodes.find(n => n.id === currentNodeId);
  if (!node) return null;
  
  // Extract content and character properties
  const content = node.content as ChallengeContent;
  const character = node.character as CharacterId;
  
  // Route to the appropriate challenge component
  switch (content) {
    case 'calibration':
      return <CalibrationChallenge character={character} />;
      
    // Legacy support for old node types during transition
    case 'storage':
      return <StorageCloset />;
      
    case 'boss':
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
}