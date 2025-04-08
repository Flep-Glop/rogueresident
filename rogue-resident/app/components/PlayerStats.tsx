'use client';
import { useEffect, useState } from 'react';
import { useGameStore } from '@/app/store/gameStore';
import { useGameState } from '@/app/core/statemachine/GameStateMachine';
import { useKnowledgeStore } from '@/app/store/knowledgeStore';
import { useJournalStore } from '@/app/store/journalStore';
import InsightMeter from './gameplay/InsightMeter';
import MomentumCounter from './gameplay/MomentumCounter';

/**
 * PlayerStats - Enhanced player stats sidebar with insight and momentum
 */
export default function PlayerStats() {
  // Global state
  const { player, currentNodeId } = useGameStore();
  const { gamePhase, dayCount } = useGameState();
  const { totalMastery, newlyDiscovered } = useKnowledgeStore();
  const { hasJournal, currentUpgrade, toggleJournal } = useJournalStore();
  
  // Local state for animations
  const [showInsightAnimation, setShowInsightAnimation] = useState(false);
  const [showJournalButtonAnimation, setShowJournalButtonAnimation] = useState(false);
  
  // Animate insight changes
  useEffect(() => {
    const handleInsightChange = () => {
      setShowInsightAnimation(true);
      
      // Reset animation after delay
      const timer = setTimeout(() => {
        setShowInsightAnimation(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    };
    
    // Trigger initial animation if insight is high
    if (player.insight > 50) {
      handleInsightChange();
    }
  }, [player.insight]);
  
  // Show journal button animation when journal is first acquired
  useEffect(() => {
    if (hasJournal) {
      setShowJournalButtonAnimation(true);
      const timer = setTimeout(() => {
        setShowJournalButtonAnimation(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [hasJournal]);
  
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
      
      {/* Insight meter */}
      <div className="pixel-borders bg-surface p-3">
        <InsightMeter showAnimation={showInsightAnimation} />
      </div>
      
      {/* Momentum counter */}
      <div className="pixel-borders bg-surface p-3">
        <MomentumCounter 
          level={player.momentum} 
          consecutiveCorrect={player.momentum * 2} // Approximation
          compact={true} 
          className="w-full"
        />
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
      
      {/* Journal status with open button */}
      <div className={`pixel-borders bg-surface p-3 ${showJournalButtonAnimation ? 'animate-pulse-subtle' : ''}`}>
        <div className="text-sm text-text-secondary font-pixel mb-1">Journal</div>
        {hasJournal ? (
          <div className="flex flex-col">
            <div className="text-clinical-light text-lg font-pixel">
              {currentUpgrade === 'base' && 'Basic Notebook'}
              {currentUpgrade === 'technical' && 'Technical Journal'}
              {currentUpgrade === 'annotated' && 'Annotated Journal'}
              {currentUpgrade === 'indexed' && 'Indexed Compendium'}
              {currentUpgrade === 'integrated' && 'Integrated Codex'}
            </div>
            
            {/* Add journal open button */}
            <button 
              className={`mt-2 px-3 py-1 bg-clinical text-white text-sm font-pixel hover:bg-clinical-light transition-colors
                ${showJournalButtonAnimation ? 'animate-bounce-subtle' : ''}
              `}
              onClick={() => toggleJournal()}
            >
              Open Journal
            </button>
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
          <div>Insight: {player.insight}</div>
          <div>Momentum: {player.momentum}/{player.maxMomentum}</div>
          <div>Node: {currentNodeId ? currentNodeId.substring(0, 8) + '...' : 'none'}</div>
        </div>
      )}
      
      {/* Custom animations */}
      <style jsx>{`
        @keyframes pulse-subtle {
          0%, 100% { box-shadow: 0 0 0 0 rgba(55, 145, 216, 0.4); }
          50% { box-shadow: 0 0 0 4px rgba(55, 145, 216, 0.4); }
        }
        
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        
        .animate-pulse-subtle {
          animation: pulse-subtle 2s infinite;
        }
        
        .animate-bounce-subtle {
          animation: bounce-subtle 2s infinite;
        }
      `}</style>
    </div>
  );
}