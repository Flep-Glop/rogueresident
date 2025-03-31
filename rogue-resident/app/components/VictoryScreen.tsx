// app/components/VictoryScreen.tsx
'use client';
import { useGameStore } from '../store/gameStore';
import { Item } from '../data/items';
import { PixelText, PixelButton } from './PixelThemeProvider';

export default function VictoryScreen() {
  const { resetGame, startGame, inventory, completedNodeIds, currentDay } = useGameStore();
  
  const startNewGame = () => {
    resetGame();
    startGame();
  };
  
  // Calculate completion percentage
  const calculateCompletion = () => {
    const totalItems = 20; // Approximate number of total items in the game
    const itemPercentage = (inventory.length / totalItems) * 100;
    
    // In a full game, would calculate additional metrics
    return Math.min(100, Math.round(itemPercentage));
  };
  
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Victory background effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-success-dark to-indigo-900">
        {/* Animated stars/particles */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(white, rgba(255, 255, 255, 0) 2px)',
          backgroundSize: '20px 20px',
          animation: 'pulse 3s infinite alternate'
        }}></div>
      </div>
      
      <div className="relative z-10 max-w-2xl w-full">
        <div className="bg-surface pixel-borders p-8 mb-6">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-pixel-heading text-success mb-2 animate-pulse">Victory!</h1>
            <p className="text-xl font-pixel">You've successfully completed your residency</p>
          </div>
          
          <div className="bg-surface-dark p-6 pixel-borders-thin mb-8">
            <h2 className="text-xl font-pixel-heading mb-4 text-success">Residency Completion:</h2>
            
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-surface p-4 rounded pixel-borders-thin">
                <p className="text-sm text-text-secondary">Days Completed</p>
                <p className="text-3xl font-bold font-pixel text-success">{currentDay}</p>
              </div>
              
              <div className="bg-surface p-4 rounded pixel-borders-thin">
                <p className="text-sm text-text-secondary">Challenges Mastered</p>
                <p className="text-3xl font-bold font-pixel text-success">{completedNodeIds.length}</p>
              </div>
              
              <div className="bg-surface p-4 rounded pixel-borders-thin">
                <p className="text-sm text-text-secondary">Items Collected</p>
                <p className="text-3xl font-bold font-pixel text-success">{inventory.length}</p>
              </div>
              
              <div className="bg-surface p-4 rounded pixel-borders-thin">
                <p className="text-sm text-text-secondary">Game Completion</p>
                <p className="text-3xl font-bold font-pixel text-success">{calculateCompletion()}%</p>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="font-pixel-heading mb-3 text-success">Achievements Unlocked:</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 pixel-borders-thin bg-surface">
                  <PixelText className="font-bold">🏆 Resident Graduate</PixelText>
                  <PixelText className="text-sm text-text-secondary">Completed your residency</PixelText>
                </div>
                
                <div className="p-3 pixel-borders-thin bg-surface">
                  <PixelText className="font-bold">🧠 Ionix Master</PixelText>
                  <PixelText className="text-sm text-text-secondary">Defeated the Ionix anomaly</PixelText>
                </div>
                
                <div className="p-3 pixel-borders-thin bg-surface">
                  <PixelText className="font-bold">📊 Data Analyst</PixelText>
                  <PixelText className="text-sm text-text-secondary">Completed multiple clinical challenges</PixelText>
                </div>
                
                <div className="p-3 pixel-borders-thin bg-surface">
                  <PixelText className="font-bold">🏕️ Hill Dweller</PixelText>
                  <PixelText className="text-sm text-text-secondary">Improved your hillside home</PixelText>
                </div>
              </div>
            </div>
            
            <div className="text-center mt-6 p-4 bg-success/20 pixel-borders-thin">
              <PixelText className="text-xl font-bold text-success mb-2">Congratulations, Medical Physicist!</PixelText>
              <PixelText className="text-text-primary">
                You've proven your skills and completed your medical physics residency.
                Your innovative approach to the Ionix anomaly has earned you recognition
                in the field!
              </PixelText>
            </div>
          </div>
          
          <div className="text-center">
            <PixelButton
              className="px-8 py-3 bg-success text-white hover:bg-green-600 transition-colors text-xl"
              onClick={startNewGame}
            >
              Start New Career
            </PixelButton>
          </div>
        </div>
        
        <div className="text-center text-text-secondary text-sm">
          <PixelText>
            Thank you for playing the Rogue Resident prototype!
          </PixelText>
        </div>
      </div>
      
      {/* CRT scanline effect */}
      <div className="absolute inset-0 scanlines opacity-20 pointer-events-none"></div>
    </div>
  );
}