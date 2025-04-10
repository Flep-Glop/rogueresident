'use client';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { useKnowledgeStore } from '../store/knowledgeStore';
import { PixelText, PixelButton } from './PixelThemeProvider';
import useGameStateMachine from '../core/statemachine/GameStateMachine';
import ConstellationView from './knowledge/ConstellationView';
import { useEventBus } from '../core/events/CentralEventBus';
import { GameEventType } from '../core/events/EventTypes';
import { usePrimitiveStoreValue, useStableStoreValue } from '../core/utils/storeHooks';

/**
 * HillHomeScene - Night phase component using Chamber Transition Pattern
 * 
 * Improved implementation with:
 * - Primitive value extraction
 * - DOM-based animations
 * - Stable reference callbacks
 * - Memoized derived values
 * - Clear separation of rendering and state transitions
 */
export default function HillHomeScene({ onComplete }) {
  // ======== STORE ACCESS WITH PRIMITIVE EXTRACTION ========
  
  // Extract primitives from game store
  const playerHealth = usePrimitiveStoreValue(useGameStore, state => state.player?.health, 100);
  const playerMaxHealth = usePrimitiveStoreValue(useGameStore, state => state.player?.maxHealth, 100);
  const playerInsight = usePrimitiveStoreValue(useGameStore, state => state.player?.insight, 0);
  const currentDay = usePrimitiveStoreValue(useGameStore, state => state.currentDay, 1);
  const inventoryLength = usePrimitiveStoreValue(useGameStore, state => state.inventory?.length, 0);
  
  // Stable complex objects with memoization
  const inventory = useStableStoreValue(useGameStore, state => state.inventory || []);
  
  // Function access with stable references
  const updateInsight = useStableStoreValue(
    useGameStore,
    state => state.updateInsight || ((amount) => console.warn("updateInsight not available"))
  );
  
  // Extract primitives from state machine
  const gamePhase = usePrimitiveStoreValue(
    useGameStateMachine,
    state => state.gamePhase,
    'night' // Default to night for this component
  );
  
  // Extract primitives from knowledge store
  const totalMastery = usePrimitiveStoreValue(useKnowledgeStore, state => state.totalMastery, 0);
  const newlyDiscoveredCount = usePrimitiveStoreValue(
    useKnowledgeStore, 
    state => state.newlyDiscovered?.length, 
    0
  );
  
  // Stable complex objects with memoization
  const pendingInsights = useStableStoreValue(
    useKnowledgeStore, 
    state => state.pendingInsights || []
  );
  
  const newlyDiscovered = useStableStoreValue(
    useKnowledgeStore, 
    state => state.newlyDiscovered || []
  );
  
  const domainMastery = useStableStoreValue(
    useKnowledgeStore,
    state => state.domainMastery || {}
  );
  
  // Function access with stable references
  const transferInsights = useStableStoreValue(
    useKnowledgeStore,
    state => state.transferInsights || (() => console.warn("transferInsights not available"))
  );
  
  const resetNewlyDiscovered = useStableStoreValue(
    useKnowledgeStore,
    state => state.resetNewlyDiscovered || (() => console.warn("resetNewlyDiscovered not available"))
  );
  
  // ======== LOCAL UI STATE ========
  // These are completely independent from game state
  const [showInventory, setShowInventory] = useState(false);
  const [showConstellation, setShowConstellation] = useState(false);
  const [insightTransferred, setInsightTransferred] = useState(false);
  const [hasStartedInsightTransfer, setHasStartedInsightTransfer] = useState(false);
  
  // ======== REFS FOR DOM MANIPULATION ========
  const mountedRef = useRef(true);
  const containerRef = useRef(null);
  const insightParticlesRef = useRef(null);
  const renderCountRef = useRef(0);
  
  // ======== DERIVED VALUES ========
  // Compute derived values from primitives
  const hasPendingInsights = useMemo(() => pendingInsights.length > 0, [pendingInsights.length]);
  const hasNewConcepts = useMemo(() => newlyDiscoveredCount > 0, [newlyDiscoveredCount]);
  const nextDayNumber = useMemo(() => currentDay + 1, [currentDay]);
  
  // ======== INSTRUMENTATION ========
  // Only used in development
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      renderCountRef.current += 1;
      console.log(`[HillHomeScene] Render #${renderCountRef.current}`);
      
      // Log critical debug info
      console.log('[HillHomeScene] Current game phase:', gamePhase);
      console.log('[HillHomeScene] Has pending insights:', pendingInsights.length);
      console.log('[HillHomeScene] Newly discovered concepts:', newlyDiscoveredCount);
    }
  });
  
  // ======== LIFECYCLE ========
  useEffect(() => {
    // Log when component mounts
    console.log('[HillHomeScene] Component mounted');
    mountedRef.current = true;
    
    // Dispatch night phase started event
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
      mountedRef.current = false;
      console.log('[HillHomeScene] Component unmounted');
    };
  }, []);
  
  // ======== INSIGHT TRANSFER EFFECT ========
  useEffect(() => {
    if (!mountedRef.current) return;
    
    // Only start transfer if we haven't already and we have insights to transfer
    if (!hasStartedInsightTransfer && !insightTransferred && hasPendingInsights) {
      console.log('[HillHomeScene] Starting insight transfer process');
      setHasStartedInsightTransfer(true);
      
      // Start the animation via DOM
      if (insightParticlesRef.current) {
        insightParticlesRef.current.classList.add('insight-transfer-active');
      }
      
      // Start transfer after a delay
      const timer = setTimeout(() => {
        if (!mountedRef.current) return;
        
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
          if (hasNewConcepts) {
            setTimeout(() => {
              if (mountedRef.current) {
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
    hasPendingInsights, 
    hasNewConcepts,
    pendingInsights, 
    updateInsight, 
    transferInsights
  ]);
  
  // ======== CLEANUP EFFECT ========
  useEffect(() => {
    return () => {
      // Reset newly discovered state when component unmounts
      if (hasNewConcepts) {
        try {
          console.log('[HillHomeScene] Resetting newly discovered on unmount');
          resetNewlyDiscovered();
        } catch (e) {
          console.warn('[HillHomeScene] Failed to reset newly discovered:', e);
        }
      }
    };
  }, [hasNewConcepts, resetNewlyDiscovered]);
  
  // ======== HANDLERS WITH STABLE REFERENCES ========
  // Use useCallback to ensure stable function references
  const handleStartDay = useCallback(() => {
    // Ensure insights are transferred
    if (!insightTransferred && hasPendingInsights) {
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
    if (hasNewConcepts) {
      resetNewlyDiscovered();
    }
    
    // Log button click
    console.log('[HillHomeScene] Starting next day (Day ' + nextDayNumber + ')');
    
    // Complete night phase
    onComplete();
  }, [
    insightTransferred,
    hasPendingInsights,
    hasNewConcepts,
    nextDayNumber,
    transferInsights,
    resetNewlyDiscovered,
    onComplete
  ]);
  
  const handleOpenConstellation = useCallback(() => {
    setShowConstellation(true);
  }, []);
  
  const handleCloseConstellation = useCallback(() => {
    setShowConstellation(false);
  }, []);
  
  const handleOpenInventory = useCallback(() => {
    setShowInventory(true);
  }, []);
  
  const handleCloseInventory = useCallback(() => {
    setShowInventory(false);
  }, []);
  
  // ======== HELPER FUNCTIONS ========
  // Memoize this to prevent recreation
  const getConceptColor = useMemo(() => (conceptId) => {
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
  }, []);

  // ======== RENDER FUNCTION ========
  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black p-4 flex flex-col items-center justify-center overflow-auto"
    >
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
          Continue to Day {nextDayNumber} →
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
            onClick={handleOpenConstellation}
          >
            <div className="text-4xl mb-3">✨</div>
            <h2 className="text-xl font-pixel text-white mb-1">Knowledge Constellation</h2>
            <p className="text-gray-400 text-sm text-center">
              Explore your growing understanding of medical physics
            </p>
            {hasNewConcepts && (
              <div className="mt-3 px-3 py-1 bg-purple-600 text-white text-sm animate-pulse rounded">
                {newlyDiscoveredCount} new concept{newlyDiscoveredCount !== 1 ? 's' : ''} discovered!
              </div>
            )}
          </div>
          
          {/* Inventory card */}
          <div 
            className="bg-gray-900 border border-blue-800 rounded-lg p-6 flex flex-col items-center justify-center min-h-[180px] hover:bg-gray-800 transition cursor-pointer"
            onClick={handleOpenInventory}
          >
            <div className="text-4xl mb-3">🎒</div>
            <h2 className="text-lg font-pixel text-white mb-1">Inventory</h2>
            <div className="mt-2 px-3 py-1 bg-gray-700 text-white text-sm">
              {inventoryLength} Items
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
              Begin Day {nextDayNumber}
            </div>
          </div>
        </div>
        
        {/* Status area */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-pixel text-white">Player Status</h2>
            <div className="flex space-x-3">
              <span className="px-2 py-1 bg-red-600 text-white text-sm rounded">
                Health: {playerHealth}/{playerMaxHealth}
              </span>
              <span className="px-2 py-1 bg-blue-600 text-white text-sm rounded">
                Insight: {playerInsight}
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
      
      {/* Insight transfer effect - now DOM-based for better performance */}
      <div 
        ref={insightParticlesRef}
        className={`fixed inset-0 z-20 pointer-events-none ${hasPendingInsights ? 'insight-particles-container' : ''}`}
      >
        {hasPendingInsights && pendingInsights.map((insight, index) => (
          <div 
            key={`insight-${index}`}
            className="insight-particle absolute w-2 h-2 rounded-full"
            style={{
              backgroundColor: getConceptColor(insight.conceptId),
              left: `${20 + Math.random() * 60}%`,
              top: `${70 + Math.random() * 20}%`,
              animationDelay: `${index * 0.2}s`,
            }}
          />
        ))}
      </div>
      
      {/* Inventory panel */}
      {showInventory && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-30">
          <div className="bg-gray-900 border border-blue-700 rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-pixel text-white">Inventory</h2>
              <button 
                className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded"
                onClick={handleCloseInventory}
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
            onClose={handleCloseConstellation}
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
          <div>New Concepts: {newlyDiscoveredCount}</div>
          <div>Renders: {renderCountRef.current}</div>
        </div>
      )}
      
      {/* Required CSS animations */}
      <style jsx>{`
        /* Particle animation */
        .insight-particles-container {
          opacity: 0;
          transition: opacity 0.3s ease-in;
        }
        
        .insight-transfer-active {
          opacity: 1;
          background-color: rgba(124, 58, 237, 0.05);
        }
        
        .insight-particle {
          opacity: 0;
          transform: translateY(0);
        }
        
        .insight-transfer-active .insight-particle {
          animation: float-up 3s forwards ease-out;
        }
        
        @keyframes float-up {
          0% { transform: translateY(0); opacity: 0.8; }
          100% { transform: translateY(-50vh); opacity: 0; }
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