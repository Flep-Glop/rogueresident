// app/components/StartScreen.tsx
import { useGameStore } from '../store/gameStore';
import { PixelButton, PixelText } from './PixelThemeProvider';

export default function StartScreen() {
  const { resetGame, startGame } = useGameStore();
  
  const handleStartNewGame = () => {
    resetGame(); // Reset to initial state
    startGame(); // Update gameState to 'in_progress'
  };
  
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-text-primary p-4 starfield-bg">
      <div className="animate-pulse mb-2">
        <PixelText className="text-5xl font-pixel-heading text-blue-400 mb-4">Rogue Resident</PixelText>
      </div>
      <PixelText className="text-2xl mb-12 text-blue-300 font-pixel">Medical Physics Residency</PixelText>
      
      <div className="max-w-2xl bg-surface p-6 pixel-borders mb-12">
        <p className="mb-4 font-pixel text-text-primary">
          You are a new medical physics resident navigating through the challenges of your training.
          Explore different areas of the department, face clinical situations, discover useful equipment,
          and confront the mysterious Ionix anomaly.
        </p>
        
        <h3 className="text-xl font-pixel text-blue-300 mb-2">How to Play:</h3>
        <ul className="list-disc pl-6 mb-4 space-y-1 font-pixel text-text-secondary">
          <li>Navigate through the map by selecting connected nodes</li>
          <li>Complete challenges to earn insight and unlock new paths</li>
          <li>Find useful items in storage closets to help with your challenges</li>
          <li>Keep an eye on your health - if it reaches zero, your run ends</li>
          <li>Reach and defeat the boss to complete your run</li>
        </ul>
        
        <p className="italic text-text-secondary text-sm font-pixel">
          This prototype demonstrates the core gameplay loop with basic features.
          The full game would include more diverse challenges, items, and progression.
        </p>
      </div>
      
      <PixelButton
        className="px-8 py-3 bg-clinical text-white hover:bg-clinical-light text-xl font-pixel"
        onClick={handleStartNewGame}
      >
        Start New Run
      </PixelButton>
      
      {/* CRT scanline effect */}
      <div className="absolute inset-0 scanlines opacity-20 pointer-events-none"></div>
    </div>
  );
}