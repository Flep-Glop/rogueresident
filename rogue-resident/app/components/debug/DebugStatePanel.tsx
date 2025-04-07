// app/components/debug/DebugStatePanel.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useChallengeStore } from '../../store/challengeStore';
import { useGameState } from '../../core/statemachine/GameStateMachine';
import { useEventBus } from '../../core/events/CentralEventBus';
import { GameEventType } from '../../core/events/EventTypes';
import { useDialogueStateMachine } from '../../core/dialogue/DialogueStateMachine';
import { useKnowledgeStore } from '../../store/knowledgeStore';
import { useJournalStore } from '../../store/journalStore';

/**
 * Debug State Panel
 * 
 * A floating, collapsible panel that displays the current state of all major systems.
 * Designed to be used during development to monitor state transitions and debug issues.
 */
export default function DebugStatePanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'state'|'events'|'entities'|'dialogue'>('state');
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [eventFilterType, setEventFilterType] = useState<string>('');
  const eventLogRef = useRef<HTMLDivElement>(null);
  
  // Game state from core systems
  const gameState = useGameState();
  const dialogueState = useDialogueStateMachine();
  const gameStore = useGameStore();
  const challengeStore = useChallengeStore();
  const knowledgeStore = useKnowledgeStore();
  const journalStore = useJournalStore();
  
  // Listen for events to display in log
  useEffect(() => {
    const unsubscribe = useEventBus.subscribe(
      GameEventType.UI_BUTTON_CLICKED,
      (event) => {
        setRecentEvents(prev => [...prev.slice(-49), {
          type: event.type,
          payload: event.payload,
          timestamp: event.timestamp
        }]);
      }
    );
    
    // Initial events fetch
    const initialEvents = useEventBus.getState().getEventHistory(undefined, 50);
    setRecentEvents(initialEvents);
    
    return () => unsubscribe();
  }, []);
  
  // Auto-scroll event log when new events arrive
  useEffect(() => {
    if (eventLogRef.current && activeTab === 'events') {
      eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
    }
  }, [recentEvents, activeTab]);
  
  // Only render in development
  if (process.env.NODE_ENV === 'production') return null;
  
  // Toggle panel visibility
  const togglePanel = () => setIsExpanded(prev => !prev);
  
  // Clear event log
  const clearEventLog = () => {
    setRecentEvents([]);
    useEventBus.getState().clearEventLog();
  };
  
  // Copy state to clipboard
  const copyStateToClipboard = () => {
    const state = {
      gameState: gameState,
      gameStore: {
        gameState: gameStore.gameState,
        gamePhase: gameStore.gamePhase,
        currentNodeId: gameStore.currentNodeId,
        player: gameStore.player,
        currentDay: gameStore.currentDay,
        completedNodeIds: gameStore.completedNodeIds,
      },
      challengeStore: {
        currentChallenge: challengeStore.currentChallenge
      },
      dialogueState: {
        isActive: dialogueState.isActive,
        currentNodeId: dialogueState.currentNodeId,
        selectedOption: dialogueState.selectedOption 
          ? { id: dialogueState.selectedOption.id, text: dialogueState.selectedOption.text }
          : null
      }
    };
    
    navigator.clipboard.writeText(JSON.stringify(state, null, 2));
  };

  // Component style
  const basePanelStyle = {
    position: 'fixed',
    bottom: isExpanded ? '0' : 'auto',
    right: '0',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    color: 'white',
    zIndex: 9999,
    fontFamily: 'monospace',
    fontSize: '12px',
    borderRadius: isExpanded ? '8px 0 0 0' : '8px 0 0 8px',
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
    maxHeight: isExpanded ? '80vh' : 'auto',
    maxWidth: isExpanded ? '500px' : 'auto',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
    transition: 'all 0.3s ease',
  };
  
  // Tab panel style
  const tabStyle = (isActive: boolean) => ({
    padding: '4px 8px',
    backgroundColor: isActive ? '#333' : 'transparent',
    cursor: 'pointer',
    borderBottom: isActive ? '2px solid #4f87ff' : 'none',
  });
  
  // Value display style
  const valueStyle = (value: any) => {
    if (value === null || value === undefined) {
      return { color: '#999' };
    }
    if (typeof value === 'number') {
      return { color: '#4f87ff' };
    }
    if (typeof value === 'boolean') {
      return { color: value ? '#4caf50' : '#f44336' };
    }
    if (typeof value === 'string') {
      return { color: '#ff9800' };
    }
    return {};
  };

  // Render event type badge with color coding
  const renderEventType = (type: string) => {
    const color = 
      type.includes('dialogue:') ? '#e91e63' :
      type.includes('challenge:') ? '#9c27b0' :
      type.includes('node:') ? '#2196f3' :
      type.includes('ui:') ? '#4caf50' :
      type.includes('map:') ? '#ff9800' :
      type.includes('state:') ? '#f44336' :
      '#999';
      
    return (
      <span style={{ 
        backgroundColor: color, 
        padding: '1px 4px', 
        borderRadius: '4px',
        fontSize: '10px'
      }}>
        {type}
      </span>
    );
  };
  
  return (
    <>
      {/* Toggle Button */}
      <div 
        onClick={togglePanel}
        style={{
          ...basePanelStyle,
          top: isExpanded ? undefined : '50%',
          transform: isExpanded ? 'none' : 'translateY(-50%)',
          padding: isExpanded ? '0' : '8px',
          cursor: 'pointer',
          userSelect: 'none' as const,
        }}
      >
        {!isExpanded && (
          <span style={{ writingMode: 'vertical-rl' as const, textOrientation: 'mixed' as const }}>
            DEBUG
          </span>
        )}
        
        {isExpanded && (
          <>
            {/* Header */}
            <div style={{ 
              padding: '8px', 
              display: 'flex', 
              justifyContent: 'space-between',
              borderBottom: '1px solid #444' 
            }}>
              <div>Rogue Resident Debug Panel</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    copyStateToClipboard(); 
                  }}
                  style={{ 
                    backgroundColor: '#333', 
                    border: 'none', 
                    color: 'white',
                    padding: '2px 4px',
                    fontSize: '10px',
                    cursor: 'pointer'
                  }}
                >
                  Copy State
                </button>
                <span onClick={togglePanel} style={{ cursor: 'pointer' }}>×</span>
              </div>
            </div>
            
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #444' }}>
              <div 
                onClick={() => setActiveTab('state')} 
                style={tabStyle(activeTab === 'state')}
              >
                Game State
              </div>
              <div 
                onClick={() => setActiveTab('dialogue')} 
                style={tabStyle(activeTab === 'dialogue')}
              >
                Dialogue
              </div>
              <div 
                onClick={() => setActiveTab('entities')} 
                style={tabStyle(activeTab === 'entities')}
              >
                Entities
              </div>
              <div 
                onClick={() => setActiveTab('events')} 
                style={tabStyle(activeTab === 'events')}
              >
                Events
              </div>
            </div>
            
            {/* Content */}
            <div style={{ 
              padding: '8px', 
              overflowY: 'auto' as const, 
              maxHeight: '60vh',
              display: activeTab === 'state' ? 'block' : 'none' 
            }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>State Machine</h4>
              <div style={{ marginLeft: '8px' }}>
                <div>
                  <span>Game State: </span>
                  <span style={valueStyle(gameState.gameState)}>{gameState.gameState}</span>
                </div>
                <div>
                  <span>Game Phase: </span>
                  <span style={valueStyle(gameState.gamePhase)}>{gameState.gamePhase}</span>
                </div>
                <div>
                  <span>Is Transitioning: </span>
                  <span style={valueStyle(gameState.isTransitioning)}>{String(gameState.isTransitioning)}</span>
                </div>
                <div>
                  <span>Current Day: </span>
                  <span style={valueStyle(gameState.currentDay)}>{gameState.currentDay}</span>
                </div>
              </div>
              
              <h4 style={{ margin: '8px 0', fontSize: '14px' }}>Game Store</h4>
              <div style={{ marginLeft: '8px' }}>
                <div>
                  <span>Game State: </span>
                  <span style={valueStyle(gameStore.gameState)}>{gameStore.gameState}</span>
                </div>
                <div>
                  <span>Game Phase: </span>
                  <span style={valueStyle(gameStore.gamePhase)}>{gameStore.gamePhase}</span>
                </div>
                <div>
                  <span>Current Node: </span>
                  <span style={valueStyle(gameStore.currentNodeId)}>{gameStore.currentNodeId || 'none'}</span>
                </div>
                <div>
                  <span>Completed Nodes: </span>
                  <span style={valueStyle(gameStore.completedNodeIds.length)}>{gameStore.completedNodeIds.length}</span>
                </div>
                <div>
                  <span>Health: </span>
                  <span style={valueStyle(gameStore.player.health)}>{gameStore.player.health} / {gameStore.player.maxHealth}</span>
                </div>
                <div>
                  <span>Insight: </span>
                  <span style={valueStyle(gameStore.player.insight)}>{gameStore.player.insight}</span>
                </div>
              </div>
              
              <h4 style={{ margin: '8px 0', fontSize: '14px' }}>Challenge Store</h4>
              <div style={{ marginLeft: '8px' }}>
                <div>
                  <span>Active Challenge: </span>
                  <span style={valueStyle(!!challengeStore.currentChallenge)}>
                    {challengeStore.currentChallenge ? challengeStore.currentChallenge.id : 'none'}
                  </span>
                </div>
                {challengeStore.currentChallenge && (
                  <>
                    <div>
                      <span>Type: </span>
                      <span style={valueStyle(challengeStore.currentChallenge.type)}>
                        {challengeStore.currentChallenge.type}
                      </span>
                    </div>
                    <div>
                      <span>Stage: </span>
                      <span style={valueStyle(challengeStore.currentChallenge.stage)}>
                        {challengeStore.currentChallenge.stage}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Dialogue Tab */}
            <div style={{ 
              padding: '8px', 
              overflowY: 'auto' as const, 
              maxHeight: '60vh',
              display: activeTab === 'dialogue' ? 'block' : 'none' 
            }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Dialogue System</h4>
              <div style={{ marginLeft: '8px' }}>
                <div>
                  <span>Is Active: </span>
                  <span style={valueStyle(dialogueState.isActive)}>{String(dialogueState.isActive)}</span>
                </div>
                <div>
                  <span>Current State: </span>
                  <span style={valueStyle(dialogueState.currentNodeId)}>{dialogueState.currentNodeId || 'none'}</span>
                </div>
                <div>
                  <span>Has Selected Option: </span>
                  <span style={valueStyle(!!dialogueState.selectedOption)}>{String(!!dialogueState.selectedOption)}</span>
                </div>
                {dialogueState.selectedOption && (
                  <div>
                    <span>Selected Option: </span>
                    <span style={valueStyle(dialogueState.selectedOption.id)}>{dialogueState.selectedOption.id}</span>
                  </div>
                )}
                <div>
                  <span>Showing Response: </span>
                  <span style={valueStyle(dialogueState.showResponse)}>{String(dialogueState.showResponse)}</span>
                </div>
                <div>
                  <span>Is Critical State: </span>
                  <span style={valueStyle(dialogueState.isInCriticalState?.())}>{String(dialogueState.isInCriticalState?.() || false)}</span>
                </div>
              </div>
              
              <h4 style={{ margin: '8px 0', fontSize: '14px' }}>Journal Store</h4>
              <div style={{ marginLeft: '8px' }}>
                <div>
                  <span>Has Journal: </span>
                  <span style={valueStyle(journalStore.hasJournal)}>{String(journalStore.hasJournal)}</span>
                </div>
                <div>
                  <span>Journal Tier: </span>
                  <span style={valueStyle(journalStore.currentUpgrade)}>{journalStore.currentUpgrade}</span>
                </div>
                <div>
                  <span>Entry Count: </span>
                  <span style={valueStyle(journalStore.entries.length)}>{journalStore.entries.length}</span>
                </div>
                <div>
                  <span>Is Open: </span>
                  <span style={valueStyle(journalStore.isOpen)}>{String(journalStore.isOpen)}</span>
                </div>
              </div>
            </div>
            
            {/* Entities Tab */}
            <div style={{ 
              padding: '8px', 
              overflowY: 'auto' as const, 
              maxHeight: '60vh',
              display: activeTab === 'entities' ? 'block' : 'none' 
            }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Map</h4>
              <div style={{ marginLeft: '8px' }}>
                <div>
                  <span>Has Map: </span>
                  <span style={valueStyle(!!gameStore.map)}>{String(!!gameStore.map)}</span>
                </div>
                {gameStore.map && (
                  <>
                    <div>
                      <span>Node Count: </span>
                      <span style={valueStyle(gameStore.map.nodes.length)}>{gameStore.map.nodes.length}</span>
                    </div>
                    <div>
                      <span>Seed: </span>
                      <span style={valueStyle(gameStore.map.seed)}>{gameStore.map.seed}</span>
                    </div>
                    <div>
                      <span>Start Node: </span>
                      <span style={valueStyle(gameStore.map.startNodeId)}>{gameStore.map.startNodeId}</span>
                    </div>
                    <div>
                      <span>Boss Node: </span>
                      <span style={valueStyle(gameStore.map.bossNodeId)}>{gameStore.map.bossNodeId}</span>
                    </div>
                  </>
                )}
              </div>
              
              <h4 style={{ margin: '8px 0', fontSize: '14px' }}>Knowledge</h4>
              <div style={{ marginLeft: '8px' }}>
                <div>
                  <span>Total Mastery: </span>
                  <span style={valueStyle(knowledgeStore.totalMastery)}>{knowledgeStore.totalMastery}%</span>
                </div>
                <div>
                  <span>Discovered Concepts: </span>
                  <span style={valueStyle(knowledgeStore.nodes.filter(n => n.discovered).length)}>
                    {knowledgeStore.nodes.filter(n => n.discovered).length} / {knowledgeStore.nodes.length}
                  </span>
                </div>
                <div>
                  <span>Journal Entries: </span>
                  <span style={valueStyle(knowledgeStore.journalEntries.length)}>
                    {knowledgeStore.journalEntries.length}
                  </span>
                </div>
                <div>
                  <span>Pending Insights: </span>
                  <span style={valueStyle(knowledgeStore.pendingInsights.length)}>
                    {knowledgeStore.pendingInsights.length}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Events Tab */}
            <div 
              ref={eventLogRef}
              style={{ 
                padding: '8px', 
                overflowY: 'auto' as const, 
                maxHeight: '60vh',
                display: activeTab === 'events' ? 'block' : 'none' 
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h4 style={{ margin: '0', fontSize: '14px' }}>Event Log</h4>
                <div>
                  <input 
                    type="text"
                    placeholder="Filter events..."
                    value={eventFilterType}
                    onChange={(e) => setEventFilterType(e.target.value)}
                    style={{
                      backgroundColor: '#333',
                      border: 'none',
                      color: 'white',
                      padding: '2px 4px',
                      fontSize: '10px',
                      marginRight: '4px',
                      width: '100px'
                    }}
                  />
                  <button 
                    onClick={clearEventLog}
                    style={{ 
                      backgroundColor: '#333', 
                      border: 'none', 
                      color: 'white',
                      padding: '2px 4px',
                      fontSize: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
              
              {recentEvents
                .filter(event => !eventFilterType || String(event.type).includes(eventFilterType))
                .map((event, i) => (
                <div 
                  key={i} 
                  style={{ 
                    marginBottom: '4px', 
                    borderBottom: '1px solid #333',
                    paddingBottom: '4px',
                    fontSize: '11px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    {renderEventType(event.type)}
                    <span style={{ color: '#999', fontSize: '10px' }}>
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div style={{ color: '#999', fontSize: '10px', overflowWrap: 'break-word' as const, paddingLeft: '4px' }}>
                    {event.payload && JSON.stringify(event.payload).slice(0, 100)}
                    {event.payload && JSON.stringify(event.payload).length > 100 ? '...' : ''}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}