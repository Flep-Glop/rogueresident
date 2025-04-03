// app/components/challenges/ChallengeRouter.tsx
export default function ChallengeRouter() {
    const { map, currentNodeId } = useGameStore();
    
    if (!map || !currentNodeId) return null;
    
    const node = map.nodes.find(n => n.id === currentNodeId);
    if (!node) return null;
    
    // Clean content/format based routing
    const { content, format, character } = node as ChallengeNode;
    
    // Match our one implemented challenge for now
    if (content === 'calibration' && character === 'kapoor') {
      return <CalibrationChallenge character={character} />;
    }
    
    // For the reference node
    if (content === 'lecture' && character === 'kapoor') {
      return <LectureChallenge character={character} />;
    }
    
    // Fallback
    return <div>Challenge not implemented yet</div>;
  }