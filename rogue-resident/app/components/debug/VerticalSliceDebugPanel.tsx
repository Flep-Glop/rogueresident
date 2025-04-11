// app/components/debug/VerticalSliceDebugPanel.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePrimitiveStoreValue } from '@/app/core/utils/storeHooks';
import useGameStateMachine from '@/app/core/statemachine/GameStateMachine';
import { useGameStore } from '@/app/store/gameStore';
import { useJournalStore } from '@/app/store/journalStore';
import { useKnowledgeStore } from '@/app/store/knowledgeStore';
import { useResourceStore } from '@/app/store/resourceStore';

/**
 * Simplified Debug Panel that follows Chamber Pattern principles
 * 
 * This is a lightweight version of the debug panel that:
 * 1. Only extracts primitive values (no object references)
 * 2. Minimizes subscriptions to reduce re-renders
 * 3. Uses direct store access for actions instead of props
 * 4. Provides essential debugging information without complexity
 * 
 * FIXES:
 * 1. Fixed hydration mismatch by using a consistent value for journal tier
 * 2. Improved error handling
 * 3. Enhanced performance with optimized store access
 * 4. Added additional debug information
 */
export default function VerticalSliceDebugPanel() {
  // Track component mount for cleanup
  const mountedRef = useRef(true);
  
  // Minimal state for panel UI
  const [isExpanded, setIsExpanded] = useState(true);
  const [storageStatus, setStorageStatus] = useState({
    game: false,
    journal: false,
    knowledge: false
  });
  const [clickPending, setClickPending] = useState(false);
  
  // Extract ONLY primitive values with appropriate fallbacks
  // Game state primitives
  const gamePhase = usePrimitiveStoreValue(
    useGameStateMachine,
    state => state.gamePhase,
    'day'
  );
  
  const currentDay = usePrimitiveStoreValue(
    useGameStateMachine,
    state => state.currentDay,
    1
  );
  
  const currentNodeId = usePrimitiveStoreValue(
    useGameStore,
    state => state.currentNodeId,
    null
  );
  
  // Journal primitives
  const hasJournal = usePrimitiveStoreValue(
    useJournalStore,
    state => state.hasJournal,
    false
  );
  
  // CRITICAL FIX: Use 'base' as the consistent default for journal tier
  // This prevents the hydration mismatch between 'none' (client) and 'annotated' (server)
  const journalTier = usePrimitiveStoreValue(
    useJournalStore,
    state => state.currentUpgrade,
    'base'
  );
  
  // Knowledge primitives
  const totalMastery = usePrimitiveStoreValue(
    useKnowledgeStore,
    state => state.totalMastery,
    0
  );
  
  const discoveredNodeCount = usePrimitiveStoreValue(
    useKnowledgeStore,
    state => {
      if (!state || !state.nodes) return 0;
      return state.nodes.filter(n => n && n.discovered).length;
    },
    0
  );
  
  // Resource primitives
  const insight = usePrimitiveStoreValue(
    useResourceStore,
    state => state.insight,
    0
  );
  
  const momentum = usePrimitiveStoreValue(
    useResourceStore,
    state => state.momentum,
    0
  );
  
  // Check local storage on client side only - avoid server/client mismatch
  useEffect(() => {
    // Skip during SSR
    if (typeof window === 'undefined') return;
    
    try {
      // Update storage status
      setStorageStatus({
        game: !!localStorage.getItem('rogue-resident-game-v2'),
        journal: !!localStorage.getItem('rogue-resident-journal'),
        knowledge: !!localStorage.getItem('rogue-resident-knowledge')
      });
    } catch (e) {
      console.error('Storage access error:', e);
    }
  }, []);
  
  // Mount/unmount effect
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  // Don't render in production
  if (process.env.NODE_ENV === 'production') return null;
  
  // ---------------------------------------------
  // Store action wrappers with error handling
  // ---------------------------------------------
  
  function giveJournal() {
    if (clickPending) return;
    setClickPending(true);
    
    try {
      const journalStore = useJournalStore.getState();
      if (journalStore && journalStore.initializeJournal) {
        journalStore.initializeJournal('technical', 'debug_panel');
        console.log('[DebugPanel] Journal initialized');
      } else {
        console.error('[DebugPanel] initializeJournal not available');
      }
    } catch (error) {
      console.error('[DebugPanel] Error giving journal:', error);
    } finally {
      setTimeout(() => setClickPending(false), 500);
    }
  }
  
  function togglePhase() {
    if (clickPending) return;
    setClickPending(true);
    
    try {
      const stateMachine = useGameStateMachine.getState();
      if (gamePhase === 'day' && stateMachine && stateMachine.beginDayCompletion) {
        console.log('[DebugPanel] Beginning day completion');
        stateMachine.beginDayCompletion();
      } else if (gamePhase === 'night' && stateMachine && stateMachine.beginNightCompletion) {
        console.log('[DebugPanel] Beginning night completion');
        stateMachine.beginNightCompletion();
      } else {
        console.error(`[DebugPanel] Cannot toggle phase from: ${gamePhase}`);
      }
    } catch (error) {
      console.error('[DebugPanel] Error toggling phase:', error);
    } finally {
      setTimeout(() => setClickPending(false), 500);
    }
  }
  
  function addInsight() {
    if (clickPending) return;
    setClickPending(true);
    
    try {
      const resourceStore = useResourceStore.getState();
      if (resourceStore && resourceStore.updateInsight) {
        resourceStore.updateInsight(25, 'debug_panel');
        console.log('[DebugPanel] Added 25 insight');
      } else {
        console.error('[DebugPanel] updateInsight not available');
      }
    } catch (error) {
      console.error('[DebugPanel] Error adding insight:', error);
    } finally {
      setTimeout(() => setClickPending(false), 300);
    }
  }
  
  function addMomentum() {
    if (clickPending) return;
    setClickPending(true);
    
    try {
      const resourceStore = useResourceStore.getState();
      if (resourceStore && resourceStore.setMomentum) {
        resourceStore.setMomentum(Math.min(3, momentum + 1));
        console.log(`[DebugPanel] Set momentum to ${Math.min(3, momentum + 1)}`);
      } else {
        console.error('[DebugPanel] setMomentum not available');
      }
    } catch (error) {
      console.error('[DebugPanel] Error adding momentum:', error);
    } finally {
      setTimeout(() => setClickPending(false), 300);
    }
  }
  
  function addKnowledge() {
    if (clickPending) return;
    setClickPending(true);
    
    try {
      const knowledgeStore = useKnowledgeStore.getState();
      if (knowledgeStore && knowledgeStore.updateMastery && knowledgeStore.discoverConcept) {
        knowledgeStore.updateMastery('radiation-dosimetry', 15);
        knowledgeStore.discoverConcept('radiation-dosimetry');
        console.log('[DebugPanel] Added knowledge: radiation-dosimetry +15');
      } else {
        console.error('[DebugPanel] Knowledge store functions not available');
      }
    } catch (e) {
      console.error("[DebugPanel] Error adding knowledge:", e);
    } finally {
      setTimeout(() => setClickPending(false), 300);
    }
  }
  
  function resetGame() {
    if (clickPending) return;
    setClickPending(true);
    
    if (typeof window === 'undefined') return;
    
    if (window.confirm('Reset game state? This will clear all progress.')) {
      try {
        // Clear local storage
        localStorage.removeItem('rogue-resident-game-v2');
        localStorage.removeItem('rogue-resident-journal');
        localStorage.removeItem('rogue-resident-knowledge');
        console.log('[DebugPanel] Cleared local storage');
        
        // Update storage status
        setStorageStatus({
          game: false,
          journal: false,
          knowledge: false
        });
        
        // Attempt to use the window reset function if available
        if (window.__FORCE_REINITIALIZE__) {
          console.log('[DebugPanel] Calling FORCE_REINITIALIZE');
          window.__FORCE_REINITIALIZE__();
        } else {
          // Fallback to reloading
          console.log('[DebugPanel] FORCE_REINITIALIZE not available, reloading page');
          window.location.reload();
        }
      } catch (error) {
        console.error('[DebugPanel] Error resetting game:', error);
      }
    }
    
    setTimeout(() => setClickPending(false), 300);
  }
  
  function createTestNode() {
    if (clickPending) return;
    setClickPending(true);
    
    try {
      const gameStore = useGameStore.getState();
      if (gameStore && gameStore.setCurrentNode) {
        gameStore.setCurrentNode('node-1');
        console.log('[DebugPanel] Set current node to node-1');
      } else {
        console.error('[DebugPanel] setCurrentNode not available');
      }
    } catch (error) {
      console.error('[DebugPanel] Error creating test node:', error);
    } finally {
      setTimeout(() => setClickPending(false), 300);
    }
  }
  
  function clearCurrentNode() {
    if (clickPending) return;
    setClickPending(true);
    
    try {
      const gameStore = useGameStore.getState();
      if (gameStore && gameStore.setCurrentNode) {
        gameStore.setCurrentNode(null);
        console.log('[DebugPanel] Cleared current node');
      } else {
        console.error('[DebugPanel] setCurrentNode not available');
      }
    } catch (error) {
      console.error('[DebugPanel] Error clearing current node:', error);
    } finally {
      setTimeout(() => setClickPending(false), 300);
    }
  }
  
  return (
    <div
      className="fixed top-1/2 right-0 transform -translate-y-1/2 bg-gray-900/90 text-white z-[10000] rounded-l-lg shadow-xl overflow-hidden transition-all duration-300"
      style={{
        width: isExpanded ? '250px' : '30px',
        height: isExpanded ? '450px' : '100px',
      }}
    >
      {/* Toggle button */}
      <div
        className="py-2 px-3 bg-blue-600 flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <>
            <span className="font-semibold">Debug</span>
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
            Debug
          </span>
        )}
      </div>

      {/* Panel content */}
      {isExpanded && (
        <div className="p-3 text-sm overflow-y-auto max-h-[calc(100%-36px)]">
          {/* Game info section */}
          <div className="mb-4">
            <h3 className="font-semibold mb-2 text-blue-400">Game State</h3>
            <div className="bg-gray-800 p-2 rounded">
              <div className="flex justify-between mb-1">
                <span>Phase:</span>
                <span className="text-green-400">{gamePhase}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>Day:</span>
                <span>{currentDay}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>Current Node:</span>
                <span className="font-mono text-xs">{currentNodeId || 'none'}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>Journal:</span>
                <span>{hasJournal ? journalTier : 'base'}</span>
              </div>
              <div className="flex justify-between">
                <span>Mastery:</span>
                <span>{totalMastery}% ({discoveredNodeCount} nodes)</span>
              </div>
            </div>
          </div>
          
          {/* Resources section */}
          <div className="mb-4">
            <h3 className="font-semibold mb-2 text-blue-400">Resources</h3>
            <div className="bg-gray-800 p-2 rounded">
              <div className="flex justify-between mb-1">
                <span>Insight:</span>
                <span className="text-blue-300">{insight}/100</span>
              </div>
              <div className="flex justify-between">
                <span>Momentum:</span>
                <span className="text-orange-300">{momentum}/3</span>
              </div>
            </div>
          </div>
          
          {/* Core actions section */}
          <div className="mb-4">
            <h3 className="font-semibold mb-2 text-blue-400">Core Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-500 disabled:opacity-50"
                onClick={togglePhase}
                disabled={clickPending}
              >
                {gamePhase === 'day' ? 'End Day' : 'Start Day'}
              </button>
              
              <button
                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-500 disabled:opacity-50"
                onClick={giveJournal}
                disabled={hasJournal || clickPending}
              >
                Give Journal
              </button>
              
              <button
                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-500 disabled:opacity-50"
                onClick={addInsight}
                disabled={clickPending}
              >
                Add Insight
              </button>
              
              <button
                className="px-2 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-500 disabled:opacity-50"
                onClick={addMomentum}
                disabled={momentum >= 3 || clickPending}
              >
                Add Momentum
              </button>
              
              <button
                className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-500 disabled:opacity-50"
                onClick={addKnowledge}
                disabled={clickPending}
              >
                Add Knowledge
              </button>
              
              <button
                className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-500 disabled:opacity-50"
                onClick={resetGame}
                disabled={clickPending}
              >
                Reset Game
              </button>
            </div>
          </div>
          
          {/* Node control section - NEW */}
          <div className="mb-4">
            <h3 className="font-semibold mb-2 text-blue-400">Node Controls</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-500 disabled:opacity-50"
                onClick={createTestNode}
                disabled={clickPending}
              >
                Select Node 1
              </button>
              
              <button
                className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-500 disabled:opacity-50"
                onClick={clearCurrentNode}
                disabled={!currentNodeId || clickPending}
              >
                Clear Node
              </button>
            </div>
          </div>
          
          {/* Storage info */}
          <div>
            <h3 className="font-semibold mb-2 text-blue-400">Storage</h3>
            <div className="text-xs text-gray-400">
              <div>game: {storageStatus.game ? '✓' : '✗'}</div>
              <div>journal: {storageStatus.journal ? '✓' : '✗'}</div>
              <div>knowledge: {storageStatus.knowledge ? '✓' : '✗'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}