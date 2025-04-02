// app/components/HillHomeScene.tsx
'use client';
import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useKnowledgeStore } from '../store/knowledgeStore';
import { PixelText, PixelButton } from './PixelThemeProvider';
import { useGameEffects } from './GameEffects';
import ConstellationView from './knowledge/ConstellationView';

/**
 * HillHomeScene - Night phase component with constellation focus
 * 
 * This version emphasizes the constellation as the primary progression system
 * and creates a meaningful contrast to the hospital environment
 */
export default function HillHomeScene({ onComplete }: { onComplete: () => void }) {
  const { player, completedNodeIds, inventory, currentDay } = useGameStore();
  const { 
    pendingInsights, 
    transferInsights, 
    totalMastery, 
    domainMastery,
    nodes,
    connections,
    resetNewlyDiscovered
  } = useKnowledgeStore();
  const { playSound, flashScreen, showRewardEffect } = useGameEffects();
  
  // Internal state
  const [showInventory, setShowInventory] = useState(false);
  const [showConstellation, setShowConstellation] = useState(false);
  const [insightTransferred, setInsightTransferred] = useState(false);
  const [constellationAnimating, setConstellationAnimating] = useState(false);
  const [activeNodes, setActiveNodes] = useState<string[]>([]);
  
  useEffect(() => {
    // Track whether there are pending insights to transfer
    setInsightTransferred(pendingInsights.length === 0);
  }, [completedNodeIds, pendingInsights.length]);
  
  // Start day phase with more deliberate transition
  const startDay = () => {
    if (playSound) playSound('click');
    
    // Check if there are pending insights that haven't been transferred
    if (pendingInsights.length > 0 && !insightTransferred) {
      // Create a more styled confirmation instead of browser confirm
      const shouldProceed = confirm("You have unreviewed constellation insights. Continue anyway?");
      if (shouldProceed) {
        // Proceed with transition
        onComplete();
      }
    } else {
      // No pending insights, proceed with transition
      onComplete();
    }
  };
  
  // Handle constellation transfer
  const handleTransferInsights = () => {
    // Connect to animation sequence
    setConstellationAnimating(true);
    
    // Track newly discovered nodes for highlighting
    const newNodes = pendingInsights.map(insight => insight.conceptId);
    setActiveNodes(newNodes);
    
    // Visual effects
    if (playSound) playSound('success');
    if (flashScreen) flashScreen('blue');
    
    // Create centered reward effect for larger insight transfers
    const totalInsight = pendingInsights.reduce((sum, item) => sum + item.amount, 0);
    if (showRewardEffect && totalInsight > 0) {
      showRewardEffect(totalInsight, window.innerWidth / 2, window.innerHeight / 2);
    }
    
    // Complete the knowledge transfer
    transferInsights();
    setInsightTransferred(true);
    
    // Reset animation state after delay to allow visualization
    setTimeout(() => {
      setConstellationAnimating(false);
      resetNewlyDiscovered();
      setActiveNodes([]);
    }, 5000);
  };

  return (
    <div className="h-full w-full bg-black flex flex-col items-center justify-center p-6">
      {/* Simplified header */}
      <div className="w-full max-w-4xl mb-8 text-center">
        <PixelText className="text-3xl text-white font-pixel-heading mb-2">Night Phase</PixelText>
        <PixelText className="text-lg text-gray-400">
          Hillside Home - Study and Reflect
        </PixelText>
      </div>
      
      {/* Main interaction grid - now 3 buttons in a row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl mb-8">
        {/* Constellation button - now larger and more prominent */}
        <div 
          className={`p-8 col-span-3 bg-surface-dark pixel-borders flex flex-col items-center justify-center min-h-[200px] transition-all duration-300 hover:bg-surface cursor-pointer ${!insightTransferred ? 'animate-pulse' : ''}`}
          onClick={() => setShowConstellation(true)}
        >
          <div className="text-4xl mb-4">🌠</div>
          <PixelText className="text-xl mb-2">Knowledge Constellation</PixelText>
          <PixelText className="text-sm text-text-secondary mb-2">
            View your growing understanding of medical physics
          </PixelText>
          {!insightTransferred && (
            <span className="px-3 py-1 bg-clinical text-white text-sm mt-2">
              {pendingInsights.length} New Insights!
            </span>
          )}
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
        
        {/* Start day button - made more visual and narrative */}
        <div 
          className="p-8 bg-surface-dark pixel-borders flex flex-col items-center justify-center min-h-[200px] transition-all duration-300 hover:bg-surface cursor-pointer col-span-2 group relative overflow-hidden"
          onClick={startDay}
        >
          <div className="text-4xl mb-4">🏥</div>
          <PixelText className="text-xl mb-2">Return to Hospital</PixelText>
          <span className="px-3 py-1 bg-clinical text-white text-sm mt-2 group-hover:bg-clinical-light transition-colors">
            Begin Day {currentDay}
          </span>
          
          {/* Subtle indicator about where you're going */}
          <div className="absolute bottom-3 right-3 opacity-50 text-xs">
            <PixelText className="text-text-secondary">
              Morning awaits...
            </PixelText>
          </div>
          
          {/* Warning about pending insights */}
          {pendingInsights.length > 0 && !insightTransferred && (
            <div className="absolute top-3 right-3 text-warning-light text-xs animate-pulse">
              <PixelText>
                ⚠️ Insights pending
              </PixelText>
            </div>
          )}
        </div>
      </div>
      
      {/* Player stats summary */}
      <div className="bg-surface-dark pixel-borders p-4 w-full max-w-4xl">
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
              style={{ width: `${totalMastery}%` }}
            ></div>
          </div>
        </div>
        
        <div className="text-xs text-text-secondary flex justify-between">
          <span>Clinical: {domainMastery.clinical}%</span>
          <span>Technical: {domainMastery.technical}%</span>
          <span>Theory: {domainMastery.theoretical}%</span>
        </div>
      </div>
      
      {/* Inventory panel */}
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
      
      {/* Knowledge Constellation Overlay */}
      {showConstellation && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
          <div className="relative max-w-4xl w-full h-[80vh]">
            <ConstellationView 
              onClose={() => setShowConstellation(false)}
              width={800}
              height={600}
              interactive={true}
              enableJournal={true}
              activeNodes={activeNodes}
            />
            
            {/* Insight transfer controls */}
            {!insightTransferred && pendingInsights.length > 0 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-surface pixel-borders p-4 z-10">
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 rounded-full bg-clinical animate-pulse mr-2"></div>
                  <PixelText className="text-clinical-light">
                    {pendingInsights.length} New Insight{pendingInsights.length !== 1 ? 's' : ''} to Transfer
                  </PixelText>
                </div>
                
                <PixelButton
                  className="bg-clinical hover:bg-clinical-light text-white w-full"
                  onClick={handleTransferInsights}
                  disabled={constellationAnimating}
                >
                  {constellationAnimating 
                    ? 'Transferring...' 
                    : `Transfer Insight${pendingInsights.length !== 1 ? 's' : ''} to Constellation`
                  }
                </PixelButton>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}