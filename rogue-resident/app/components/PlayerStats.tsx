import { useGameStore } from '../store/gameStore';

export default function PlayerStats() {
  const { health, insight } = useGameStore((state) => state.player);
  
  return (
    <div className="stats-panel p-4 space-y-4">
      <h2 className="terminal-header mb-4">Player Stats</h2>
      
      <div className="stat-container">
        <div className="stat-label">
          <span>Health</span>
          <span>{health}/4</span>
        </div>
        <div className="pixel-health-container">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`pixel-health-unit ${i >= health ? 'empty' : ''}`}>
              <div className="w-full h-full"></div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="stat-container">
        <div className="stat-label">
          <span>Insight</span>
          <span>{insight}</span>
        </div>
        <div className="insight-bar">
          <div 
            className="insight-fill"
            style={{width: `${Math.min(100, insight/2)}%`}}
          ></div>
        </div>
      </div>
      
      {/* Character portrait */}
      <div className="mt-6">
        <div className="character-portrait mx-auto">
          <div className="w-full h-full flex items-center justify-center text-4xl">
            👨‍⚕️
          </div>
        </div>
        <div className="character-name mt-2">The Resident</div>
      </div>
      
      {/* Inventory section */}
      <div className="inventory-container">
        <h3 className="terminal-subheader mb-3">Inventory</h3>
        <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
          <span className="font-pixel">Items</span>
          <span className="font-pixel">1/10</span>
        </div>
        
        {/* Example item (replace with your actual inventory implementation) */}
        <div className="pixel-item rarity-rare">
          <div className="item-header">
            <span className="item-name">Dwell Position Optimizer</span>
            <span className="rarity-badge rare">Rare</span>
          </div>
          <div className="item-content">
            <div className="item-description">
              Software that helps optimize dwell positions for brachytherapy treatments.
            </div>
            <div className="item-effects mt-2">
              <div className="effect-tag">
                <span>Clinical: </span>
                <span className="value">+35%</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Current bonuses section */}
        <div className="bonuses-container">
          <div className="bonuses-title">
            Current Bonuses
            <div className="help-icon">?</div>
          </div>
          
          <div className="bonuses-grid">
            <div className="bonus-tag">
              <div className="bonus-name">
                <span className="bonus-icon">🏥</span>
                <span>Clinical:</span>
              </div>
              <div className="bonus-value positive">+35%</div>
            </div>
            
            <div className="bonus-tag">
              <div className="bonus-name">
                <span className="bonus-icon">🔍</span>
                <span>QA:</span>
              </div>
              <div className="bonus-value zero">+0%</div>
            </div>
            
            <div className="bonus-tag">
              <div className="bonus-name">
                <span className="bonus-icon">📚</span>
                <span>Educational:</span>
              </div>
              <div className="bonus-value zero">+0%</div>
            </div>
            
            <div className="bonus-tag">
              <div className="bonus-name">
                <span className="bonus-icon">⚡</span>
                <span>General:</span>
              </div>
              <div className="bonus-value zero">+0%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}