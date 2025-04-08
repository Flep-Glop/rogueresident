'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { useKnowledgeStore } from '../store/knowledgeStore';
import { PixelText, PixelButton } from './PixelThemeProvider';
import { useGameState } from '../core/statemachine/GameStateMachine';
import ConstellationView from './knowledge/ConstellationView';
import { useEventBus } from '../core/events/CentralEventBus';
import { GameEventType } from '../core/events/EventTypes';


/**
 * HillHomeScene - Simplified night phase component
 * 
 * A more straightforward implementation with better error handling
 * and visual feedback to ensure users can always progress.
 */
export default function HillHomeScene({ onComplete }) {
  // Core game state
  const { player, inventory, currentDay, updateInsight } = useGameStore();
  const { gamePhase } = useGameState();
  
  // Knowledge state
  const { pendingInsights, totalMastery, domainMastery, transferInsights, resetNewlyDiscovered, newlyDiscovered } = useKnowledgeStore();
  
  // Component state
  const [showInventory, setShowInventory] = useState(false);
  const [showConstellation, setShowConstellation] = useState(false);
  const [insightTransferred, setInsightTransferred] = useState(false);
  const [renderCount, setRenderCount] = useState(0);
  const [hasStartedInsightTransfer, setHasStartedInsightTransfer] = useState(false);
  
  // Mount tracking
  const mounted = useRef(true);
  
  // Track renders for debugging
  useEffect(() => {
    setRenderCount(prev => prev + 1);
    console.log(`[HillHomeScene] Render #${renderCount + 1}`);
    
    // Log critical debug info
    console.log('[HillHomeScene] Current game phase:', gamePhase);
    console.log('[HillHomeScene] Has pending insights:', pendingInsights.length);
    console.log('[HillHomeScene] Newly discovered concepts:', newlyDiscovered.length);
  }, [gamePhase, pendingInsights.length, newlyDiscovered.length]);
  
  // Set up mount/unmount tracking
  useEffect(() => {
    // Log when component mounts
    console.log('[HillHomeScene] Component mounted');
    mounted.current = true;
    
    // Notify event system that night phase has started
    try {
      useEventBus.getState().dispatch(
        GameEventType.GAME_PHASE_CHANGED,
        {
          from: 'transition_to_night',
          to: 'night',
          reason: 'hill_home_mounted'
        },
        'HillHomeScene'
      );
    } catch (e) {
      console.warn('[HillHomeScene] Event dispatch failed:', e);
    }
    
    return () => {
      mounted.current = false;
      console.log('[HillHomeScene] Component unmounted');
    };
  }, []);
  
  // Handle insight transfer with improved error handling
  useEffect(() => {
    if (!mounted.current) return;
    
    // Only start transfer if we haven't already and we have insights to transfer
    if (!hasStartedInsightTransfer && !insightTransferred && pendingInsights.length > 0) {
      console.log('[HillHomeScene] Starting insight transfer process');
      setHasStartedInsightTransfer(true);
      
      // Start transfer after a delay
      const timer = setTimeout(() => {
        if (!mounted.current) return;
        
        try {
          console.log('[HillHomeScene] Executing insight transfer');
          
          // Calculate total insight gain
          const totalInsightGain = pendingInsights.reduce((total, insight) => {
            return total + insight.amount;
          }, 0);
          
          // Grant insight points
          updateInsight(totalInsightGain);
          
          // Actually transfer insights in the knowledge store
          transferInsights();
          
          // Update state
          setInsightTransferred(true);
          
          // Log insight transfer for debugging
          console.log('[HillHomeScene] Insight transfer complete:', {
            insightsTransferred: pendingInsights.length,
            totalGain: totalInsightGain
          });
          
          // Automatically open constellation view after a delay
          if (newlyDiscovered.length > 0) {
            setTimeout(() => {
              if (mounted.current) {
                setShowConstellation(true);
              }
            }, 1000);
          }
          
        } catch (error) {
          console.error('[HillHomeScene] Error during insight transfer:', error);
          // Still mark as transferred so player can continue
          setInsightTransferred(true);
        }
      }, 1500); // Reduced delay for better responsiveness
      
      return () => clearTimeout(timer);
    }
  }, [
    hasStartedInsightTransfer, 
    insightTransferred, 
    pendingInsights, 
    updateInsight, 
    transferInsights,
    newlyDiscovered
  ]);
  
  // Handle clean-up of newly discovered state when leaving
  useEffect(() => {
    return () => {
      // Reset newly discovered state when component unmounts
      if (newlyDiscovered.length > 0) {
        try {
          console.log('[HillHomeScene] Resetting newly discovered on unmount');
          resetNewlyDiscovered();
        } catch (e) {
          console.warn('[HillHomeScene] Failed to reset newly discovered:', e);
        }
      }
    };
  }, [newlyDiscovered, resetNewlyDiscovered]);
  
  // Handle starting the next day
  const handleStartDay = () => {
    // Ensure insights are transferred
    if (!insightTransferred && pendingInsights.length > 0) {
      try {
        // Force transfer insights if not done yet
        transferInsights();
        console.log('[HillHomeScene] Forced insight transfer before day start');
      } catch (e) {
        console.warn('[HillHomeScene] Error during forced insight transfer:', e);
      }
    }
    
    // Close constellation if open
    setShowConstellation(false);
    
    // Reset newly discovered
    if (newlyDiscovered.length > 0) {
      resetNewlyDiscovered();
    }
    
    // Log button click
    console.log('[HillHomeScene] Starting next day (Day ' + (currentDay + 1) + ')');
    
    // Complete night phase
    onComplete();
  };
  
  // Get concept color helper
  const getConceptColor = (conceptId) => {
    // Map concept to domain colors
    const conceptDomains = {
      'electron-equilibrium': '#3b82f6', // Blue - radiation physics
      'radiation-dosimetry': '#3b82f6',
      'inverse-square-law': '#3b82f6',
      'output-calibration': '#10b981', // Green - quality assurance
      'tolerance-limits': '#10b981',
      'dosimetry-principles': '#10b981',
      'clinical-dose-significance': '#ec4899', // Pink - clinical practice
      'treatment-planning': '#ec4899',
      'radiation-safety': '#f59e0b', // Amber - radiation protection
      'alara-principle': '#f59e0b',
      'general': '#6b7280', // Gray - general
    };
    
    return conceptDomains[conceptId] || '#8b5cf6'; // Default to purple
  };

  return (
    <div className="fixed inset-0 bg-black p-4 flex flex-col items-center justify-center overflow-auto">
      {/* Starfield background - simplified with inline styles */}
      <div 
        className="fixed inset-0 z-0" 
        style={{
          background: '#000',
          backgroundImage: 'radial-gradient(2px 2px at 20px 30px, #fff, rgba(0,0,0,0)), radial-gradient(2px 2px at 40px 70px, #fff, rgba(0,0,0,0)), radial-gradient(1px 1px at 90px 40px, #fff, rgba(0,0,0,0))',
          backgroundSize: '200px 200px',
          opacity: 0.7
        }}
      />
      
      {/* Emergency night phase indicator - always visible */}
      <div className="fixed top-0 left-0 m-4 bg-purple-800 text-white px-3 py-1 z-50 text-sm rounded">
        Night Phase - Day {currentDay}
      </div>
      
      {/* Emergency continue button - always visible at bottom */}
      <div className="fixed bottom-8 right-8 z-50">
        <button
          className="px-6 py-3 bg-purple-700 hover:bg-purple-600 text-white font-medium rounded-lg shadow-lg"
          onClick={handleStartDay}
        >
          Continue to Day {currentDay + 1} →
        </button>
      </div>
      
      {/* Main content area */}
      <div className="relative z-10 w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-pixel text-white mb-2">Night at Hill Home</h1>
          <p className="text-blue-300 text-lg">Time to reflect on your knowledge</p>
        </div>
        
        {/* Main content grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Constellation card */}
          <div 
            className="col-span-3 bg-gray-900 border border-purple-800 rounded-lg p-6 flex flex-col items-center justify-center min-h-[180px] hover:bg-gray-800 transition cursor-pointer"
            onClick={() => setShowConstellation(true)}
          >
            <div className="text-4xl mb-3">✨</div>
            <h2 className="text-xl font-pixel text-white mb-1">Knowledge Constellation</h2>
            <p className="text-gray-400 text-sm text-center">
              Explore your growing understanding of medical physics
            </p>
            {newlyDiscovered.length > 0 && (
              <div className="mt-3 px-3 py-1 bg-purple-600 text-white text-sm animate-pulse rounded">
                {newlyDiscovered.length} new concept{newlyDiscovered.length !== 1 ? 's' : ''} discovered!
              </div>
            )}
          </div>
          
          {/* Inventory card */}
          <div 
            className="bg-gray-900 border border-blue-800 rounded-lg p-6 flex flex-col items-center justify-center min-h-[180px] hover:bg-gray-800 transition cursor-pointer"
            onClick={() => setShowInventory(true)}
          >
            <div className="text-4xl mb-3">🎒</div>
            <h2 className="text-lg font-pixel text-white mb-1">Inventory</h2>
            <div className="mt-2 px-3 py-1 bg-gray-700 text-white text-sm">
              {inventory.length} Items
            </div>
          </div>
          
          {/* Return to hospital card */}
          <div 
            className="col-span-2 bg-gray-900 border border-blue-800 rounded-lg p-6 flex flex-col items-center justify-center min-h-[180px] hover:bg-gray-800 transition cursor-pointer"
            onClick={handleStartDay}
          >
            <div className="text-4xl mb-3">🏥</div>
            <h2 className="text-xl font-pixel text-white mb-1">Return to Hospital</h2>
            <div className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm">
              Begin Day {currentDay + 1}
            </div>
          </div>
        </div>
        
        {/* Status area */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-pixel text-white">Player Status</h2>
            <div className="flex space-x-3">
              <span className="px-2 py-1 bg-red-600 text-white text-sm rounded">
                Health: {player.health}/{player.maxHealth}
              </span>
              <span className="px-2 py-1 bg-blue-600 text-white text-sm rounded">
                Insight: {player.insight}
              </span>
            </div>
          </div>
          
          <div className="mb-2">
            <div className="text-gray-400 mb-1 text-sm">Knowledge Mastery</div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-600" 
                style={{ width: `${totalMastery}%` }}
              />
            </div>
          </div>
          
          <div className="text-xs text-gray-400 flex justify-between">
            <span>Clinical: {domainMastery['clinical-practice'] || 0}%</span>
            <span>Technical: {domainMastery['quality-assurance'] || 0}%</span>
            <span>Theory: {domainMastery['theoretical'] || 0}%</span>
          </div>
        </div>
      </div>
      
      {/* Insight transfer effect */}
      {hasStartedInsightTransfer && !insightTransferred && pendingInsights.length > 0 && (
        <div className="fixed inset-0 z-20 pointer-events-none">
          <div className="absolute inset-0 bg-purple-900/10 animate-pulse" />
          {pendingInsights.map((insight, index) => (
            <div 
              key={`insight-${index}`}
              className="absolute w-2 h-2 rounded-full animate-float-up"
              style={{
                backgroundColor: getConceptColor(insight.conceptId),
                left: `${20 + Math.random() * 60}%`,
                top: `${70 + Math.random() * 20}%`,
                animationDelay: `${index * 0.2}s`,
                opacity: 0.8
              }}
            />
          ))}
        </div>
      )}
      
      {/* Inventory panel */}
      {showInventory && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-30">
          <div className="bg-gray-900 border border-blue-700 rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-pixel text-white">Inventory</h2>
              <button 
                className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded"
                onClick={() => setShowInventory(false)}
              >
                Close
              </button>
            </div>
            
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {inventory && inventory.length > 0 ? (
                inventory.map((item, index) => (
                  <div key={index} className="bg-gray-800 p-3 rounded">
                    <div className="flex justify-between">
                      <div className="font-medium text-white">{item.name}</div>
                      <div className="text-sm text-gray-400">{item.rarity}</div>
                    </div>
                    <div className="text-sm text-gray-300 mt-1">{item.description}</div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p>No items collected yet</p>
                  <p className="text-xs mt-2">Visit storage closets in the hospital to find equipment</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Constellation view */}
      {showConstellation && (
        <div className="fixed inset-0 bg-black/95 z-30">
          <ConstellationView
            nightMode={true}
            showLabels={true}
            interactive={true}
            activeNodes={newlyDiscovered}
            onClose={() => setShowConstellation(false)}
          />
        </div>
      )}
      
      {/* Debug info */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="fixed bottom-0 left-0 bg-black/80 text-white text-xs font-mono z-50 p-2 max-w-xs">
          <div>Phase: {gamePhase}</div>
          <div>Day: {currentDay}</div>
          <div>Insights: {pendingInsights.length}</div>
          <div>Transferred: {insightTransferred ? 'Yes' : 'No'}</div>
          <div>New Concepts: {newlyDiscovered.length}</div>
          <div>Renders: {renderCount}</div>
        </div>
      )}
      
      {/* Required CSS animations */}
      <style jsx>{`
        @keyframes float-up {
          0% { transform: translateY(0); opacity: 0.8; }
          100% { transform: translateY(-50vh); opacity: 0; }
        }
        
        .animate-float-up {
          animation: float-up 3s forwards ease-out;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
        
        .animate-pulse {
          animation: pulse 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}