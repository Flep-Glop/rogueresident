// app/components/debug/VerticalSliceDebugPanel.tsx
'use client';
import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useDialogueStateMachine } from '../../core/dialogue/DialogueStateMachine';
import { useJournalStore } from '../../store/journalStore';
import { useGameState } from '../../core/statemachine/GameStateMachine';
import { useEventBus } from '../../core/events/CentralEventBus';
import { GameEventType } from '../../core/events/EventTypes';

/**
 * Vertical Slice Debug Panel
 * 
 * A focused debug panel for tracking the Dr. Kapoor calibration critical path.
 * Provides visual progression tracking and debug actions to force state transitions
 * when needed during development.
 */
export default function VerticalSliceDebugPanel() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [criticalEvents, setCriticalEvents] = useState<Array<{event: string, timestamp: number}>>([]);
  
  // Game state from core systems
  const gameState = useGameState();
  const dialogueState = useDialogueStateMachine();
  const gameStore = useGameStore();
  const journalStore = useJournalStore();
  
  // Track critical path events
  useEffect(() => {
    const eventBus = useEventBus.getState();
    
    // Subscribe to critical events
    const unsubDialogueEvents = eventBus.subscribe(
      GameEventType.DIALOGUE_CRITICAL_PATH,
      (event) => {
        setCriticalEvents(prev => [
          ...prev, 
          { 
            event: `Critical dialogue: ${event.payload.criticalStateId}`, 
            timestamp: Date.now() 
          }
        ]);
      }
    );
    
    const unsubJournalEvents = eventBus.subscribe(
      GameEventType.JOURNAL_ACQUIRED,
      (event) => {
        setCriticalEvents(prev => [
          ...prev, 
          { 
            event: `Journal acquired: ${event.payload.tier}`, 
            timestamp: Date.now() 
          }
        ]);
      }
    );
    
    const unsubPhaseEvents = eventBus.subscribe(
      GameEventType.GAME_PHASE_CHANGED,
      (event) => {
        setCriticalEvents(prev => [
          ...prev, 
          { 
            event: `Phase changed: ${event.payload.from} → ${event.payload.to}`, 
            timestamp: Date.now() 
          }
        ]);
      }
    );
    
    // Clean up subscriptions
    return () => {
      unsubDialogueEvents();
      unsubJournalEvents();
      unsubPhaseEvents();
    };
  }, []);
  
  // Critical path steps
  const criticalPathSteps = [
    {
      id: 'game-initialized',
      label: 'Game Initialized',
      isComplete: !!gameStore.map,
      details: gameStore.map ? `Map ID: ${gameStore.map.seed || 'unknown'}` : 'Not initialized'
    },
    {
      id: 'calibration-node-selected',
      label: 'Calibration Node Selected',
      isComplete: !!gameStore.currentNodeId && (
        gameStore.currentNodeId.includes('kapoor') || 
        gameStore.currentNodeId.includes('calibration')
      ),
      details: gameStore.currentNodeId || 'No node selected'
    },
    {
      id: 'dialogue-started',
      label: 'Dialogue Started',
      isComplete: dialogueState.isActive,
      details: dialogueState.isActive 
        ? `Current node: ${dialogueState.currentNodeId || 'unknown'}` 
        : 'Not started'
    },
    {
      id: 'journal-acquired',
      label: 'Journal Acquired',
      isComplete: journalStore.hasJournal,
      details: journalStore.hasJournal 
        ? `Journal Tier: ${journalStore.currentUpgrade}` 
        : 'Not acquired'
    },
    {
      id: 'night-phase',
      label: 'Night Phase Transition',
      isComplete: gameState.gamePhase === 'night' || gameState.gamePhase === 'transition_to_night',
      details: `Current Phase: ${gameState.gamePhase}`
    },
    {
      id: 'new-day',
      label: 'New Day Started',
      isComplete: gameState.currentDay > 1,
      details: `Current Day: ${gameState.currentDay}`
    }
  ];
  
  // Get completion percentage for progress bar
  const completionPercentage = criticalPathSteps.filter(step => step.isComplete).length / 
                              criticalPathSteps.length * 100;
  
  // Only render in development
  if (process.env.NODE_ENV === 'production') return null;
  
  // Force critical progression (for debugging)
  const forceGiveJournal = () => {
    if (!journalStore.hasJournal) {
      journalStore.initializeJournal('technical');
      
      // Log debug action
      useEventBus.getState().dispatch(
        GameEventType.UI_BUTTON_CLICKED,
        {
          componentId: 'vsDebugPanel',
          action: 'forceJournalAcquisition',
          metadata: { timestamp: Date.now() }
        }
      );
      
      setCriticalEvents(prev => [
        ...prev, 
        { event: 'DEBUG: Forced journal acquisition', timestamp: Date.now() }
      ]);
    }
  };
  
  const forceNightPhase = () => {
    if (gameState.gamePhase === 'day') {
      gameState.completeDay();
      
      // Log debug action
      useEventBus.getState().dispatch(
        GameEventType.UI_BUTTON_CLICKED,
        {
          componentId: 'vsDebugPanel',
          action: 'forceNightPhase',
          metadata: { timestamp: Date.now() }
        }
      );
      
      setCriticalEvents(prev => [
        ...prev, 
        { event: 'DEBUG: Forced night phase', timestamp: Date.now() }
      ]);
    }
  };
  
  const forceNewDay = () => {
    if (gameState.gamePhase === 'night') {
      gameState.completeNight();
      
      // Log debug action
      useEventBus.getState().dispatch(
        GameEventType.UI_BUTTON_CLICKED,
        {
          componentId: 'vsDebugPanel',
          action: 'forceNewDay',
          metadata: { timestamp: Date.now() }
        }
      );
      
      setCriticalEvents(prev => [
        ...prev, 
        { event: 'DEBUG: Forced new day', timestamp: Date.now() }
      ]);
    }
  };
  
  const resetGame = () => {
    localStorage.removeItem('rogue-resident-game');
    window.location.reload();
  };
  
  return (
    <div
      className="fixed top-1/2 right-0 transform -translate-y-1/2 bg-gray-900/90 text-white z-50 rounded-l-lg shadow-xl overflow-hidden transition-all duration-300"
      style={{
        width: isExpanded ? '300px' : '40px',
        height: isExpanded ? '460px' : '160px',
        maxHeight: '80vh'
      }}
    >
      {/* Header with toggle */}
      <div 
        className="py-2 px-3 bg-blue-600 flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <>
            <span className="font-semibold">Vertical Slice Debug</span>
            <span>×</span>
          </>
        ) : (
          <span 
            style={{ 
              writingMode: 'vertical-rl', 
              textOrientation: 'mixed',
              transform: 'rotate(180deg)',
              width: '100%',
              textAlign: 'center' 
            }}
          >
            VS Debug
          </span>
        )}
      </div>
      
      {/* Expanded content */}
      {isExpanded && (
        <div className="flex flex-col h-full">
          {/* Progress overview */}
          <div className="px-3 py-2 bg-gray-800">
            <div className="flex justify-between items-center mb-1">
              <div className="text-xs font-medium">Critical Path Progress</div>
              <div className="text-xs text-gray-400">
                {criticalPathSteps.filter(step => step.isComplete).length}/{criticalPathSteps.length}
              </div>
            </div>
            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
          </div>
          
          {/* Critical path steps */}
          <div className="p-3 flex-grow overflow-y-auto">
            <div className="space-y-2">
              {criticalPathSteps.map((step, index) => (
                <div key={step.id} className="relative">
                  {/* Step connection line */}
                  {index < criticalPathSteps.length - 1 && (
                    <div 
                      className="absolute left-[12px] top-[24px] w-[2px] h-[28px]"
                      style={{ 
                        backgroundColor: step.isComplete ? '#4ade80' : '#6b7280',
                        opacity: step.isComplete ? 1 : 0.5
                      }}
                    ></div>
                  )}
                  
                  {/* Step indicator */}
                  <div className="flex items-start">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                      style={{ 
                        backgroundColor: step.isComplete ? '#4ade80' : '#6b7280',
                        opacity: step.isComplete ? 1 : 0.5
                      }}
                    >
                      {step.isComplete ? '✓' : index + 1}
                    </div>
                    <div className="ml-3">
                      <div 
                        className="font-medium" 
                        style={{ 
                          color: step.isComplete ? '#4ade80' : '#d1d5db',
                          opacity: step.isComplete ? 1 : 0.8
                        }}
                      >
                        {step.label}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {step.details}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Event log */}
          <div className="border-t border-gray-700 p-2 max-h-[100px] overflow-y-auto bg-gray-800/50">
            <div className="text-xs font-medium mb-1">Critical Events</div>
            <div className="space-y-1">
              {criticalEvents.length === 0 ? (
                <div className="text-xs text-gray-500 italic">No events recorded yet</div>
              ) : (
                criticalEvents.slice(-5).map((event, idx) => (
                  <div key={idx} className="text-xs flex items-start">
                    <span className="text-blue-400 mr-1">[{new Date(event.timestamp).toLocaleTimeString()}]</span>
                    <span className="text-gray-300">{event.event}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Debug actions */}
          <div className="p-2 border-t border-gray-700 bg-gray-800/80">
            <div className="text-xs font-medium mb-2">Debug Actions</div>
            <div className="grid grid-cols-2 gap-2">
              <button 
                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-500"
                onClick={forceGiveJournal}
                disabled={journalStore.hasJournal}
              >
                Give Journal
              </button>
              
              <button 
                className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-500"
                onClick={forceNightPhase}
                disabled={gameState.gamePhase !== 'day'}
              >
                Night Phase
              </button>
              
              <button 
                className="px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-500"
                onClick={forceNewDay}
                disabled={gameState.gamePhase !== 'night'}
              >
                New Day
              </button>
              
              <button 
                className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-500"
                onClick={resetGame}
              >
                Reset Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}