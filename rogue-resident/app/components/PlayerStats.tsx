'use client';
import { useEffect, useState } from 'react';
import { useGameStore } from '@/app/store/gameStore';
import { useGameState } from '@/app/core/statemachine/GameStateMachine';
import { useKnowledgeStore } from '@/app/store/knowledgeStore';
import { useJournalStore } from '@/app/store/journalStore';
import InsightMeter from './gameplay/InsightMeter';
import MomentumCounter from './gameplay/MomentumCounter';
import ResidentPortrait from './ResidentPortrait';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * PlayerStats - Enhanced player stats sidebar with character representation
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
  
  // Determine when to use full body portrait
  const shouldShowFullBody = 
    gamePhase === 'night' || // Always show full body at night
    (!currentNodeId && gamePhase === 'day'); // Show full body on the map screen
  
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
      {/* Player info with portrait */}
      <div className="pixel-borders bg-surface p-3">
        <div className="flex items-center mb-2">
          <ResidentPortrait 
            showFullBody={shouldShowFullBody}
            size="md"
            className="mr-3"
          />
          <div>
            <h2 className="text-lg font-pixel">Medical Physics Resident</h2>
            <div className="text-sm text-text-secondary font-pixel">Day {dayCount}</div>
          </div>
        </div>
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
      
      {/* Knowledge status with visual progress */}
      <div className="pixel-borders bg-surface p-3">
        <div className="text-sm text-text-secondary font-pixel mb-1">Knowledge Mastery</div>
        <div className="flex items-center">
          <div className="text-educational-light text-lg font-pixel">
            {totalMastery}%
          </div>
          
          {/* Visual progress bar */}
          <div className="ml-2 flex-grow h-2 bg-surface-dark rounded overflow-hidden">
            <motion.div 
              className="h-full bg-educational"
              initial={{ width: 0 }}
              animate={{ 
                width: `${totalMastery}%`,
                transition: { type: 'spring', damping: 15 }
              }}
            />
          </div>
        </div>
        
        {/* Newly discovered animation */}
        <AnimatePresence>
          {newlyDiscovered.length > 0 && (
            <motion.div 
              className="mt-2 text-xs text-educational font-pixel"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {newlyDiscovered.length} new concept{newlyDiscovered.length !== 1 ? 's' : ''} discovered
            </motion.div>
          )}
        </AnimatePresence>
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