// app/components/debug/VerticalSliceDebugPanel.tsx
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { shallow } from 'zustand/shallow';
import { useGameStore } from '../../store/gameStore';
import { useDialogueStateMachine } from '../../core/dialogue/DialogueStateMachine';
import { useJournalStore } from '../../store/journalStore';
import { useGameState } from '../../core/statemachine/GameStateMachine';
import { useEventBus } from '../../core/events/CentralEventBus';
import { useKnowledgeStore, KnowledgeDomain } from '../../store/knowledgeStore';
import { GameEventType } from '../../core/events/EventTypes';
import { getDomainColor } from '../../core/themeConstants';

// Custom hook for stable primitive value extraction
function usePrimitiveValue<T, V>(
  useStore: () => T,
  selector: (state: T) => V,
  defaultValue: V
): V {
  return useStore(useCallback(state => selector(state), [])) ?? defaultValue;
}

// Helper to check local storage safely
function checkLocalStorage(key: string): string {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return 'Unavailable';
  }
  try {
    const item = localStorage.getItem(key);
    if (item !== null) {
      const sizeKB = Math.round(item.length / 1024);
      return `${sizeKB} KB`;
    } else {
      return 'Not found';
    }
  } catch (e) {
    console.error(`Error accessing localStorage key "${key}":`, e);
    return 'Error';
  }
}

/**
 * Enhanced Vertical Slice Debug Panel
 *
 * A powerful debug panel with QoL features for testing and development:
 * - Collapsible sections for better organization
 * - Copy to clipboard functionality for sharing state
 * - Visual timeline of critical events
 * - State visualization with visual indicators of health
 * - Direct state manipulations for faster testing
 * 
 * ARCHITECTURE NOTES:
 * - Uses primitive selectors to avoid reference instability
 * - Batches state reads using shallow comparison
 * - Separates UI state from game state
 * - Uses refs for DOM manipulations rather than state when possible
 */
