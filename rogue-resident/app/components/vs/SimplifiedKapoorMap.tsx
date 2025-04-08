// app/components/vs/SimplifiedKapoorMap.tsx
'use client';
import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '@/app/store/gameStore';
import { useEventBus } from '@/app/core/events/CentralEventBus';
import { GameEventType } from '@/app/core/events/EventTypes';
import { useGameState } from '@/app/core/statemachine/GameStateMachine';
import { useJournalStore } from '@/app/store/journalStore';

/**
 * Safe event dispatch helper - minimizes crashes from event system issues
 */
function safeEventDispatch(eventType: GameEventType, payload: any, source?: string) {
  try {
    useEventBus.getState().dispatch(eventType, payload, source || 'simplifiedKapoorMap');
  } catch (error) {
    console.error(`[SafeEventDispatch] Error dispatching ${eventType}:`, error);
  }
}

/**
 * SimplifiedKapoorMap
 * 
 * A focused map component that strips away complexity to spotlight the
 * critical path through Dr. Kapoor's calibration node. Designed specifically
 * for the vertical slice to validate the core gameplay loop.
 */
export default function SimplifiedKapoorMap() {
  const { 
    map, 
    currentNodeId, 
    setCurrentNode, 
    completedNodeIds, 
    startGame 
  } = useGameStore();
  
  const { completeDay } = useGameState();
  const journalStore = useJournalStore();
  
  const [kapoorNodeId, setKapoorNodeId] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  const [revealEffectPlayed, setRevealEffectPlayed] = useState(false);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const instanceId = useRef(`vs-map-${Date.now()}`).current;
  
  // Initialize map if needed
  useEffect(() => {
    if (!map) {
      console.log('🗺️ Initializing simplified Kapoor map...');
      
      try {
        startGame({ 
          seed: 'vs-kapoor-calibration',
          forceVerticalSlice: true
        });
        
        // Log map initialization
        try {
          safeEventDispatch(
            GameEventType.UI_BUTTON_CLICKED,
            {
              componentId: 'simplifiedKapoorMap',
              action: 'initializeMap',
              metadata: { 
                instanceId,
                timestamp: Date.now() 
              }
            },
            'SimplifiedKapoorMap.init'
          );
        } catch (eventError) {
          console.warn('[Map] Initialize event failed, continuing anyway:', eventError);
        }
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    } else {
      // Map exists, wait a bit then mark as ready
      const timer = setTimeout(() => {
        setIsMapReady(true);
        
        // Log map ready state
        console.log('🗺️ Map ready, nodes:', map.nodes.length);
        console.log('Seed:', map.seed);
        console.log('Start node:', map.startNodeId);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [map, startGame, instanceId]);
  
  // Find and set the Kapoor calibration node
  useEffect(() => {
    if (map && map.nodes && !kapoorNodeId) {
      try {
        // Look for the Kapoor calibration node
        const kapoorNode = map.nodes.find(node => 
          node.type === 'kapoorCalibration' || 
          (node.character === 'kapoor' && 
           (node.challengeContent === 'calibration' || node.type.includes('calibration')))
        );
        
        if (kapoorNode) {
          console.log('🔍 Found Kapoor calibration node:', kapoorNode.id);
          setKapoorNodeId(kapoorNode.id);
          
          // Log event
          try {
            safeEventDispatch(
              GameEventType.UI_BUTTON_CLICKED,
              {
                componentId: 'simplifiedKapoorMap',
                action: 'foundKapoorNode',
                metadata: { 
                  nodeId: kapoorNode.id,
                  nodeType: kapoorNode.type,
                  timestamp: Date.now() 
                }
              },
              'SimplifiedKapoorMap.findNode'
            );
          } catch (eventError) {
            console.warn('[Map] Found node event failed, continuing anyway:', eventError);
          }
        } else {
          console.warn('⚠️ Could not find Kapoor calibration node in map');
          
          // Try to find any usable node as fallback
          const fallbackNode = map.nodes.find(n => 
            n.character === 'kapoor' || n.type === 'entrance' || n.type === 'start'
          );
          
          if (fallbackNode) {
            console.log('🔄 Using fallback node:', fallbackNode.id);
            setKapoorNodeId(fallbackNode.id);
          } else if (map.nodes.length > 0) {
            // Last resort - use first node
            console.warn('⚠️ Using first available node as fallback');
            setKapoorNodeId(map.nodes[0].id);
          }
        }
      } catch (error) {
        console.error('Error finding Kapoor node:', error);
      }
    }
  }, [map, kapoorNodeId]);
  
  // Auto-select the node once we have everything ready
  useEffect(() => {
    if (isMapReady && kapoorNodeId && !currentNodeId && !hasAutoSelected) {
      // Add slight delay for visual impact
      const timer = setTimeout(() => {
        try {
          console.log('🎯 Auto-selecting Kapoor node:', kapoorNodeId);
          setCurrentNode(kapoorNodeId);
          setHasAutoSelected(true);
          
          // Log event
          try {
            safeEventDispatch(
              GameEventType.UI_BUTTON_CLICKED,
              {
                componentId: 'simplifiedKapoorMap',
                action: 'autoSelectNode',
                metadata: { 
                  nodeId: kapoorNodeId,
                  timestamp: Date.now() 
                }
              },
              'SimplifiedKapoorMap.autoSelect'
            );
          } catch (eventError) {
            console.warn('[Map] Auto-select event failed, continuing anyway:', eventError);
          }
        } catch (error) {
          console.error('Error auto-selecting node:', error);
        }
      }, 1200);
      
      return () => clearTimeout(timer);
    }
  }, [isMapReady, kapoorNodeId, currentNodeId, hasAutoSelected, setCurrentNode]);
  
  // Handle node click
  const handleNodeClick = () => {
    if (kapoorNodeId) {
      try {
        // Don't do anything if already selected
        if (currentNodeId === kapoorNodeId) return;
        
        // Update game state
        setCurrentNode(kapoorNodeId);
        
        // Log event
        try {
          safeEventDispatch(
            GameEventType.UI_BUTTON_CLICKED,
            {
              componentId: 'simplifiedKapoorMap',
              action: 'nodeClicked',
              metadata: { 
                nodeId: kapoorNodeId,
                timestamp: Date.now() 
              }
            },
            'SimplifiedKapoorMap.nodeClick'
          );
        } catch (eventError) {
          console.warn('[Map] Node click event failed, continuing anyway:', eventError);
        }
      } catch (error) {
        console.error('Error handling node click:', error);
      }
    }
  };
  
  // Emergency journal acquisition function
  const forceJournalAcquisition = () => {
    if (!journalStore.hasJournal) {
      try {
        console.log('⚠️ Forcing emergency journal acquisition');
        journalStore.initializeJournal('technical');
        
        // Log event
        try {
          safeEventDispatch(
            GameEventType.JOURNAL_ACQUIRED,
            {
              tier: 'technical',
              character: 'kapoor', 
              source: 'emergency_fallback',
              forced: true
            },
            'SimplifiedKapoorMap.emergencyJournal'
          );
        } catch (e) {
          console.error('Error logging emergency journal acquisition:', e);
        }
        
        return true;
      } catch (error) {
        console.error('Failed to force journal acquisition:', error);
        return false;
      }
    }
    return false; // No action needed
  };
  
  // Handle end day button with critical path protection
  const handleEndDay = () => {
    try {
      if (completedNodeIds.length > 0) {
        // Check if the journal was acquired and force if needed
        const journalSuccess = forceJournalAcquisition();
        if (journalSuccess) {
          console.log('🔄 Successfully forced journal acquisition before night phase');
        }
        
        // Trigger night phase transition
        completeDay();
        
        // Log event
        try {
          safeEventDispatch(
            GameEventType.UI_BUTTON_CLICKED,
            {
              componentId: 'dayCompleteButton',
              action: 'click',
              metadata: { timestamp: Date.now() }
            },
            'SimplifiedKapoorMap.endDay'
          );
        } catch (eventError) {
          console.warn('[Map] End day event failed, continuing anyway:', eventError);
        }
      } else {
        // Indicate that node completion is required
        // Visual feedback on button
        const button = document.querySelector('.end-day-button');
        if (button instanceof HTMLElement) {
          button.animate([
            { transform: 'translateX(-3px)' },
            { transform: 'translateX(3px)' },
            { transform: 'translateX(-3px)' },
            { transform: 'translateX(0)' }
          ], {
            duration: 300,
            easing: 'ease-in-out'
          });
        }
      }
    } catch (error) {
      console.error('Error handling end day:', error);
      
      // Resilient recovery - force day completion anyway
      try {
        console.warn('🔄 Attempting emergency day completion despite error');
        completeDay();
      } catch (fallbackError) {
        console.error('Critical fallback also failed:', fallbackError);
      }
    }
  };
  
  // Show a loading state while map initializes
  if (!isMapReady || !map) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl text-blue-300 mb-4">Initializing Calibration Session...</h1>
          <div className="w-48 h-2 bg-gray-800 mx-auto overflow-hidden rounded-full">
            <div className="h-full bg-blue-600 animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      ref={mapContainerRef}
      className="h-full w-full p-8 flex flex-col items-center justify-center bg-background starfield-bg relative"
      data-component="simplified-kapoor-map"
      data-instance-id={instanceId}
    >
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl text-white font-bold mb-4 glow-text-blue">
          LINAC Calibration Session
        </h1>
        <p className="text-xl text-blue-200">
          Begin your medical physics journey with Dr. Kapoor
        </p>
      </div>
      
      {/* Node visualization */}
      <div className="relative w-full max-w-md h-64 flex items-center justify-center">
        <div 
          ref={nodeRef}
          className={`w-80 h-36 relative cursor-pointer transition-all duration-300 transform hover:scale-105 ${currentNodeId ? 'opacity-75' : 'animate-pulse-slow'}`}
          onClick={handleNodeClick}
          style={{
            perspective: '800px'
          }}
        >
          {/* Node container with 3D effect */}
          <div className="absolute inset-0 overflow-hidden" 
            style={{ 
              background: 'rgba(10, 12, 16, 0.92)',
              borderLeft: '3px solid #3b82f6', // Blue border
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)',
              transform: 'rotateY(-5deg)'
            }}
          >
            {/* Highlight effect */}
            <div 
              className="absolute inset-0"
              style={{ 
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, transparent 50%, rgba(59, 130, 246, 0.05) 100%)',
                opacity: currentNodeId ? 0.5 : 0.8
              }}
            ></div>
          </div>
          
          {/* Character portrait */}
          <div 
            className="absolute left-0 bottom-0 transform -translate-x-1/4 translate-y-1/4 z-10"
            style={{ 
              width: '80px',
              height: '80px'
            }}
          >
            <div 
              className="w-full h-full rounded-full overflow-hidden border-2 border-blue-500 shadow-glow-blue"
            >
              <img 
                src="/characters/kapoor.png" 
                alt="Dr. Kapoor" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          
          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-center pl-20 pr-4">
            <h3 className="text-xl text-white font-medium mb-1">Dr. Kapoor</h3>
            <p className="text-sm text-gray-300 mb-2">Calibration Challenge</p>
            <div className="flex items-center text-xs">
              <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
              <span className="text-gray-400">Clinical Training</span>
              <span className="ml-auto text-blue-400">+10 Insight</span>
            </div>
          </div>
          
          {/* Pulse indicator */}
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-500 animate-ping"></div>
        </div>
      </div>
      
      {/* Emergency Journal Button */}
      {completedNodeIds.length > 0 && !journalStore.hasJournal && (
        <div className="mt-4">
          <button
            className="px-4 py-2 bg-green-600 text-white text-sm rounded animate-pulse"
            onClick={forceJournalAcquisition}
            title="Use only if journal acquisition failed during dialogue"
          >
            Acquire Journal (Emergency)
          </button>
        </div>
      )}
      
      {/* Complete Day Button */}
      <div className="mt-12">
        <button
          className={`end-day-button px-6 py-3 rounded-lg transition-all duration-300 ${
            completedNodeIds.length > 0 
              ? 'bg-blue-600 hover:bg-blue-500 text-white' 
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
          onClick={handleEndDay}
          disabled={completedNodeIds.length === 0}
          style={{
            boxShadow: completedNodeIds.length > 0 
              ? '0 0 15px rgba(59, 130, 246, 0.4)' 
              : 'none'
          }}
        >
          <span className="relative z-10 font-medium">Return to Hill Home</span>
        </button>
        {completedNodeIds.length === 0 && (
          <p className="text-center text-yellow-500 text-sm mt-2">
            Complete the calibration challenge first
          </p>
        )}
      </div>
      
      {/* Vertical slice indicator */}
      <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 text-sm rounded-md z-40">
        Vertical Slice Mode
      </div>
      
      {/* Debug info in development */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="fixed bottom-4 left-4 bg-black/70 text-white p-2 text-xs font-mono z-40 rounded">
          <div>Instance: {instanceId.slice(-6)}</div>
          <div>Map Nodes: {map?.nodes?.length || 0}</div>
          <div>Kapoor Node: {kapoorNodeId ? kapoorNodeId.slice(0, 10) + '...' : 'none'}</div>
          <div>Current Node: {currentNodeId ? currentNodeId.slice(0, 10) + '...' : 'none'}</div>
          <div>Completed: {completedNodeIds.length}</div>
          <div>Journal: {journalStore.hasJournal ? `${journalStore.currentUpgrade}` : 'none'}</div>
        </div>
      )}
      
      {/* Add styles for effects */}
      <style jsx>{`
        .glow-text-blue {
          text-shadow: 0 0 10px rgba(59, 130, 246, 0.6);
        }
        
        .shadow-glow-blue {
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.5);
        }
        
        @keyframes pulseSlow {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
        
        .animate-pulse-slow {
          animation: pulseSlow 3s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}