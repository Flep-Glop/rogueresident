// app/components/vs/SimplifiedKapoorMap.tsx
'use client';
import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useGameEffects } from '../GameEffects';
import { useEventBus } from '../../core/events/CentralEventBus';
import { GameEventType } from '../../core/events/EventTypes';
import { useGameState } from '../../core/statemachine/GameStateMachine';

/**
 * SimplifiedKapoorMap
 * 
 * A focused map component that strips away complexity to spotlight the
 * critical path through Dr. Kapoor's calibration node. Designed specifically
 * for the vertical slice to validate the core gameplay loop.
 * 
 * Inspired by the navigation systems of Hades, where initial runs focus
 * player attention on critical path progression rather than exploration.
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
  const { playSound, flashScreen, createConnectionEffect } = useGameEffects();
  
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
      
      startGame({ 
        seed: 'vs-kapoor-calibration',
        forceVerticalSlice: true
      });
      
      // Log action
      useEventBus.getState().dispatch(
        GameEventType.UI_BUTTON_CLICKED,
        {
          componentId: 'simplifiedKapoorMap',
          action: 'initializeMap',
          metadata: { 
            instanceId,
            timestamp: Date.now() 
          }
        }
      );
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
        useEventBus.getState().dispatch(
          GameEventType.UI_BUTTON_CLICKED,
          {
            componentId: 'simplifiedKapoorMap',
            action: 'foundKapoorNode',
            metadata: { 
              nodeId: kapoorNode.id,
              nodeType: kapoorNode.type,
              timestamp: Date.now() 
            }
          }
        );
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
    }
  }, [map, kapoorNodeId]);
  
  // Auto-select the node once we have everything ready
  useEffect(() => {
    if (isMapReady && kapoorNodeId && !currentNodeId && !hasAutoSelected) {
      // Add slight delay for visual impact
      const timer = setTimeout(() => {
        console.log('🎯 Auto-selecting Kapoor node:', kapoorNodeId);
        setCurrentNode(kapoorNodeId);
        setHasAutoSelected(true);
        
        // Visual feedback
        if (playSound) playSound('node-select');
        if (flashScreen) flashScreen('blue');
        
        // Log action
        useEventBus.getState().dispatch(
          GameEventType.UI_BUTTON_CLICKED,
          {
            componentId: 'simplifiedKapoorMap',
            action: 'autoSelectNode',
            metadata: { 
              nodeId: kapoorNodeId,
              timestamp: Date.now() 
            }
          }
        );
      }, 1200);
      
      return () => clearTimeout(timer);
    }
  }, [isMapReady, kapoorNodeId, currentNodeId, hasAutoSelected, setCurrentNode, playSound, flashScreen]);
  
  // Play reveal effect once map is ready
  useEffect(() => {
    if (isMapReady && !revealEffectPlayed && mapContainerRef.current) {
      setRevealEffectPlayed(true);
      
      // Create particles for visual flair
      if (nodeRef.current) {
        const rect = nodeRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Emit particles from node
        for (let i = 0; i < 8; i++) {
          setTimeout(() => {
            if (createConnectionEffect) {
              const angle = (i / 8) * Math.PI * 2;
              const distance = 100;
              const endX = centerX + Math.cos(angle) * distance;
              const endY = centerY + Math.sin(angle) * distance;
              
              createConnectionEffect(centerX, centerY, endX, endY, {
                duration: 1200,
                color: 'rgba(59, 130, 246, 0.6)', // Blue
                width: 2
              });
            }
          }, i * 100);
        }
      }
    }
  }, [isMapReady, revealEffectPlayed, createConnectionEffect]);
  
  // Handle node click
  const handleNodeClick = () => {
    if (kapoorNodeId) {
      // Don't do anything if already selected
      if (currentNodeId === kapoorNodeId) return;
      
      // Update game state
      setCurrentNode(kapoorNodeId);
      
      // Visual and audio feedback
      if (playSound) playSound('node-select');
      if (flashScreen) flashScreen('blue');
      
      // Log event
      useEventBus.getState().dispatch(
        GameEventType.UI_BUTTON_CLICKED,
        {
          componentId: 'simplifiedKapoorMap',
          action: 'nodeClicked',
          metadata: { 
            nodeId: kapoorNodeId,
            timestamp: Date.now() 
          }
        }
      );
    }
  };
  
  // Handle end day button
  const handleEndDay = () => {
    if (completedNodeIds.length > 0) {
      // Visual and audio feedback
      if (playSound) playSound('click');
      
      // Trigger night phase transition
      completeDay();
      
      // Log event
      useEventBus.getState().dispatch(
        GameEventType.UI_BUTTON_CLICKED,
        {
          componentId: 'dayCompleteButton',
          action: 'click',
          metadata: { timestamp: Date.now() }
        }
      );
    } else {
      // Indicate that node completion is required
      if (playSound) playSound('error');
      if (flashScreen) flashScreen('red');
      
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