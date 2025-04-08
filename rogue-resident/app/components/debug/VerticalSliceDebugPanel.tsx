// app/components/debug/VerticalSliceDebugPanel.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useDialogueStateMachine } from '../../core/dialogue/DialogueStateMachine';
import { useJournalStore } from '../../store/journalStore';
import { useGameState } from '../../core/statemachine/GameStateMachine';
import { useEventBus } from '../../core/events/CentralEventBus';
import { useKnowledgeStore } from '../../store/knowledgeStore';
import { GameEventType } from '../../core/events/EventTypes';

/**
 * Enhanced Vertical Slice Debug Panel
 * 
 * A powerful debug panel with QoL features for testing and development:
 * - Collapsible sections for better organization
 * - Copy to clipboard functionality for sharing state
 * - Visual timeline of critical events
 * - State visualization with visual indicators of health
 * - Direct state manipulations for faster testing
 */
export default function VerticalSliceDebugPanel() {
  // Panel UI state
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
  
  // Ref for auto-scrolling event log
  const eventsEndRef = useRef<HTMLDivElement>(null);
  
  // Game state from core systems
  const gameState = useGameState();
  const dialogueState = useDialogueStateMachine();
  const gameStore = useGameStore();
  const journalStore = useJournalStore();
  const knowledgeStore = useKnowledgeStore();
  
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
        addConsoleMessage(`🔑 Critical path: ${event.payload.criticalStateId}`);
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
        addConsoleMessage(`📓 Journal acquired: ${event.payload.tier} (from ${event.payload.character})`);
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
        addConsoleMessage(`🔄 Phase change: ${event.payload.from} → ${event.payload.to}`);
      }
    );
    
    const unsubKnowledgeEvents = eventBus.subscribe(
      GameEventType.KNOWLEDGE_GAINED,
      (event) => {
        addConsoleMessage(`✨ Knowledge gained: ${event.payload.conceptId} +${event.payload.amount}%`);
      }
    );
    
    // Clean up subscriptions
    return () => {
      unsubDialogueEvents();
      unsubJournalEvents();
      unsubPhaseEvents();
      unsubKnowledgeEvents();
    };
  }, []);
  
  // Auto-scroll event log
  useEffect(() => {
    if (eventsEndRef.current) {
      eventsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleOutput]);
  
  // Helper to add console messages
  const addConsoleMessage = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleOutput(prev => {
      const newOutput = [...prev, `[${timestamp}] ${message}`];
      // Keep only the latest 100 messages
      if (newOutput.length > 100) {
        return newOutput.slice(-100);
      }
      return newOutput;
    });
  };
  
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
  
  // Generate state summary for clipboard
  const generateStateSummary = () => {
    const summary = {
      gameState: {
        phase: gameState.gamePhase,
        day: gameState.currentDay,
        currentNodeId: gameStore.currentNodeId,
        completedNodes: gameStore.completedNodeIds,
        player: gameStore.player
      },
      journalState: {
        acquired: journalStore.hasJournal,
        tier: journalStore.currentUpgrade,
        entryCount: journalStore.entries?.length
      },
      dialogueState: {
        active: dialogueState.isActive,
        currentNodeId: dialogueState.currentNodeId
      },
      knowledgeState: {
        totalMastery: knowledgeStore.totalMastery,
        discoveredNodes: knowledgeStore.nodes.filter(n => n.discovered).length,
        totalNodes: knowledgeStore.nodes.length,
        connections: knowledgeStore.connections.length
      },
      criticalPath: {
        progress: `${criticalPathSteps.filter(step => step.isComplete).length}/${criticalPathSteps.length}`,
        percentage: completionPercentage.toFixed(0) + '%',
        missingSteps: criticalPathSteps.filter(step => !step.isComplete).map(step => step.id)
      },
      environment: {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
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
      
      addConsoleMessage('🔧 DEBUG: Forced journal acquisition');
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
      
      addConsoleMessage('🔧 DEBUG: Forced night phase transition');
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
      
      addConsoleMessage('🔧 DEBUG: Forced new day transition');
    }
  };
  
  const resetGame = () => {
    localStorage.removeItem('rogue-resident-game');
    localStorage.removeItem('rogue-resident-journal');
    localStorage.removeItem('rogue-resident-knowledge');
    window.location.reload();
  };
  
  const forceKnowledgeGain = () => {
    // Award some knowledge to radiation-dosimetry concept
    knowledgeStore.updateMastery('radiation-dosimetry', 15);
    knowledgeStore.discoverConcept('radiation-dosimetry');
    
    // Log action
    addConsoleMessage('🔧 DEBUG: Added 15% mastery to radiation-dosimetry');
  };
  
  // Toggle section visibility
  const toggleSection = (section: keyof typeof sections) => {
    setSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  return (
    <div
      className="fixed top-1/2 right-0 transform -translate-y-1/2 bg-gray-900/90 text-white z-50 rounded-l-lg shadow-xl overflow-hidden transition-all duration-300"
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
                        gameState.gamePhase === 'day' ? 'rgba(59, 130, 246, 0.5)' : 
                        gameState.gamePhase === 'night' ? 'rgba(124, 58, 237, 0.5)' :
                        'rgba(209, 213, 219, 0.2)'
                    }}>
                      {gameState.gamePhase}
                    </div>
                  </div>
                  
                  {sections.playerState && (
                    <div className="mt-2 text-xs space-y-1 bg-gray-900 p-2 rounded">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Current Day:</span>
                        <span>{gameState.currentDay}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Player Health:</span>
                        <span>{gameStore.player.health}/{gameStore.player.maxHealth}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Insight:</span>
                        <span>{gameStore.player.insight}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Selected Node:</span>
                        <span className="truncate max-w-[160px]">{gameStore.currentNodeId || 'none'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Completed Nodes:</span>
                        <span>{gameStore.completedNodeIds.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Inventory Items:</span>
                        <span>{gameStore.inventory.length}</span>
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
                      backgroundColor: journalStore.hasJournal ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'
                    }}>
                      {journalStore.hasJournal ? 'Acquired' : 'Missing'}
                    </div>
                  </div>
                  
                  {sections.journalState && journalStore.hasJournal && (
                    <div className="mt-2 text-xs space-y-1 bg-gray-900 p-2 rounded">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Journal Tier:</span>
                        <span>{journalStore.currentUpgrade}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Entries:</span>
                        <span>{journalStore.entries?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Opened:</span>
                        <span>{journalStore.isOpen ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Current Page:</span>
                        <span>{journalStore.currentPage}</span>
                      </div>
                      {journalStore.hasKapoorReferenceSheets && (
                        <div className="text-green-400">Has Kapoor reference sheets</div>
                      )}
                      {journalStore.hasKapoorAnnotatedNotes && (
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
                      {knowledgeStore.totalMastery}% Mastery
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Discovered:</span>
                      <span>{knowledgeStore.nodes.filter(n => n.discovered).length}/{knowledgeStore.nodes.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Connections:</span>
                      <span>{knowledgeStore.connections.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Newly Discovered:</span>
                      <span>{knowledgeStore.newlyDiscovered.length}</span>
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
                      backgroundColor: dialogueState.isActive ? 'rgba(16, 185, 129, 0.5)' : 'rgba(209, 213, 219, 0.2)'
                    }}>
                      {dialogueState.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  
                  {sections.dialogueState && dialogueState.isActive && (
                    <div className="mt-2 text-xs space-y-1 bg-gray-900 p-2 rounded">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Current Node:</span>
                        <span className="truncate max-w-[160px]">{dialogueState.currentNodeId || 'unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Flow ID:</span>
                        <span className="truncate max-w-[160px]">
                          {dialogueState.activeFlow?.id || 'unknown'}
                        </span>
                      </div>
                      {dialogueState.selectedOption && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Selected Option:</span>
                          <span>{dialogueState.selectedOption.id}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-400">Showing Response:</span>
                        <span>{dialogueState.showResponse ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Showing Backstory:</span>
                        <span>{dialogueState.showBackstory ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Domain mastery details */}
                <div className="px-3 py-2 bg-gray-800 mb-3 rounded">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm font-medium">Domain Mastery</div>
                    <div className="px-2 py-0.5 text-xs bg-purple-500/50 rounded">
                      {knowledgeStore.totalMastery}%
                    </div>
                  </div>
                  
                  {/* Domain bars */}
                  {Object.entries(knowledgeStore.domainMastery).map(([domain, mastery]) => (
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
                      <span>{checkLocalStorage('rogue-resident-game')}</span>
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
                        className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-500"
                        onClick={forceKnowledgeGain}
                      >
                        Add Knowledge
                      </button>
                      
                      <button 
                        className="px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-500"
                        onClick={() => gameStore.updateInsight(10)}
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
                        if (!journalStore.hasJournal) {
                          journalStore.initializeJournal('technical');
                        }
                        
                        // Ensure a node is completed
                        if (gameStore.completedNodeIds.length === 0 && kapoorNodeId) {
                          gameStore.completeNode(kapoorNodeId);
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
                        console.log('%c🔍 Debug Tools', 'font-size: 14px; font-weight: bold; color: #3b82f6;');
                        console.log('Game State:', gameStore);
                        console.log('Journal State:', journalStore);
                        console.log('Knowledge State:', knowledgeStore);
                        console.log('Dialogue State:', dialogueState);
                        
                        addConsoleMessage('🔍 Dumped state objects to browser console');
                      }}
                    >
                      Dump State to Console
                    </button>
                    
                    <button 
                      className="w-full px-2 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600 text-left"
                      onClick={() => {
                        // Check if recovery functions are available
                        if (typeof window.__PROGRESSION_RESOLVER__ !== 'undefined') {
                          try {
                            const result = window.__PROGRESSION_RESOLVER__.validateDayToNightTransition();
                            addConsoleMessage(`🔧 Progression validation: ${result ? 'Passed' : 'Failed'}`);
                          } catch (e) {
                            addConsoleMessage(`❌ Error in progression validation: ${e}`);
                          }
                        } else {
                          addConsoleMessage('❌ Progression resolver not available');
                        }
                      }}
                    >
                      Validate Progression State
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

// Helper function to determine domain color
function getDomainColor(domain: string): string {
  const domainColors: Record<string, string> = {
    'radiation-physics': '#3b82f6', // blue
    'quality-assurance': '#10b981', // green
    'clinical-practice': '#ec4899', // pink
    'radiation-protection': '#f59e0b', // amber
    'technical': '#6366f1', // indigo
    'theoretical': '#8b5cf6', // violet
    'general': '#6b7280', // gray
  };
  
  return domainColors[domain] || '#6b7280';
}

// Helper to check if a specific item exists in localStorage
function checkLocalStorage(key: string): string {
  try {
    const item = localStorage.getItem(key);
    return item ? `${Math.round(item.length / 1024)}KB` : 'Not found';
  } catch (e) {
    return 'Error';
  }
}

// Type definition for KnowledgeDomain
type KnowledgeDomain = 
  | 'radiation-physics'
  | 'quality-assurance'
  | 'clinical-practice'
  | 'radiation-protection'
  | 'technical'
  | 'theoretical'
  | 'general';