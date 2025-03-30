// app/components/GameOver.tsx
import { useGameStore } from '../store/gameStore';
import { Item } from '../data/items';

export default function GameOver() {
  const { resetGame, startGame, inventory, completedNodeIds } = useGameStore();
  
  const startNewGame = () => {
    resetGame();
    startGame();
  };
  
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-900 text-white p-4">
      <h1 className="text-5xl font-bold mb-2 text-red-500">Game Over</h1>
      <p className="text-xl mb-8">You've depleted your health reserves</p>
      
      <div className="max-w-xl bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
        <h2 className="text-xl font-bold mb-4 text-blue-300">Run Summary:</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-700 p-3 rounded">
            <p className="text-sm text-gray-400">Challenges Completed</p>
            <p className="text-2xl font-bold">{completedNodeIds.length}</p>
          </div>
          
          <div className="bg-gray-700 p-3 rounded">
            <p className="text-sm text-gray-400">Items Collected</p>
            <p className="text-2xl font-bold">{inventory.length}</p>
          </div>
        </div>
        
        {inventory.length > 0 && (
          <div className="mb-4">
            <h3 className="font-medium mb-2 text-blue-300">Items Collected:</h3>
            <ul className="text-sm text-gray-300">
              {inventory.map((item: Item) => (
                <li key={item.id} className="mb-1">• {item.name}</li>
              ))}
            </ul>
          </div>
        )}
        
        <p className="italic text-gray-400 text-sm mt-4">
          In the full game, your run would contribute to permanent progression,
          unlocking new content and abilities for future runs.
        </p>
      </div>
      
      <div className="space-x-4">
        <button
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          onClick={startNewGame}
        >
          Start New Run
        </button>
      </div>
    </div>
  );
}