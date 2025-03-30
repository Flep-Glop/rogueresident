// app/components/StartScreen.tsx
import { useGameStore } from '../store/gameStore';

export default function StartScreen() {
  const { resetGame, startGame } = useGameStore();
  
  const handleStartNewGame = () => {
    resetGame(); // Reset to initial state
    startGame(); // Update gameState to 'in_progress'
  };
  
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-900 text-white p-4">
      <h1 className="text-5xl font-bold mb-4 text-blue-400">Rogue Resident</h1>
      <h2 className="text-2xl mb-8 text-blue-300">Medical Physics Residency</h2>
      
      <div className="max-w-2xl bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
        <p className="mb-4">
          You are a new medical physics resident navigating through the challenges of your training.
          Explore different areas of the department, face clinical situations, discover useful equipment,
          and confront the mysterious Ionix anomaly.
        </p>
        
        <h3 className="text-xl font-bold mb-2 text-blue-300">How to Play:</h3>
        <ul className="list-disc pl-6 mb-4 space-y-1">
          <li>Navigate through the map by selecting connected nodes</li>
          <li>Complete challenges to earn insight and unlock new paths</li>
          <li>Find useful items in storage closets to help with your challenges</li>
          <li>Keep an eye on your health - if it reaches zero, your run ends</li>
          <li>Reach and defeat the boss to complete your run</li>
        </ul>
        
        <p className="italic text-gray-400 text-sm">
          This prototype demonstrates the core gameplay loop with basic features.
          The full game would include more diverse challenges, items, and progression.
        </p>
      </div>
      
      <button
        className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xl"
        onClick={handleStartNewGame}
      >
        Start New Run
      </button>
    </div>
  );
}