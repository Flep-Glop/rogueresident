// app/components/GameOver.tsx
'use client';
import { useGameStore } from '../store/gameStore';
import { Item } from '../data/items';
import { PixelText, PixelButton } from './PixelThemeProvider';

export default function GameOver() {
  const { resetGame, startGame, inventory, completedNodeIds, currentDay } = useGameStore();
  
  const startNewGame = () => {
    resetGame();
    startGame();
  };
  
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-background p-4 starfield-bg">
      <div className="max-w-xl w-full bg-surface pixel-borders p-6">
        <h1 className="text-4xl font-pixel-heading text-danger mb-2 text-center">Game Over</h1>
        <p className="text-xl font-pixel text-center mb-8">Your residency has been terminated due to health concerns</p>
        
        <div className="bg-surface-dark p-6 pixel-borders-thin mb-8">
          <h2 className="text-xl font-pixel-heading mb-4 text-blue-300">Residency Summary:</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-surface-dark p-3 rounded pixel-borders-thin">
              <p className="text-sm text-text-secondary">Days Completed</p>
              <p className="text-2xl font-bold font-pixel">{currentDay - 1}</p>
            </div>
            
            <div className="bg-surface-dark p-3 rounded pixel-borders-thin">
              <p className="text-sm text-text-secondary">Challenges Completed</p>
              <p className="text-2xl font-bold font-pixel">{completedNodeIds.length}</p>
            </div>
            
            <div className="bg-surface-dark p-3 rounded pixel-borders-thin">
              <p className="text-sm text-text-secondary">Items Collected</p>
              <p className="text-2xl font-bold font-pixel">{inventory.length}</p>
            </div>
            
            <div className="bg-surface-dark p-3 rounded pixel-borders-thin">
              <p className="text-sm text-text-secondary">Boss Encounters</p>
              <p className="text-2xl font-bold font-pixel">
                {completedNodeIds.filter(id => {
                  const map = useGameStore.getState().map;
                  return map && map.bossNodeId === id;
                }).length}
              </p>
            </div>
          </div>
          
          {inventory.length > 0 && (
            <div className="mb-4">
              <h3 className="font-pixel-heading mb-2 text-blue-300">Items Collected:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {inventory.map((item: Item) => (
                  <div key={item.id} className="p-2 pixel-borders-thin bg-surface text-sm flex items-center">
                    <span className="mr-2 text-lg">
                      {item.rarity === 'common' ? '⚪' : 
                       item.rarity === 'uncommon' ? '🔵' : '🟣'}
                    </span>
                    <PixelText>{item.name}</PixelText>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <p className="italic text-text-secondary text-sm mt-4 font-pixel">
            In the full game, your progress would contribute to permanent upgrades,
            unlocking new content and abilities for future runs.
          </p>
        </div>
        
        <div className="text-center">
          <PixelButton
            className="px-6 py-3 bg-clinical text-white hover:bg-clinical-light transition-colors"
            onClick={startNewGame}
          >
            Start New Run
          </PixelButton>
        </div>
      </div>
      
      {/* CRT scanline effect */}
      <div className="absolute inset-0 scanlines opacity-20 pointer-events-none"></div>
    </div>
  );
}