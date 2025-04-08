// app/components/HillHomeScene.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { useKnowledgeStore } from '../store/knowledgeStore';
import { PixelText, PixelButton } from './PixelThemeProvider';

/**
 * HillHomeScene - Night phase component with constellation focus
 * 
 * OPTION 1 IMPLEMENTATION: Core functionality only, with dependencies stubbed or removed
 */
export default function HillHomeScene({ onComplete }: { onComplete: () => void }) {
  const { player, completedNodeIds, inventory, currentDay } = useGameStore();
  
  // Simplified knowledge store integration
  // In full implementation, this would connect to the constellation system
  const knowledgeStore = {
    pendingInsights: [],  // Hardcoded for now
    totalMastery: 35,     // Hardcoded percentage
    domainMastery: {
      'clinical-practice': 40,
      'quality-assurance': 30,
      'theoretical': 25
    },
    transferInsights: () => console.log('Would transfer insights here'),
    resetNewlyDiscovered: () => console.log('Would reset newly discovered')
  };
  
  // Internal state
  const [showInventory, setShowInventory] = useState(false);
  const [showConstellation, setShowConstellation] = useState(false);
  const [insightTransferred, setInsightTransferred] = useState(true); // Hardcoded to true to simplify
  const [fadeIn, setFadeIn] = useState(false);
  
  // Simplified refs - no actual audio loading
  const componentMounted = useRef(true);
  
  // Fade in effect on mount - keeping this simple visual effect
  useEffect(() => {
    componentMounted.current = true;
    
    // Trigger fade-in effect
    setTimeout(() => {
      if (componentMounted.current) {
        setFadeIn(true);
      }
    }, 100);
    
    return () => {
      componentMounted.current = false;
    };
  }, []);
  
  // Start day phase without transition effects
  const startDay = () => {
    // OPTION 1: Direct callback without animations or confirmations
    console.log('Starting day phase');
    onComplete();
  };
  
  // Simplified constellation view with no animations
  const handleTransferInsights = () => {
    console.log('Transferring insights (simplified)');
    knowledgeStore.transferInsights();
    setInsightTransferred(true);
  };

  return (
    <div 
      className={`h-full w-full bg-gradient-to-b from-black via-indigo-950 to-black flex flex-col items-center justify-center p-6 transition-opacity duration-1000 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* Stars background effect - keeping this for visual identity */}
      <div className="stars-bg fixed inset-0 z-0"></div>
      
      {/* Simplified header */}
      <div className="w-full max-w-4xl mb-8 text-center relative z-10">
        <PixelText className="text-3xl text-white font-pixel-heading mb-2">Night Phase</PixelText>
        <PixelText className="text-lg text-gray-400">
          Hillside Home - Study and Reflect
        </PixelText>
      </div>
      
      {/* Main interaction grid - now 3 buttons in a row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl mb-8 relative z-10">
        {/* Constellation button - simplified */}
        <div 
          className="p-8 col-span-3 bg-surface-dark pixel-borders flex flex-col items-center justify-center min-h-[200px] transition-all duration-300 hover:bg-surface cursor-pointer"
          onClick={() => setShowConstellation(true)}
        >
          <div className="text-4xl mb-4">🌠</div>
          <PixelText className="text-xl mb-2">Knowledge Constellation</PixelText>
          <PixelText className="text-sm text-text-secondary mb-2">
            View your growing understanding of medical physics
          </PixelText>
        </div>
        
        {/* Inventory button */}
        <div 
          className="p-8 bg-surface-dark pixel-borders flex flex-col items-center justify-center min-h-[200px] transition-all duration-300 hover:bg-surface cursor-pointer"
          onClick={() => setShowInventory(true)}
        >
          <div className="text-4xl mb-4">🎒</div>
          <PixelText className="text-xl mb-2">Inventory</PixelText>
          <span className="px-3 py-1 bg-gray-700 text-white text-sm mt-2">
            {inventory.length} Items
          </span>
        </div>
        
        {/* Start day button - direct call with no confirmation */}
        <div 
          className="p-8 bg-surface-dark pixel-borders flex flex-col items-center justify-center min-h-[200px] transition-all duration-300 hover:bg-surface cursor-pointer col-span-2 group relative overflow-hidden"
          onClick={startDay}
        >
          <div className="text-4xl mb-4">🏥</div>
          <PixelText className="text-xl mb-2">Return to Hospital</PixelText>
          <span className="px-3 py-1 bg-clinical text-white text-sm mt-2 group-hover:bg-clinical-light transition-colors">
            Begin Day {currentDay}
          </span>
        </div>
      </div>
      
      {/* Player stats summary */}
      <div className="bg-surface-dark pixel-borders p-4 w-full max-w-4xl relative z-10">
        <div className="flex justify-between items-center mb-4">
          <PixelText className="text-lg">Player Status</PixelText>
          <div className="flex space-x-2">
            <span className="px-2 py-1 bg-danger text-white text-sm">
              Health: {player.health}/{player.maxHealth}
            </span>
            <span className="px-2 py-1 bg-clinical text-white text-sm">
              Insight: {player.insight}
            </span>
          </div>
        </div>
        
        <div className="mb-2">
          <PixelText className="text-text-secondary mb-1">Knowledge Mastery</PixelText>
          <div className="pixel-progress-bg">
            <div 
              className="h-full bg-educational" 
              style={{ width: `${knowledgeStore.totalMastery}%` }}
            ></div>
          </div>
        </div>
        
        <div className="text-xs text-text-secondary flex justify-between">
          <span>Clinical: {knowledgeStore.domainMastery['clinical-practice'] || 0}%</span>
          <span>Technical: {knowledgeStore.domainMastery['quality-assurance'] || 0}%</span>
          <span>Theory: {knowledgeStore.domainMastery['theoretical'] || 0}%</span>
        </div>
      </div>
      
      {/* Simplified inventory panel */}
      {showInventory && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
          <div className="bg-surface p-6 max-w-md w-full pixel-borders">
            <div className="flex justify-between items-center mb-4">
              <PixelText className="text-2xl">Inventory</PixelText>
              <PixelButton 
                className="bg-red-600 hover:bg-red-500 text-white" 
                onClick={() => setShowInventory(false)}
              >
                Close
              </PixelButton>
            </div>
            
            <div className="grid grid-cols-1 gap-3 mb-4 max-h-96 overflow-y-auto">
              {inventory && inventory.length > 0 ? (
                inventory.map((item: any, index: number) => (
                  <div key={index} className="bg-surface-dark p-3 pixel-borders-thin">
                    <div className="flex justify-between">
                      <PixelText>{item.name}</PixelText>
                      <PixelText className="text-text-secondary text-sm">{item.rarity}</PixelText>
                    </div>
                    <PixelText className="text-text-secondary text-sm">{item.description}</PixelText>
                  </div>
                ))
              ) : (
                <div className="bg-surface-dark p-4 text-center">
                  <PixelText className="text-text-secondary">No items collected yet</PixelText>
                  <PixelText className="text-text-secondary text-sm mt-2">Visit storage closets in the hospital to find useful equipment</PixelText>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Simplified constellation overlay */}
      {showConstellation && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
          <div className="bg-surface p-6 max-w-4xl w-full pixel-borders">
            <div className="flex justify-between items-center mb-4">
              <PixelText className="text-2xl">Knowledge Constellation</PixelText>
              <PixelButton 
                className="bg-red-600 hover:bg-red-500 text-white" 
                onClick={() => setShowConstellation(false)}
              >
                Close
              </PixelButton>
            </div>
            
            {/* OPTION 1: Simplified constellation placeholder */}
            <div className="bg-indigo-950 w-full h-[60vh] flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl mb-4">✨🌟💫</div>
                <PixelText className="text-xl mb-4">Constellation View</PixelText>
                <PixelText className="text-text-secondary">
                  Your growing understanding of medical physics concepts
                </PixelText>
              </div>
            </div>
            
            {/* Basic button to close */}
            <div className="mt-4 flex justify-end">
              <PixelButton 
                className="bg-clinical hover:bg-clinical-light text-white"
                onClick={() => setShowConstellation(false)}
              >
                Return to Hill Home
              </PixelButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}