// app/components/SeedDebugPanel.tsx
'use client';
import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { PixelText, PixelButton } from './PixelThemeProvider';
import { 
  DEV_SEEDS, 
  createSeedUrl, 
  getRecentRuns,
  RunData
} from '../utils/seedUtils';

/**
 * SeedDebugPanel - Development tool for managing procedural seeds
 * This panel makes it easy to test different seeds and share specific layouts
 * Only appears in development mode
 */
export default function SeedDebugPanel() {
  const { 
    startGame, 
    map, 
    currentRun,
    recentRuns: storeRecentRuns,
    replaySeed,
    useDailyChallenge
  } = useGameStore();
  
  const [isOpen, setIsOpen] = useState(false);
  const [recentRuns, setRecentRuns] = useState<RunData[]>([]);
  const [customSeed, setCustomSeed] = useState('');
  const [seedCopied, setSeedCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'presets'|'recent'|'custom'>('presets');
  
  // Load recent runs on mount
  useEffect(() => {
    const runs = getRecentRuns();
    setRecentRuns(runs);
  }, [storeRecentRuns]);
  
  // Return null in production
  if (process.env.NODE_ENV === 'production') return null;
  
  // Toggle panel visibility
  const togglePanel = () => setIsOpen(prev => !prev);
  
  // Format timestamp
  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString(undefined, { 
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return timestamp;
    }
  };
  
  // Copy seed URL
  const copySeedUrl = () => {
    if (!map?.seed) return;
    
    try {
      const url = createSeedUrl(map.seed);
      navigator.clipboard.writeText(url);
      setSeedCopied(true);
      setTimeout(() => setSeedCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy URL:', e);
    }
  };
  
  // Start game with custom seed
  const handleCustomSeed = () => {
    const seed = parseInt(customSeed, 10);
    if (isNaN(seed)) return;
    
    replaySeed(seed);
    setIsOpen(false);
  };
  
  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'presets':
        return (
          <div className="p-3 space-y-2 h-60 overflow-y-auto">
            <div className="font-bold border-b border-gray-700 pb-1 mb-2">Dev Presets</div>
            {Object.entries(DEV_SEEDS).map(([name, seed]) => (
              <div key={seed} className="flex justify-between items-center">
                <span className="text-sm">{name}</span>
                <PixelButton
                  className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600"
                  onClick={() => {
                    replaySeed(seed);
                    setIsOpen(false);
                  }}
                >
                  Run {seed}
                </PixelButton>
              </div>
            ))}
            
            <div className="mt-4 pt-2 border-t border-gray-700">
              <PixelButton
                className="w-full px-2 py-1 text-xs bg-blue-700 hover:bg-blue-600"
                onClick={() => {
                  useDailyChallenge();
                  setIsOpen(false);
                }}
              >
                Daily Challenge
              </PixelButton>
            </div>
          </div>
        );
        
      case 'recent':
        return (
          <div className="p-3 space-y-2 h-60 overflow-y-auto">
            <div className="font-bold border-b border-gray-700 pb-1 mb-2">Recent Runs</div>
            {recentRuns.length === 0 ? (
              <div className="text-sm text-gray-400 italic">No recent runs found</div>
            ) : (
              recentRuns.map((run, index) => (
                <div key={index} className="flex justify-between items-center border-b border-gray-700 pb-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{run.seedName}</span>
                    <span className="text-xs text-gray-400">
                      {formatTimestamp(run.timestamp)}
                      {run.dayCount && run.dayCount > 1 ? ` • ${run.dayCount} days` : ''}
                      {run.completed ? ' • Completed' : ''}
                    </span>
                  </div>
                  <PixelButton
                    className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600"
                    onClick={() => {
                      replaySeed(run.seed);
                      setIsOpen(false);
                    }}
                  >
                    Replay
                  </PixelButton>
                </div>
              ))
            )}
          </div>
        );
        
      case 'custom':
        return (
          <div className="p-3 space-y-4 h-60">
            <div className="font-bold border-b border-gray-700 pb-1 mb-2">Custom Seed</div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={customSeed}
                onChange={(e) => setCustomSeed(e.target.value)}
                placeholder="Enter seed number..."
                className="flex-1 px-2 py-1 text-sm bg-gray-800 border border-gray-600 rounded-sm"
              />
              <PixelButton
                className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleCustomSeed}
                disabled={!customSeed || isNaN(parseInt(customSeed, 10))}
              >
                Run
              </PixelButton>
            </div>
            
            <div className="text-xs text-gray-400">
              <p>Enter any integer value to use as a seed. The same seed will always generate the same map layout.</p>
              <p className="mt-2">Seeds can be shared with other developers or testers to reproduce specific game states.</p>
            </div>
          </div>
        );
    }
  };
  
  return (
    <>
      {/* Toggle Button */}
      <button
        className="fixed bottom-4 right-4 z-50 bg-black/80 hover:bg-black text-white px-3 py-2 rounded text-xs flex items-center"
        onClick={togglePanel}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" />
        </svg>
        <span>{isOpen ? 'Hide' : 'Seed'}</span>
        {map?.seed && <span className="ml-1 text-blue-300">#{map.seed}</span>}
      </button>
      
      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-14 right-4 z-50 bg-gray-900 border border-gray-700 rounded shadow-lg w-72 text-white">
          <div className="flex justify-between items-center p-2 border-b border-gray-700">
            <PixelText className="font-bold">Seed Management</PixelText>
            {map?.seed && (
              <div className="flex items-center">
                <span className="text-xs mr-1">{map.seed}</span>
                <button
                  className="text-blue-400 hover:text-blue-300 text-xs underline"
                  onClick={copySeedUrl}
                >
                  {seedCopied ? 'Copied!' : 'Copy URL'}
                </button>
              </div>
            )}
          </div>
          
          {/* Current Run Info */}
          {currentRun && (
            <div className="p-2 border-b border-gray-700 bg-gray-800">
              <div className="text-xs flex justify-between">
                <span className="font-medium">{currentRun.seedName}</span>
                <span>Day {currentRun.dayCount || 1}</span>
              </div>
              <div className="mt-1 text-xs text-gray-400 flex justify-between">
                <span>{formatTimestamp(currentRun.timestamp)}</span>
                {map?.seed && (
                  <span className="text-blue-300">Seed #{map.seed}</span>
                )}
              </div>
            </div>
          )}
          
          {/* Tabs */}
          <div className="flex border-b border-gray-700">
            <button
              className={`flex-1 py-1 text-xs ${activeTab === 'presets' ? 'bg-gray-700 font-bold' : 'hover:bg-gray-800'}`}
              onClick={() => setActiveTab('presets')}
            >
              Presets
            </button>
            <button
              className={`flex-1 py-1 text-xs ${activeTab === 'recent' ? 'bg-gray-700 font-bold' : 'hover:bg-gray-800'}`}
              onClick={() => setActiveTab('recent')}
            >
              Recent
            </button>
            <button
              className={`flex-1 py-1 text-xs ${activeTab === 'custom' ? 'bg-gray-700 font-bold' : 'hover:bg-gray-800'}`}
              onClick={() => setActiveTab('custom')}
            >
              Custom
            </button>
          </div>
          
          {/* Tab Content */}
          {renderTabContent()}
        </div>
      )}
    </>
  );
}