export default function VerticalSliceDebugPanel() {
  // ==========================================
  // LOCAL UI STATE - Completely separate from game state
  // ==========================================
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'state' | 'tools'>('overview');
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [criticalEvents, setCriticalEvents] = useState<Array<{event: string, timestamp: number}>>([]);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);

  // Visibility toggles for sections
  const [sections, setSections] = useState({
    criticalPath: true,
    playerState: true,
    journalState: true,
    dialogueState: true,
    events: true,
    tools: true
  });

  // Refs for DOM operations
  const eventsEndRef = useRef<HTMLDivElement>(null);
  
  // ==========================================
  // STABLE PRIMITIVE SELECTORS - Extract only what we need
  // ==========================================
  
  // Game state - extract primitives directly
  const gamePhase = usePrimitiveValue(useGameState, state => state.gamePhase, 'day');
  const gameStateValue = usePrimitiveValue(useGameState, state => state.gameState, 'not_started');
  const currentDay = usePrimitiveValue(useGameState, state => state.currentDay, 1);
  const completedNodeIds = useGameState(useCallback(state => state.completedNodeIds, []), shallow);
  const isTransitioning = usePrimitiveValue(useGameState, state => state.isTransitioning, false);
  
  // Game store - extract primitives directly
  const currentNodeId = usePrimitiveValue(useGameStore, state => state.currentNodeId, null);
  const inventoryLength = usePrimitiveValue(useGameStore, state => state.inventory?.length, 0);
  
  // Player stats - extract primitives directly
  const playerStats = useGameStore(
    useCallback(state => ({
      health: state.player?.health ?? 100,
      maxHealth: state.player?.maxHealth ?? 100,
      insight: state.player?.insight ?? 0,
      momentum: state.player?.momentum ?? 0,
      maxMomentum: state.player?.maxMomentum ?? 3
    }), []),
    shallow
  );
  
  // Journal store
  const journalStats = useJournalStore(
    useCallback(state => ({
      hasJournal: state.hasJournal,
      currentUpgrade: state.currentUpgrade,
      entriesLength: state.entries?.length ?? 0,
      isOpen: state.isOpen,
      currentPage: state.currentPage,
      hasKapoorReferenceSheets: state.hasKapoorReferenceSheets,
      hasKapoorAnnotatedNotes: state.hasKapoorAnnotatedNotes
    }), []),
    shallow
  );
  
  // Dialogue state machine
  const dialogueStats = useDialogueStateMachine(
    useCallback(state => ({
      isActive: state.isActive,
      currentNodeId: state.currentNodeId,
      activeFlowId: state.activeFlow?.id ?? 'unknown',
      selectedOptionId: state.selectedOption?.id,
      showResponse: state.showResponse,
      showBackstory: state.showBackstory
    }), []),
    shallow
  );
  
  // Knowledge store
  const knowledgeStats = useKnowledgeStore(
    useCallback(state => ({
      totalMastery: state.totalMastery,
      discoveredNodesCount: state.nodes.filter(n => n.discovered).length,
      totalNodesCount: state.nodes.length,
      connectionsCount: state.connections.length,
      newlyDiscoveredCount: state.newlyDiscovered.length
    }), []),
    shallow
  );
  
  const domainMastery = useKnowledgeStore(
    useCallback(state => state.domainMastery, []),
    shallow
  );
  
  // Stable async action handlers
  // These are memoized to avoid recreating functions on every render
  const forceGiveJournal = useCallback(() => {
    if (!journalStats.hasJournal) {
      useJournalStore.getState().initializeJournal('technical');
      addConsoleMessage('🔧 DEBUG: Forced journal acquisition');
    }
  }, [journalStats.hasJournal]);

  const forceNightPhase = useCallback(() => {
    if (gamePhase === 'day') {
      useGameState.getState().beginDayCompletion();
      addConsoleMessage('🔧 DEBUG: Initiated day completion');
    }
  }, [gamePhase]);

  const forceNewDay = useCallback(() => {
    if (gamePhase === 'night') {
      useGameState.getState().beginNightCompletion();
      addConsoleMessage('🔧 DEBUG: Initiated night completion');
    }
  }, [gamePhase]);
  
  const resetGame = useCallback(() => {
    try {
      localStorage.removeItem('rogue-resident-game-v2');
      localStorage.removeItem('rogue-resident-journal');
      localStorage.removeItem('rogue-resident-knowledge');
      
      if ((window as any).__GAME_STATE_MACHINE_DEBUG__) {
          (window as any).__GAME_STATE_MACHINE_DEBUG__.reset();
      }
      window.location.reload();
    } catch (e) {
        console.error("Error resetting game:", e);
        addConsoleMessage('❌ Error resetting game state.');
    }
  }, []);

  const forceKnowledgeGain = useCallback(() => {
    try {
        const knowledgeStore = useKnowledgeStore.getState();
        knowledgeStore.updateMastery('radiation-dosimetry', 15);
        knowledgeStore.discoverConcept('radiation-dosimetry');
        addConsoleMessage('🔧 DEBUG: Added 15% mastery to radiation-dosimetry');
    } catch (e) {
        console.error("Error forcing knowledge gain:", e);
        addConsoleMessage('❌ Error adding knowledge.');
    }
  }, []);

  // Helper to add console messages - stable across renders
  const addConsoleMessage = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleOutput(prev => {
      const newOutput = [...prev, `[${timestamp}] ${message}`];
      // Keep only the latest 100 messages
      if (newOutput.length > 100) {
        return newOutput.slice(-100);
      }
      return newOutput;
    });
  }, []);

  // Critical path steps - computed from primitives
  const criticalPathSteps = [
    {
      id: 'game-initialized',
      label: 'Game Initialized',
      isComplete: gameStateValue === 'in_progress',
      details: gameStateValue === 'in_progress' 
        ? 'Game started successfully' 
        : 'Not initialized'
    },
    {
      id: 'calibration-node-selected',
      label: 'Calibration Node Selected',
      isComplete: !!currentNodeId && currentNodeId.includes('calibration'),
      details: currentNodeId || 'No node selected'
    },
    {
      id: 'dialogue-started',
      label: 'Dialogue Started',
      isComplete: dialogueStats.isActive,
      details: dialogueStats.isActive
        ? `Current State: ${dialogueStats.currentNodeId || 'unknown'}`
        : 'Not started'
    },
    {
      id: 'journal-acquired',
      label: 'Journal Acquired',
      isComplete: journalStats.hasJournal,
      details: journalStats.hasJournal
        ? `Journal Tier: ${journalStats.currentUpgrade}`
        : 'Not acquired'
    },
    {
      id: 'night-phase',
      label: 'Night Phase Transition',
      isComplete: gamePhase === 'night' || isTransitioning,
      details: `Current Phase: ${gamePhase}`
    },
    {
      id: 'new-day',
      label: 'New Day Started',
      isComplete: currentDay > 1,
      details: `Current Day: ${currentDay}`
    }
  ];

  // Get completion percentage for progress bar - derived value, not state
  const completionPercentage = criticalPathSteps.filter(step => step.isComplete).length /
                              criticalPathSteps.length * 100;

  // ==========================================
  // EFFECTS - Carefully controlled dependencies
  // ==========================================
  
  // Event subscription effect - runs only once
  useEffect(() => {
    const eventBus = useEventBus.getState();
    const subscriptions: (() => void)[] = [];

    // Subscribe to critical events - captures in one subscription call
    subscriptions.push(
      eventBus.subscribe(
        GameEventType.DIALOGUE_CRITICAL_PATH,
        (event) => {
          const payload = event.payload as any;
          setCriticalEvents(prev => [
            ...prev,
            {
              event: `Critical dialogue: ${payload?.stateId || 'unknown'}`,
              timestamp: Date.now()
            }
          ]);
          addConsoleMessage(`🔑 Critical path: ${payload?.stateId || 'unknown'}`);
        }
      )
    );

    // Other event subscriptions
    subscriptions.push(
      eventBus.subscribe(
        GameEventType.JOURNAL_ACQUIRED,
        (event) => {
          const payload = event.payload as any;
          setCriticalEvents(prev => [
            ...prev,
            {
              event: `Journal acquired: ${payload?.tier || 'unknown'}`,
              timestamp: Date.now()
            }
          ]);
          addConsoleMessage(`📓 Journal acquired: ${payload?.tier || 'unknown'} (from ${payload?.character || 'unknown'})`);
        }
      )
    );

    subscriptions.push(
      eventBus.subscribe(
        GameEventType.GAME_PHASE_CHANGED,
        (event) => {
          const payload = event.payload as any;
          setCriticalEvents(prev => [
            ...prev,
            {
              event: `Phase changed: ${payload?.from || '?'} → ${payload?.to || '?'}`,
              timestamp: Date.now()
            }
          ]);
          addConsoleMessage(`🔄 Phase change: ${payload?.from || '?'} → ${payload?.to || '?'}`);
        }
      )
    );

    subscriptions.push(
      eventBus.subscribe(
        GameEventType.KNOWLEDGE_GAINED,
        (event) => {
          const payload = event.payload as any;
          addConsoleMessage(`✨ Knowledge gained: ${payload?.conceptId || '?'} +${payload?.amount || '?'}%`);
        }
      )
    );

    // Clean up all subscriptions at once
    return () => {
      subscriptions.forEach(unsub => unsub());
    };
  }, []); // Empty dependency array ensures this runs only once

  // Auto-scroll event log - only runs when consoleOutput changes
  useEffect(() => {
    if (eventsEndRef.current) {
      eventsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleOutput]);

  // Only render in development
  if (process.env.NODE_ENV === 'production') return null;

  // Generate state summary for clipboard
  const generateStateSummary = () => {
    const summary = {
      gameState: {
        state: gameStateValue,
        phase: gamePhase,
        day: currentDay,
        currentNodeId: currentNodeId,
        completedNodes: completedNodeIds,
        player: {
          insight: playerStats.insight,
          momentum: playerStats.momentum,
          maxMomentum: playerStats.maxMomentum,
          // Add health only if it exists in the model
          ...(playerStats.health !== undefined && { 
            health: playerStats.health, 
            maxHealth: playerStats.maxHealth 
          })
        }
      },
      journalState: {
        acquired: journalStats.hasJournal,
        tier: journalStats.currentUpgrade,
        entryCount: journalStats.entriesLength
      },
      dialogueState: {
        active: dialogueStats.isActive,
        currentNodeId: dialogueStats.currentNodeId
      },
      knowledgeState: {
        totalMastery: knowledgeStats.totalMastery,
        discoveredNodes: knowledgeStats.discoveredNodesCount,
        totalNodes: knowledgeStats.totalNodesCount,
        connections: knowledgeStats.connectionsCount
      },
      criticalPath: {
        progress: `${criticalPathSteps.filter(step => step.isComplete).length}/${criticalPathSteps.length}`,
        percentage: completionPercentage.toFixed(0) + '%',
        missingSteps: criticalPathSteps.filter(step => !step.isComplete).map(step => step.id)
      },
      environment: {
        timestamp: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server'
      }
    };

    return JSON.stringify(summary, null, 2);
  };

  // Copy state summary to clipboard
  const copyStateSummary = () => {
    const summary = generateStateSummary();
    navigator.clipboard.writeText(summary);
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 2000);
    addConsoleMessage('📋 Copied state summary to clipboard');
  };

  // Toggle section visibility
  const toggleSection = (section: keyof typeof sections) => {
    setSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // ==========================================
  // RENDER - The actual component UI
  // ==========================================
  return (
    <div
      className="fixed top-1/2 right-0 transform -translate-y-1/2 bg-gray-900/90 text-white z-[10000] rounded-l-lg shadow-xl overflow-hidden transition-all duration-300"
      style={{
        width: isExpanded ? '350px' : '40px',
        height: isExpanded ? '550px' : '160px',
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
            <span className="font-semibold">Vertical Slice Debugger</span>
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
          {/* Tab navigation */}
          <div className="flex border-b border-gray-700">
            <button
              className={`px-4 py-1 ${activeTab === 'overview' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`px-4 py-1 ${activeTab === 'events' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
              onClick={() => setActiveTab('events')}
            >
              Events
            </button>
            <button
              className={`px-4 py-1 ${activeTab === 'state' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
              onClick={() => setActiveTab('state')}
            >
              State
            </button>
            <button
              className={`px-4 py-1 ${activeTab === 'tools' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
              onClick={() => setActiveTab('tools')}
            >
              Tools
            </button>
          </div>

          {/* Tab content container */}
          <div className="flex-grow overflow-y-auto">
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="p-3">
                {/* Progress overview */}
                <div
                  className="px-3 py-2 bg-gray-800 mb-4 rounded"
                  onClick={() => toggleSection('criticalPath')}
                >
                  <div className="flex justify-between items-center mb-1 cursor-pointer">
                    <div className="text-sm font-medium flex items-center">
                      <span className="mr-1">{sections.criticalPath ? '▼' : '►'}</span>
                      Critical Path Progress
                    </div>
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

                  {/* Critical path steps */}
                  {sections.criticalPath && (
                    <div className="space-y-2 mt-3">
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
                  )}
                </div>

                {/* Game state display */}
                <div
                  className="px-3 py-2 bg-gray-800 mb-3 rounded"
                  onClick={() => toggleSection('playerState')}
                >
                  <div className="flex justify-between items-center cursor-pointer">
                    <div className="text-sm font-medium flex items-center">
                      <span className="mr-1">{sections.playerState ? '▼' : '►'}</span>
                      Game State
                    </div>
                    <div className="px-2 py-0.5 text-xs rounded" style={{
                      backgroundColor:
                        gamePhase === 'day' ? 'rgba(59, 130, 246, 0.5)' :
                        gamePhase === 'night' ? 'rgba(124, 58, 237, 0.5)' :
                        'rgba(209, 213, 219, 0.2)'
                    }}>
                      {gamePhase}
                    </div>
                  </div>

                  {sections.playerState && (
                    <div className="mt-2 text-xs space-y-1 bg-gray-900 p-2 rounded">
                       <div className="flex justify-between">
                        <span className="text-gray-400">Game State:</span>
                        <span>{gameStateValue}</span>
                      </div>
                       <div className="flex justify-between">
                        <span className="text-gray-400">Current Day:</span>
                        <span>{currentDay}</span>
                      </div>
                      {/* Only show health if it exists in the player model */}
                      {playerStats.health !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Player Health:</span>
                          <span>{playerStats.health}/{playerStats.maxHealth}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-400">Insight:</span>
                        <span>{playerStats.insight}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Momentum:</span>
                        <span>{playerStats.momentum}/{playerStats.maxMomentum}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Selected Node:</span>
                        <span className="truncate max-w-[160px]">{currentNodeId || 'none'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Completed Nodes:</span>
                        <span>{completedNodeIds.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Inventory Items:</span>
                        <span>{inventoryLength}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Journal state section */}
                <div
                  className="px-3 py-2 bg-gray-800 mb-3 rounded"
                  onClick={() => toggleSection('journalState')}
                >
                  <div className="flex justify-between items-center cursor-pointer">
                    <div className="text-sm font-medium flex items-center">
                      <span className="mr-1">{sections.journalState ? '▼' : '►'}</span>
                      Journal State
                    </div>
                    <div className="px-2 py-0.5 text-xs rounded" style={{
                      backgroundColor: journalStats.hasJournal ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'
                    }}>
                      {journalStats.hasJournal ? 'Acquired' : 'Missing'}
                    </div>
                  </div>

                  {sections.journalState && journalStats.hasJournal && (
                    <div className="mt-2 text-xs space-y-1 bg-gray-900 p-2 rounded">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Journal Tier:</span>
                        <span>{journalStats.currentUpgrade}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Entries:</span>
                        <span>{journalStats.entriesLength}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Opened:</span>
                        <span>{journalStats.isOpen ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Current Page:</span>
                        <span>{journalStats.currentPage}</span>
                      </div>
                      {journalStats.hasKapoorReferenceSheets && (
                        <div className="text-green-400">Has Kapoor reference sheets</div>
                      )}
                      {journalStats.hasKapoorAnnotatedNotes && (
                        <div className="text-green-400">Has Kapoor annotated notes</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Knowledge state summary */}
                <div className="px-3 py-2 bg-gray-800 mb-3 rounded">
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium">Knowledge State</div>
                    <div className="px-2 py-0.5 text-xs bg-purple-500/50 rounded">
                      {knowledgeStats.totalMastery}% Mastery
                    </div>
                  </div>

                  <div className="mt-2 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Discovered:</span>
                      <span>{knowledgeStats.discoveredNodesCount}/{knowledgeStats.totalNodesCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Connections:</span>
                      <span>{knowledgeStats.connectionsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Newly Discovered:</span>
                      <span>{knowledgeStats.newlyDiscoveredCount}</span>
                    </div>
                  </div>
                </div>

                {/* Copy state button */}
                <button
                  className={`w-full py-2 px-3 rounded text-sm font-medium mb-3 ${
                    copiedFeedback
                      ? 'bg-green-500 text-white'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                  onClick={copyStateSummary}
                >
                  {copiedFeedback ? 'Copied to Clipboard!' : 'Copy State Summary'}
                </button>
              </div>
            )}

            {/* EVENTS TAB */}
            {activeTab === 'events' && (
              <div className="p-3">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-sm font-medium">Event Console</div>
                  <button
                    className="px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-xs rounded"
                    onClick={() => setConsoleOutput([])}
                  >
                    Clear
                  </button>
                </div>

                {/* Console output */}
                <div className="bg-gray-900 p-2 rounded text-xs font-mono h-[410px] overflow-y-auto mb-3">
                  {consoleOutput.length === 0 ? (
                    <div className="text-gray-500 italic">No events logged yet</div>
                  ) : (
                    consoleOutput.map((message, idx) => (
                      <div key={idx} className="mb-1 break-all">{message}</div>
                    ))
                  )}
                  <div ref={eventsEndRef} />
                </div>

                <div className="text-xs text-gray-400">
                  Recent critical events are logged here automatically.
                </div>
              </div>
            )}

            {/* STATE TAB */}
            {activeTab === 'state' && (
              <div className="p-3">
                <div className="text-sm font-medium mb-3">State Details</div>

                {/* Dialogue state */}
                <div
                  className="px-3 py-2 bg-gray-800 mb-3 rounded"
                  onClick={() => toggleSection('dialogueState')}
                >
                  <div className="flex justify-between items-center cursor-pointer">
                    <div className="text-sm font-medium flex items-center">
                      <span className="mr-1">{sections.dialogueState ? '▼' : '►'}</span>
                      Dialogue System
                    </div>
                    <div className="px-2 py-0.5 text-xs rounded" style={{
                      backgroundColor: dialogueStats.isActive ? 'rgba(16, 185, 129, 0.5)' : 'rgba(209, 213, 219, 0.2)'
                    }}>
                      {dialogueStats.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>

                  {sections.dialogueState && dialogueStats.isActive && (
                    <div className="mt-2 text-xs space-y-1 bg-gray-900 p-2 rounded">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Current State ID:</span>
                        <span className="truncate max-w-[160px]">{dialogueStats.currentNodeId || 'unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Flow ID:</span>
                        <span className="truncate max-w-[160px]">
                          {dialogueStats.activeFlowId}
                        </span>
                      </div>
                      {dialogueStats.selectedOptionId && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Selected Option:</span>
                          <span>{dialogueStats.selectedOptionId}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-400">Showing Response:</span>
                        <span>{dialogueStats.showResponse ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Showing Backstory:</span>
                        <span>{dialogueStats.showBackstory ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Domain mastery details */}
                <div className="px-3 py-2 bg-gray-800 mb-3 rounded">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm font-medium">Domain Mastery</div>
                    <div className="px-2 py-0.5 text-xs bg-purple-500/50 rounded">
                      {knowledgeStats.totalMastery}%
                    </div>
                  </div>

                  {/* Domain bars */}
                  {Object.entries(domainMastery).map(([domain, mastery]) => (
                    <div key={domain} className="mb-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>{domain}</span>
                        <span>{mastery}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${mastery}%`,
                            backgroundColor: getDomainColor(domain as KnowledgeDomain)
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Local storage info */}
                <div className="px-3 py-2 bg-gray-800 mb-3 rounded">
                  <div className="text-sm font-medium mb-2">Local Storage</div>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Game Store:</span>
                      <span>{checkLocalStorage('rogue-resident-game-v2')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Journal Store:</span>
                      <span>{checkLocalStorage('rogue-resident-journal')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Knowledge Store:</span>
                      <span>{checkLocalStorage('rogue-resident-knowledge')}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TOOLS TAB */}
            {activeTab === 'tools' && (
              <div className="p-3">
                <div className="text-sm font-medium mb-3">Debug Tools</div>

                {/* Debug actions */}
                <div
                  className="px-3 py-2 bg-gray-800 mb-3 rounded"
                  onClick={() => toggleSection('tools')}
                >
                  <div className="flex justify-between items-center cursor-pointer">
                    <div className="text-sm font-medium flex items-center">
                      <span className="mr-1">{sections.tools ? '▼' : '►'}</span>
                      Game Actions
                    </div>
                  </div>

                  {sections.tools && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <button
                        className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-500 disabled:opacity-50"
                        onClick={forceGiveJournal}
                        disabled={journalStats.hasJournal}
                      >
                        Give Journal
                      </button>

                      <button
                        className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-500 disabled:opacity-50"
                        onClick={forceNightPhase}
                        disabled={gamePhase !== 'day'}
                      >
                        Night Phase
                      </button>

                      <button
                        className="px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-500 disabled:opacity-50"
                        onClick={forceNewDay}
                        disabled={gamePhase !== 'night'}
                      >
                        New Day
                      </button>

                      <button
                        className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-500"
                        onClick={forceKnowledgeGain}
                      >
                        Add Knowledge
                      </button>

                      <button
                        className="px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-500"
                        onClick={() => useGameStore.getState().updateInsight(10)}
                      >
                        +10 Insight
                      </button>

                      <button
                        className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-500"
                        onClick={resetGame}
                      >
                        Reset Game
                      </button>
                    </div>
                  )}
                </div>

                {/* Advanced debugging tools */}
                <div className="px-3 py-2 bg-gray-800 mb-3 rounded">
                  <div className="text-sm font-medium mb-2">Advanced Tools</div>

                  <div className="space-y-2">
                    <button
                      className="w-full px-2 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600 text-left"
                      onClick={() => {
                        // Force a completion of all critical path steps
                        const journalStore = useJournalStore.getState();
                        const gameState = useGameState.getState();
                        
                        if (!journalStore.hasJournal) {
                          journalStore.initializeJournal('technical');
                        }

                        // Ensure a node is completed
                        const kapoorNodeId = 'calibration_node'; // Assuming this is the ID
                        if (gameState.completedNodeIds.length === 0 && kapoorNodeId) {
                           gameState.markNodeCompleted(kapoorNodeId);
                        }

                        addConsoleMessage('🔧 Force-completed critical path steps');
                      }}
                    >
                      Force Critical Path Completion
                    </button>

                    <button
                      className="w-full px-2 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600 text-left"
                      onClick={() => {
                        // Open the browser console
                        console.group('%c🔍 Debug State Dump', 'font-size: 14px; font-weight: bold; color: #3b82f6;');
                        console.log('Game State Machine:', useGameState.getState());
                        console.log('Game Store:', useGameStore.getState());
                        console.log('Journal Store:', useJournalStore.getState());
                        console.log('Knowledge Store:', useKnowledgeStore.getState());
                        console.log('Dialogue State Machine:', useDialogueStateMachine.getState());
                        console.groupEnd();

                        addConsoleMessage('🔍 Dumped state objects to browser console');
                      }}
                    >
                      Dump State to Console
                    </button>

                     <button
                      className="w-full px-2 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600 text-left"
                      onClick={() => {
                        // Check if recovery functions are available via window object
                         if (typeof window !== 'undefined' && (window as any).__GAME_STATE_MACHINE_DEBUG__) {
                          try {
                            const result = (window as any).__GAME_STATE_MACHINE_DEBUG__.checkForStuckTransitions();
                            addConsoleMessage(`🔧 Stuck transition check: ${result ? 'Recovery attempted' : 'No issues found'}`);
                          } catch (e) {
                            addConsoleMessage(`❌ Error checking for stuck transitions: ${e}`);
                          }
                        } else {
                          addConsoleMessage('❌ State machine debug tools not available');
                        }
                      }}
                    >
                      Check for Stuck Transitions
                    </button>
                  </div>
                </div>

                <div className="text-xs text-gray-400">
                  These tools directly modify game state and may cause unexpected behavior.
                  Use them only for debugging and testing.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}