import { useGameStore } from '../store/gameStore';
import { PixelBorder, PixelText } from './PixelThemeProvider';

export default function PlayerStats() {
  const { health, insight } = useGameStore((state) => state.player);
  
  return (
    <div className="bg-surface p-4 space-y-4 border-l border-gray-700 h-full">
      <div className="pixel-borders-thin mb-6">
        <h2 className="pixel-heading bg-surface-dark px-3 py-2 border-b border-border">Player Stats</h2>
        
        <div className="p-3 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <PixelText className="text-text-primary">Health</PixelText>
              <PixelText className="text-text-secondary">{health}/4</PixelText>
            </div>
            <div className="flex">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`w-12 h-12 mx-1 ${i < health ? 'bg-danger' : 'bg-dark-gray opacity-30'} pixel-borders-thin`}>
                  <div className="w-full h-full shadow-[inset_1px_1px_0_rgba(255,255,255,0.3),inset_-1px_-1px_0_rgba(0,0,0,0.3)]"></div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <PixelText className="text-text-primary">Insight</PixelText>
              <PixelText className="text-text-secondary">{insight}</PixelText>
            </div>
            <div className="pixel-progress-bg">
              <div 
                className="pixel-progress-fill"
                style={{width: `${Math.min(100, insight/2)}%`}}
              ></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Character portrait */}
      <div className="flex flex-col items-center">
        <PixelBorder className="w-24 h-24 mb-2">
          <div className="w-full h-full bg-surface-dark flex items-center justify-center text-4xl">
            👨‍⚕️
          </div>
        </PixelBorder>
        <PixelText className="text-text-primary">The Resident</PixelText>
      </div>
    </div>
  );
}