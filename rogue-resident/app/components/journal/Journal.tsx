'use client';
import { useState, useEffect } from 'react';
import { useJournalStore } from '../../store/journalStore';
import { useGameStore } from '../../store/gameStore';
import { useGameEffects } from '../GameEffects';
import { PixelText, PixelButton } from '../PixelThemeProvider';
import Image from 'next/image';
import JournalKnowledgePage from './JournalKnowledgePage';
import JournalCharactersPage from './JournalCharactersPage';
import JournalNotesPage from './JournalNotesPage';
import JournalReferencesPage from './JournalReferencesPage';

export default function Journal() {
  const { 
    isOpen, 
    currentPage, 
    setCurrentPage, 
    toggleJournal, 
    currentUpgrade,
    hasJournal 
  } = useJournalStore();
  
  const { gamePhase } = useGameStore();
  const { playSound } = useGameEffects();
  
  // Animation states
  const [isAnimating, setIsAnimating] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  
  // Handle open/close animations with sound effects
  useEffect(() => {
    if (isOpen) {
      if (playSound) playSound('ui-click');
      setIsAnimating(true);
      // After animation completes
      const timer = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, playSound]);
  
  // Special effects during night phase when journal is opened
  useEffect(() => {
    if (isOpen && gamePhase === 'night') {
      // Start particle effect animation when journal opens during night phase
      setShowParticles(true);
      if (playSound) playSound('knowledge-transfer');
      
      // Clean up animation after delay
      const timer = setTimeout(() => setShowParticles(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, gamePhase, playSound]);
  
  // Don't render anything if player doesn't have journal or it's not open
  if (!hasJournal || !isOpen) return null;
  
  // Determine journal cover style based on upgrade level
  const getJournalCoverStyle = () => {
    switch(currentUpgrade) {
      case 'base':
        return 'bg-gradient-to-b from-amber-800 to-amber-900';
      case 'technical':
        return 'bg-gradient-to-b from-clinical-dark to-clinical';
      case 'annotated':
        return 'bg-gradient-to-b from-clinical-dark to-clinical-light';
      case 'indexed':
        return 'bg-gradient-to-b from-blue-900 to-blue-700';
      case 'integrated':
        return 'bg-gradient-to-b from-educational-dark to-educational';
      default:
        return 'bg-gradient-to-b from-amber-800 to-amber-900';
    }
  };
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/70">
      <div 
        className={`
          relative w-[900px] h-[650px] 
          ${getJournalCoverStyle()}
          pixel-borders
          transform transition-all duration-500
          ${isAnimating ? 'scale-95 opacity-90' : 'scale-100 opacity-100'}
        `}
      >
        {/* Journal cover decoration */}
        <div className="absolute inset-2 border border-amber-500/30"></div>
        
        {/* Night phase knowledge transfer particles - only visible during night phase */}
        {showParticles && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-50">
            {/* Ambient glow */}
            <div className="absolute inset-0 bg-educational/10 animate-pulse"></div>
            
            {/* Particle effects that simulate knowledge flowing from journal to constellation */}
            <div className="absolute top-0 left-1/2 w-1 h-1 bg-educational rounded-full animate-ping"></div>
            <div className="absolute top-0 left-1/3 w-2 h-2 bg-clinical rounded-full animate-ping" 
                 style={{ animationDelay: '100ms' }}></div>
            <div className="absolute top-0 right-1/4 w-1 h-1 bg-qa rounded-full animate-ping"
                 style={{ animationDelay: '300ms' }}></div>
            <div className="absolute top-0 left-2/3 w-2 h-2 bg-educational-light rounded-full animate-ping"
                 style={{ animationDelay: '500ms' }}></div>
            <div className="absolute top-0 right-1/3 w-1 h-1 bg-clinical-light rounded-full animate-ping"
                 style={{ animationDelay: '700ms' }}></div>
          </div>
        )}
        
        {/* Close button */}
        <button 
          className="absolute -top-4 -right-4 w-8 h-8 bg-surface pixel-borders-thin flex items-center justify-center hover:bg-clinical transition-colors z-50"
          onClick={toggleJournal}
          aria-label="Close journal"
        >
          <span>✕</span>
        </button>
        
        {/* Journal content */}
        <div className="flex h-full">
          {/* Tabs sidebar */}
          <div className="w-[200px] bg-surface-dark border-r border-border">
            <div className="p-4">
              <PixelText className="text-xl mb-4 text-center">Journal</PixelText>
              
              <div className="space-y-2">
                <button
                  className={`w-full text-left p-2 transition-colors ${currentPage === 'knowledge' ? 'bg-clinical text-white' : 'hover:bg-surface'}`}
                  onClick={() => setCurrentPage('knowledge')}
                >
                  <PixelText>Knowledge</PixelText>
                </button>
                
                <button
                  className={`w-full text-left p-2 transition-colors ${currentPage === 'characters' ? 'bg-clinical text-white' : 'hover:bg-surface'}`}
                  onClick={() => setCurrentPage('characters')}
                >
                  <PixelText>Characters</PixelText>
                </button>
                
                <button
                  className={`w-full text-left p-2 transition-colors ${currentPage === 'notes' ? 'bg-clinical text-white' : 'hover:bg-surface'}`}
                  onClick={() => setCurrentPage('notes')}
                >
                  <PixelText>Notes</PixelText>
                </button>
                
                <button
                  className={`w-full text-left p-2 transition-colors ${currentPage === 'references' ? 'bg-clinical text-white' : 'hover:bg-surface'}`}
                  onClick={() => setCurrentPage('references')}
                >
                  <PixelText>References</PixelText>
                </button>
              </div>
            </div>
            
            {/* Journal quality indicator */}
            <div className="absolute bottom-4 left-4 w-[180px]">
              <div className="p-2 bg-surface-dark/70 text-center">
                <PixelText className="text-xs">
                  {currentUpgrade === 'base' && "Basic Notebook"}
                  {currentUpgrade === 'technical' && "Technical Journal"}
                  {currentUpgrade === 'annotated' && "Annotated Journal"}
                  {currentUpgrade === 'indexed' && "Indexed Compendium"}
                  {currentUpgrade === 'integrated' && "Integrated Codex"}
                </PixelText>
              </div>
            </div>
          </div>
          
          {/* Journal pages */}
          <div className="flex-1 bg-surface overflow-y-auto p-6">
            {currentPage === 'knowledge' && <JournalKnowledgePage />}
            {currentPage === 'characters' && <JournalCharactersPage />}
            {currentPage === 'notes' && <JournalNotesPage />}
            {currentPage === 'references' && <JournalReferencesPage />}
          </div>
        </div>
      </div>
    </div>
  );
}