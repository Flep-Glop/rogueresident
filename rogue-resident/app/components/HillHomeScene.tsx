// app/components/HillHomeScene.tsx
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { useKnowledgeStore } from '../store/knowledgeStore';
import { PixelText, PixelButton } from './PixelThemeProvider';
import { useGameState } from '../core/statemachine/GameStateMachine';
import ConstellationView from './knowledge/ConstellationView';
import { useEventBus } from '../core/events/CentralEventBus';
import { GameEventType } from '../core/events/EventTypes';

/**
 * HillHomeScene - Enhanced night phase component
 * 
 * This scene represents the player's hill home during the night phase,
 * with improved initialization and error handling to ensure consistent rendering.
 */
export default function HillHomeScene({ onComplete }: { onComplete: () => void }) {
  // Core game state
  const { 
    player, 
    completedNodeIds, 
    inventory, 
    currentDay,
    updateInsight
  } = useGameStore();
  
  const { gamePhase } = useGameState();
  
  // Knowledge state
  const { 
    pendingInsights, 
    totalMastery, 
    domainMastery,
    transferInsights,
    resetNewlyDiscovered,
    newlyDiscovered
  } = useKnowledgeStore();
  
  // Component state
  const [showInventory, setShowInventory] = useState(false);
  const [showConstellation, setShowConstellation] = useState(false);
  const [insightTransferred, setInsightTransferred] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [showTransferEffect, setShowTransferEffect] = useState(false);
  const [initializeStarted, setInitializeStarted] = useState(false);
  const [initializeComplete, setInitializeComplete] = useState(false);
  const [initialRender, setInitialRender] = useState(true);
  
  // Error handling state
  const [hasError, setHasError] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  
  // Render count for debugging
  const renderCount = useRef(0);
  
  // Track component mounted state for cleanup
  const componentMounted = useRef(true);
  const didResetNewlyDiscovered = useRef(false);
  const eventBus = useEventBus.getState();
  
  // Audio elements for night phase ambience (optional)
  const nightAmbienceRef = useRef<HTMLAudioElement | null>(null);
  const insightSoundRef = useRef<HTMLAudioElement | null>(null);
  
  // Memoize resetNewlyDiscovered to maintain reference stability
  const resetNewlyDiscoveredSafe = useCallback(() => {
    // Only reset if not already reset and component is still mounted
    if (componentMounted.current && !didResetNewlyDiscovered.current && newlyDiscovered.length > 0) {
      resetNewlyDiscovered();
      didResetNewlyDiscovered.current = true;
    }
  }, [resetNewlyDiscovered, newlyDiscovered]);
  
  // Track render count for debugging
  useEffect(() => {
    renderCount.current += 1;
    console.log(`[HillHomeScene] Render #${renderCount.current}`);
  });
  
  // Create and manage audio on mount
  useEffect(() => {
    // Initialize component
    if (!initializeStarted) {
      setInitializeStarted(true);
      
      // Log critical mount event with full state
      console.log('[HillHomeScene] MOUNTING - Game Phase:', gamePhase);
      console.log('[HillHomeScene] Pending insights:', pendingInsights);
      console.log('[HillHomeScene] Newly discovered:', newlyDiscovered);
      
      // Validate initialization state
      if (gamePhase !== 'night') {
        console.warn(`[HillHomeScene] Mounting with incorrect phase: ${gamePhase}, expected 'night'`);
        
        // Optionally attempt auto-repair through state machine
        try {
          if (typeof window !== 'undefined' && (window as any).__GAME_STATE_MACHINE_DEBUG__) {
            console.log('[HillHomeScene] Attempting to auto-repair game phase');
            (window as any).__GAME_STATE_MACHINE_DEBUG__.forceTransition('night', 'hill_home_auto_repair');
          }
        } catch (e) {
          console.error('[HillHomeScene] Auto-repair failed:', e);
        }
      }
      
      // Create audio elements if we want ambient audio
      try {
        nightAmbienceRef.current = new Audio('/audio/night_ambience.mp3');
        if (nightAmbienceRef.current) {
          nightAmbienceRef.current.volume = 0.3;
          nightAmbienceRef.current.loop = true;
        }
        
        insightSoundRef.current = new Audio('/audio/insight_transfer.mp3');
        if (insightSoundRef.current) {
          insightSoundRef.current.volume = 0.5;
        }
      } catch (e) {
        console.log('Audio creation failed, continuing without sound');
      }
      
      // Mark initialization as complete
      setInitializeComplete(true);
      
      // Log initialization success
      console.log('[HillHomeScene] Initialization complete');
    }
    
    return () => {
      // Clean up audio
      try {
        if (nightAmbienceRef.current) {
          nightAmbienceRef.current.pause();
          nightAmbienceRef.current = null;
        }
        if (insightSoundRef.current) {
          insightSoundRef.current.pause();
          insightSoundRef.current = null;
        }
      } catch (e) {
        console.log('Audio cleanup failed');
      }
    };
  }, [gamePhase, initializeStarted, pendingInsights]);
  
  // Play ambience when component mounts
  useEffect(() => {
    if (!initializeComplete) return;
    
    try {
      if (nightAmbienceRef.current) {
        nightAmbienceRef.current.play().catch(e => {
          console.log('Ambience playback failed, likely due to autoplay restrictions');
        });
      }
    } catch (e) {
      console.log('Playing ambience failed');
    }
  }, [initializeComplete]);
  
  // Fade in effect on mount
  useEffect(() => {
    if (!initializeComplete) return;
    
    // Set mounted state on mount
    componentMounted.current = true;
    didResetNewlyDiscovered.current = false;
    
    // Trigger fade-in effect
    setTimeout(() => {
      if (componentMounted.current) {
        setFadeIn(true);
        setInitialRender(false);
      }
    }, 100);
    
    // Log night phase started
    try {
      eventBus.dispatch(
        GameEventType.GAME_PHASE_CHANGED,
        {
          from: 'transition_to_night',
          to: 'night',
          reason: 'player_returned_home'
        },
        'HillHomeScene'
      );
    } catch (e) {
      console.log('Event dispatch failed, continuing');
    }
    
    // Cleanup function
    return () => {
      // Mark as unmounted first
      componentMounted.current = false;
    };
  }, [initializeComplete, eventBus]);
  
  // Automatically transfer insights after a delay
  useEffect(() => {
    if (!initializeComplete || initialRender) return;
    
    if (!insightTransferred && pendingInsights.length > 0) {
      // Wait 3 seconds then show transfer effect
      const transferTimer = setTimeout(() => {
        if (!componentMounted.current) return;
        
        try {
          setShowTransferEffect(true);
          
          // Play insight sound
          try {
            if (insightSoundRef.current) {
              insightSoundRef.current.play().catch(e => {
                console.log('Sound playback failed');
              });
            }
          } catch (e) {
            console.log('Playing sound failed');
          }
          
          // Calculate total insight gain
          const totalInsightGain = pendingInsights.reduce((total, insight) => {
            return total + insight.amount;
          }, 0);
          
          // Grant insight points
          updateInsight(totalInsightGain);
          
          // Wait 2 more seconds then complete the transfer
          setTimeout(() => {
            if (!componentMounted.current) return;
            
            try {
              transferInsights();
              setInsightTransferred(true);
              setShowTransferEffect(false);
              
              // Log insight transfer
              try {
                eventBus.dispatch(
                  GameEventType.KNOWLEDGE_TRANSFERRED,
                  {
                    conceptIds: pendingInsights.map(insight => insight.conceptId),
                    source: 'night_reflection',
                    successful: true
                  },
                  'HillHomeScene'
                );
              } catch (e) {
                console.log('Event dispatch failed, continuing');
              }
            } catch (error) {
              console.error('Error during insight transfer:', error);
              setHasError(true);
              setErrorDetails(`Failed to transfer insights: ${error}`);
            }
          }, 2000);
        } catch (error) {
          console.error('Error setting transfer effect:', error);
          setHasError(true);
          setErrorDetails(`Failed to show transfer effect: ${error}`);
          
          // Still attempt to transfer insights
          try {
            transferInsights();
            setInsightTransferred(true);
          } catch (fallbackError) {
            console.error('Even fallback transfer failed:', fallbackError);
          }
        }
      }, 3000);
      
      return () => {
        clearTimeout(transferTimer);
      };
    }
  }, [insightTransferred, pendingInsights, transferInsights, updateInsight, eventBus, initializeComplete, initialRender]);
  
  // Open constellation automatically after insights transfer
  useEffect(() => {
    if (!initializeComplete || initialRender) return;
    
    if (insightTransferred && !showConstellation && newlyDiscovered.length > 0) {
      // Wait 1 second then open constellation
      const constellationTimer = setTimeout(() => {
        if (componentMounted.current) {
          setShowConstellation(true);
        }
      }, 1000);
      
      return () => {
        clearTimeout(constellationTimer);
      };
    }
  }, [insightTransferred, showConstellation, newlyDiscovered, initializeComplete, initialRender]);

  // Handle starting the next day
  const handleStartDay = useCallback(() => {
    // Ensure insights are transferred first
    if (!insightTransferred && pendingInsights.length > 0) {
      try {
        transferInsights();
        setInsightTransferred(true);
        
        // Log forced insight transfer
        try {
          eventBus.dispatch(
            GameEventType.KNOWLEDGE_TRANSFERRED,
            {
              conceptIds: pendingInsights.map(insight => insight.conceptId),
              source: 'forced_before_day',
              successful: true
            },
            'HillHomeScene'
          );
        } catch (e) {
          console.log('Event dispatch failed, continuing');
        }
      } catch (error) {
        console.error('Error during forced insight transfer:', error);
      }
    }
    
    // Close constellation view if open
    setShowConstellation(false);
    
    // Reset newlyDiscovered on exit if needed
    if (newlyDiscovered.length > 0) {
      resetNewlyDiscoveredSafe();
    }
    
    // Log button click
    try {
      eventBus.dispatch(
        GameEventType.UI_BUTTON_CLICKED,
        {
          componentId: 'startDayButton',
          action: 'click',
          metadata: { currentDay }
        },
        'HillHomeScene'
      );
    } catch (error) {
      console.warn('Failed to log button click:', error);
    }
    
    // Call onComplete to transition to day phase
    onComplete();
  }, [
    insightTransferred, 
    pendingInsights, 
    transferInsights, 
    newlyDiscovered, 
    resetNewlyDiscoveredSafe, 
    onComplete, 
    eventBus,
    currentDay
  ]);
  
  // Error fallback UI
  if (hasError) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-black text-white">
        <div className="max-w-md text-center p-8">
          <h2 className="text-2xl mb-4 text-red-500">Error in Night Phase</h2>
          <div className="mb-8 p-4 bg-gray-900 rounded text-sm">
            {errorDetails || "An unknown error occurred in the night phase."}
          </div>
          <button
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded"
            onClick={handleStartDay}
          >
            Continue to Next Day
          </button>
        </div>
      </div>
    );
  }
  
  // Initial loading state
  if (!initializeComplete || initialRender) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <h2 className="text-2xl mb-4 text-blue-300">Preparing Night View...</h2>
          <div className="w-32 h-1 bg-blue-900 mx-auto overflow-hidden rounded-full">
            <div className="h-full bg-blue-500 animate-pulse-flow"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`h-full w-full bg-gradient-to-b from-black via-indigo-950 to-black flex flex-col items-center justify-center p-6 transition-opacity duration-1000 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* Stars background effect */}
      <div className="stars-bg fixed inset-0 z-0"></div>
      
      {/* Knowledge transfer effect overlay */}
      {showTransferEffect && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="absolute inset-0 bg-educational/10 animate-pulse"></div>
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
            ></div>
          ))}
        </div>
      )}
      
      {/* Header */}
      <div className="w-full max-w-4xl mb-8 text-center relative z-10">
        <PixelText className="text-3xl text-white font-pixel-heading mb-2">Night Phase</PixelText>
        <PixelText className="text-lg text-gray-400">
          Hillside Home - Study and Reflect
        </PixelText>
      </div>
      
      {/* Main interaction grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl mb-8 relative z-10">
        {/* Constellation button */}
        <div 
          className="p-8 col-span-3 bg-surface-dark pixel-borders flex flex-col items-center justify-center min-h-[200px] transition-all duration-300 hover:bg-surface cursor-pointer"
          onClick={() => setShowConstellation(true)}
        >
          <div className="text-4xl mb-4">🌠</div>
          <PixelText className="text-xl mb-2">Knowledge Constellation</PixelText>
          <PixelText className="text-sm text-text-secondary mb-2">
            View your growing understanding of medical physics
          </PixelText>
          {newlyDiscovered.length > 0 && (
            <div className="px-3 py-1 bg-educational text-white text-sm mt-2 animate-pulse">
              {newlyDiscovered.length} new concept{newlyDiscovered.length !== 1 ? 's' : ''} discovered
            </div>
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
        
        {/* Start day button */}
        <div 
          className="p-8 bg-surface-dark pixel-borders flex flex-col items-center justify-center min-h-[200px] transition-all duration-300 hover:bg-surface cursor-pointer col-span-2 group relative overflow-hidden"
          onClick={handleStartDay}
        >
          <div className="text-4xl mb-4">🏥</div>
          <PixelText className="text-xl mb-2">Return to Hospital</PixelText>
          <span className="px-3 py-1 bg-clinical text-white text-sm mt-2 group-hover:bg-clinical-light transition-colors">
            Begin Day {currentDay + 1}
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
              style={{ width: `${totalMastery}%` }}
            ></div>
          </div>
        </div>
        
        <div className="text-xs text-text-secondary flex justify-between">
          <span>Clinical: {domainMastery['clinical-practice'] || 0}%</span>
          <span>Technical: {domainMastery['quality-assurance'] || 0}%</span>
          <span>Theory: {domainMastery['theoretical'] || 0}%</span>
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
      
      {/* Constellation overlay */}
      {showConstellation && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
          <ConstellationView
            nightMode={true}
            showLabels={true}
            interactive={true}
            activeNodes={newlyDiscovered}
            onClose={() => {
              setShowConstellation(false);
              // Don't reset here - we'll let the user see newly discovered nodes until they leave
            }}
          />
        </div>
      )}
      
      {/* Debug information */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="fixed bottom-4 left-4 bg-black/80 text-white p-2 rounded text-xs font-mono z-50">
          <div>Game Phase: {gamePhase}</div>
          <div>Day: {currentDay}</div>
          <div>Initialize: {initializeComplete ? 'Complete' : 'Pending'}</div>
          <div>Transfer: {insightTransferred ? 'Complete' : 'Pending'}</div>
          <div>Insights: {pendingInsights.length}</div>
          <div>New Concepts: {newlyDiscovered.length}</div>
          <div>Renders: {renderCount.current}</div>
        </div>
      )}
      
      {/* CSS animations for insight transfer */}
      <style jsx>{`
        @keyframes floatUp {
          0% { 
            transform: translateY(0) scale(1);
            opacity: 0.8;
          }
          100% { 
            transform: translateY(-50vh) scale(0.5);
            opacity: 0;
          }
        }
        
        .animate-float-up {
          animation: floatUp 3s forwards ease-out;
        }
        
        @keyframes pulseFlow {
          0% { width: 0%; }
          50% { width: 100%; }
          100% { width: 0%; }
        }
        
        .animate-pulse-flow {
          animation: pulseFlow 2s ease-in-out infinite;
        }
        
        .stars-bg {
          background-image: radial-gradient(2px 2px at 20px 30px, #eee, rgba(0,0,0,0)),
                            radial-gradient(2px 2px at 40px 70px, #fff, rgba(0,0,0,0)),
                            radial-gradient(1px 1px at 90px 40px, #fff, rgba(0,0,0,0)),
                            radial-gradient(1px 1px at 130px 80px, #fff, rgba(0,0,0,0)),
                            radial-gradient(1px 1px at 160px 120px, #fff, rgba(0,0,0,0));
          background-repeat: repeat;
          background-size: 200px 200px;
        }
        
        .pixel-progress-bg {
          height: 8px;
          background-color: rgba(0, 0, 0, 0.3);
          width: 100%;
        }
      `}</style>
    </div>
  );
}

// Helper functions
function getConceptColor(conceptId: string): string {
  // Map concept to domain colors
  const conceptDomains: Record<string, string> = {
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
}