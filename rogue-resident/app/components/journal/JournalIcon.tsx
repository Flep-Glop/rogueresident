'use client';
import { useEffect, useState } from 'react';
import { useJournalStore } from '../../store/journalStore';
import { useGameStore } from '../../store/gameStore';
import { useKnowledgeStore } from '../../store/knowledgeStore';
import { useGameEffects } from '../GameEffects';
import { PixelText } from '../PixelThemeProvider';
import Image from 'next/image';

export default function JournalIcon() {
  const { 
    hasJournal, 
    toggleJournal, 
    isOpen, 
    currentUpgrade 
  } = useJournalStore();
  
  const { gamePhase } = useGameStore();
  const { playSound } = useGameEffects();
  
  // Animation states
  const [isNotifying, setIsNotifying] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  
  // Set pulse animation based on game phase
  useEffect(() => {
    if (gamePhase === 'night' && hasJournal) {
      setIsPulsing(true);
    } else {
      setIsPulsing(false);
    }
  }, [gamePhase, hasJournal]);
  
  // When new knowledge is added, show notification
  useEffect(() => {
    // This would hook into knowledgeStore updates in a full implementation
    // For prototype, we'll just trigger it on journal open/close
    
    const handleKnowledgeChange = () => {
      if (hasJournal && !isOpen) {
        setIsNotifying(true);
        setTimeout(() => setIsNotifying(false), 3000);
      }
    };
    
    // Mock trigger for prototype demo
    if (hasJournal && !isOpen) {
      const timer = setTimeout(handleKnowledgeChange, 5000);
      return () => clearTimeout(timer);
    }
  }, [hasJournal, isOpen]);
  
  // Don't render if player doesn't have journal yet
  if (!hasJournal) return null;
  
  // Get icon style based on journal upgrade level
  const getIconStyle = () => {
    switch(currentUpgrade) {
      case 'base':
        return {
          border: '2px solid #aa8855',
          background: 'linear-gradient(145deg, #926d3d, #c8965a)'
        };
      case 'technical':
        return {
          border: '2px solid var(--clinical-color)',
          background: 'linear-gradient(145deg, var(--clinical-color-dark), var(--clinical-color))'
        };
      case 'annotated':
        return {
          border: '2px solid var(--clinical-light)',
          background: 'linear-gradient(145deg, var(--clinical-color), var(--clinical-light))'
        };
      case 'indexed':
        return {
          border: '2px solid #4a77b3',
          background: 'linear-gradient(145deg, #2c4a70, #4a77b3)'
        };
      case 'integrated':
        return {
          border: '2px solid var(--educational-light)',
          background: 'linear-gradient(145deg, var(--educational-color), var(--educational-light))'
        };
      default:
        return {
          border: '2px solid #aa8855',
          background: 'linear-gradient(145deg, #926d3d, #c8965a)'
        };
    }
  };
  
  return (
    <div className="fixed bottom-4 left-4 z-40">
      <button
        className={`
          relative w-12 h-12 rounded-md shadow-lg
          flex items-center justify-center
          hover:scale-110 transition-all duration-300
          ${isPulsing ? 'animate-pulse' : ''}
          ${gamePhase === 'night' ? 'shadow-educational/30' : ''}
        `}
        style={getIconStyle()}
        onClick={() => {
          toggleJournal();
          if (playSound) playSound('ui-click');
        }}
        aria-label="Open Journal"
      >
        {/* Book icon with letter J */}
        <div className="text-white font-pixel text-xl">J</div>
        
        {/* Notification indicator */}
        {isNotifying && (
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-educational rounded-full animate-ping"></div>
        )}
        
        {/* Night phase special glow */}
        {gamePhase === 'night' && (
          <div className="absolute inset-0 rounded-md bg-educational/20 animate-pulse"></div>
        )}
      </button>
      
      {/* Contextual label - only shown during specific moments */}
      {(gamePhase === 'night' || isPulsing) && (
        <div className="absolute -top-8 left-0 w-32 bg-surface px-2 py-1 text-center">
          <PixelText className="text-xs">
            {gamePhase === 'night' ? 'Record learnings' : 'Open Journal'}
          </PixelText>
        </div>
      )}
    </div>
  );
}