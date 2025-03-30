import { useGameStore } from '../store/gameStore';

export default function PlayerStats() {
  const { health, insight } = useGameStore((state) => state.player);
  
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Player Stats</h2>
      <div className="flex items-center">
        <span className="font-medium mr-2">Health:</span>
        <div className="flex space-x-1">
          {[...Array(4)].map((_, i) => (
            <div 
              key={i}
              className={`w-6 h-6 rounded-full ${i < health ? 'bg-red-500' : 'bg-gray-300'}`}
            />
          ))}
        </div>
      </div>
      <div>
        <span className="font-medium mr-2">Insight:</span>
        <span>{insight}</span>
      </div>
    </div>
  );
}