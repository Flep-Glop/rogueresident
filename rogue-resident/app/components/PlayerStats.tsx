'use client';
import { useEffect, useState } from 'react';
import { useGameStore } from '@/app/store/gameStore';
import { useGameState } from '@/app/core/statemachine/GameStateMachine';
import { useKnowledgeStore } from '@/app/store/knowledgeStore';
import { useJournalStore } from '@/app/store/journalStore';

/**
 * PlayerStats - Simplified player stats sidebar
 * Removed dependencies on GameEffects and PixelThemeProvider
 */
export default function PlayerStats() {
  // Global state
  const { insight, currentNodeId } = useGameStore();
  const { gamePhase, dayCount } = useGameState();
  const { totalMastery, newlyDiscovered } = useKnowledgeStore();
  const { hasJournal, currentUpgrade } = useJournalStore();
  
  // Local state
  const [prevInsight, setPrevInsight] = useState(insight);
  const [isInsightAnimating, setIsInsightAnimating] = useState(false);
  
  // Animate insight changes
  useEffect(() => {
    if (insight !== prevInsight) {
      setIsInsightAnimating(true);
      setPrevInsight(insight);
      
      // Reset animation after delay
      const timer = setTimeout(() => {
        setIsInsightAnimating(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [insight, prevInsight]);
  
  return (
    <div className="p-4 h-full flex flex-col space-y-4">
      {/* Player info */}
      <div className="pixel-borders bg-surface p-3">
        <h2 className="text-lg mb-1 font-pixel">Medical Physics Resident</h2>
        <div className="text-sm text-text-secondary font-pixel">Day {dayCount}</div>
      </div>
      
      {/* Phase indicator */}
      <div className="pixel-borders bg-surface p-3">
        <div className="text-sm text-text-secondary font-pixel mb-1">Current Phase</div>
        <div className={`text-lg font-pixel ${gamePhase === 'day' ? 'text-clinical-light' : 'text-educational-light'}`}>
          {gamePhase === 'day' ? 'Day - Hospital' : 'Night - Constellation'}
        </div>
      </div>
      
      {/* Insight counter */}
      <div className={`pixel-borders p-3 ${isInsightAnimating ? 'bg-blue-900/30' : 'bg-surface'} transition-colors`}>
        <div className="text-sm text-text-secondary font-pixel mb-1">Insight Points</div>
        <div className={`text-xl font-pixel ${isInsightAnimating ? 'text-blue-300' : 'text-blue-400'}`}>
          {insight}
        </div>
      </div>
      
      {/* Knowledge status */}
      <div className="pixel-borders bg-surface p-3">
        <div className="text-sm text-text-secondary font-pixel mb-1">Knowledge Mastery</div>
        <div className="text-educational-light text-lg font-pixel">
          {totalMastery}%
        </div>
        {newlyDiscovered.length > 0 && (
          <div className="mt-2 text-xs text-educational font-pixel">
            {newlyDiscovered.length} new concept{newlyDiscovered.length !== 1 ? 's' : ''} discovered
          </div>
        )}
      </div>
      
      {/* Journal status */}
      <div className="pixel-borders bg-surface p-3">
        <div className="text-sm text-text-secondary font-pixel mb-1">Journal</div>
        {hasJournal ? (
          <div className="text-clinical-light text-lg font-pixel">
            {currentUpgrade === 'base' && 'Basic Notebook'}
            {currentUpgrade === 'technical' && 'Technical Journal'}
            {currentUpgrade === 'annotated' && 'Annotated Journal'}
            {currentUpgrade === 'indexed' && 'Indexed Compendium'}
            {currentUpgrade === 'integrated' && 'Integrated Codex'}
          </div>
        ) : (
          <div className="text-warning text-lg font-pixel">
            Not Acquired
          </div>
        )}
      </div>
      
      {/* Debug info in dev mode */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="mt-auto bg-black/30 p-2 rounded text-xs font-mono">
          <div>Phase: {gamePhase}</div>
          <div>Day: {dayCount}</div>
          <div>Node: {currentNodeId ? currentNodeId.substring(0, 8) + '...' : 'none'}</div>
        </div>
      )}
    </div>
  );
}