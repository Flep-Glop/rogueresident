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
  
  // Enhanced animation states
  const [isNotifying, setIsNotifying] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const [showKnowledgeFlow, setShowKnowledgeFlow] = useState(false);
  const [bounceAnimation, setBounceAnimation] = useState(false);
  
  // Set pulse animation based on game phase
  useEffect(() => {
    if (gamePhase === 'night' && hasJournal) {
      setIsPulsing(true);
    } else {
      setIsPulsing(false);
    }
  }, [gamePhase, hasJournal]);
  
  // When new knowledge is added, show enhanced notification
  useEffect(() => {
    // This would hook into knowledgeStore updates in a full implementation
    // For prototype, we'll just trigger it on journal open/close
    
    const handleKnowledgeChange = () => {
      if (hasJournal && !isOpen) {
        setIsNotifying(true);
        setBounceAnimation(true);
        
        // Show knowledge flow animation shortly after notification appears
        setTimeout(() => setShowKnowledgeFlow(true), 300);
        
        // Clean up animations after delays
        setTimeout(() => setBounceAnimation(false), 1000);
        setTimeout(() => setShowKnowledgeFlow(false), 3000);
        setTimeout(() => setIsNotifying(false), 5000);
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
    <div className="fixed bottom-4 right-4 z-40">
      <button
        className={`
          relative w-12 h-12 rounded-md shadow-lg
          flex items-center justify-center
          transition-all duration-300
          ${isPulsing ? 'animate-pulse' : ''}
          ${isNotifying ? 'scale-110' : 'hover:scale-105'}
          ${gamePhase === 'night' ? 'shadow-educational/30' : ''}
        `}
        style={{
          ...getIconStyle(),
          transform: `translateY(${bounceAnimation ? '-4px' : '0px'})`,
        }}
        onClick={() => {
          toggleJournal();
          if (playSound) playSound('ui-click');
        }}
        aria-label="Open Journal"
      >
        {/* Journal progression visualization */}
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Book icon with letter J - would be replaced with actual journal sprites */}
          <div className="text-white font-pixel text-xl">J</div>
        </div>
        
        {/* Enhanced notification indicator */}
        {isNotifying && (
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-educational rounded-full">
            <div className="absolute inset-0 bg-educational rounded-full animate-ping"></div>
          </div>
        )}
        
        {/* Knowledge flow visualization */}
        {showKnowledgeFlow && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Ambient glow */}
            <div className="absolute inset-0 rounded-md bg-educational/20 animate-pulse"></div>
            
            {/* Constellation-themed particles */}
            <div className="absolute top-0 left-1/2 w-1 h-1 bg-educational rounded-full"
                 style={{ animation: 'float-particle 2s ease-in-out infinite' }}></div>
            <div className="absolute top-1/3 right-0 w-2 h-2 bg-clinical rounded-full"
                 style={{ animation: 'float-particle 1.8s ease-in-out infinite', animationDelay: '300ms' }}></div>
            <div className="absolute bottom-0 left-1/4 w-1 h-1 bg-qa rounded-full"
                 style={{ animation: 'float-particle 2.2s ease-in-out infinite', animationDelay: '600ms' }}></div>
          </div>
        )}
        
        {/* Night phase special glow */}
        {gamePhase === 'night' && (
          <div className="absolute inset-0 rounded-md bg-educational/20 animate-pulse"></div>
        )}
      </button>
      
      {/* Enhanced contextual label */}
      {(isNotifying || gamePhase === 'night' || isPulsing) && (
        <div className="absolute -top-10 right-0 w-32 bg-surface px-2 py-1 text-center pixel-borders-thin animate-fade-in">
          <PixelText className="text-xs">
            {isNotifying ? 'New Knowledge!' : 
             gamePhase === 'night' ? 'Record learnings' : 'Open Journal'}
          </PixelText>
        </div>
      )}
    </div>
  );
}