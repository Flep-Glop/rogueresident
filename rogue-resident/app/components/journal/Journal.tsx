'use client';
import { useState, useEffect, useCallback } from 'react';
import { useJournalStore } from '../../store/journalStore';
import { useGameStore } from '../../store/gameStore';
import { useGameEffects } from '../GameEffects';
import { PixelText, PixelButton } from '../PixelThemeProvider';
import JournalKnowledgePage from './JournalKnowledgePage';
import JournalCharactersPage from './JournalCharactersPage';
import JournalNotesPage from './JournalNotesPage';
import JournalReferencesPage from './JournalReferencesPage';

/**
 * Journal Component - Next.js Compatible Version
 * Uses direct DOM manipulation techniques for reliable interaction
 * in Next.js client components - inspired by Supergiant's UI frameworks
 */
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
  
  // Force the document body to be non-interactive when journal is open
  useEffect(() => {
    if (isOpen) {
      // Store original overflow
      const originalOverflow = document.body.style.overflow;
      
      // Lock the background
      document.body.style.overflow = 'hidden';
      
      // Unlock when closing
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);
  
  // Handle open/close animations with sound effects
  useEffect(() => {
    if (isOpen) {
      if (playSound) playSound('ui-click');
      setIsAnimating(true);
      
      // After animation completes
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, playSound]);
  
  // Special effects during night phase
  useEffect(() => {
    if (isOpen && gamePhase === 'night') {
      setShowParticles(true);
      if (playSound) playSound('knowledge-transfer');
      
      const timer = setTimeout(() => setShowParticles(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, gamePhase, playSound]);
  
  // Strong click handlers with direct DOM interaction patterns
  const handleTabClick = useCallback((targetPage: 'knowledge' | 'characters' | 'notes' | 'references') => {
    // Use direct state manipulation for guaranteed response
    setCurrentPage(targetPage);
    if (playSound) playSound('ui-click');
    
    // Critical: Force an active element blur to ensure focus state is clean
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [setCurrentPage, playSound]);
  
  // Close handler with guaranteed response
  const handleClose = useCallback(() => {
    toggleJournal();
    if (playSound) playSound('ui-click');
    
    // Force any active element to blur
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [toggleJournal, playSound]);
  
  // Don't render anything if player doesn't have journal or it's not open
  if (!hasJournal || !isOpen) return null;
  
  // Determine journal cover style based on upgrade level
  const getJournalCoverStyle = () => {
    switch(currentUpgrade) {
      case 'base': return 'bg-gradient-to-b from-amber-800 to-amber-900';
      case 'technical': return 'bg-gradient-to-b from-clinical-dark to-clinical';
      case 'annotated': return 'bg-gradient-to-b from-clinical-dark to-clinical-light';
      case 'indexed': return 'bg-gradient-to-b from-blue-900 to-blue-700';
      case 'integrated': return 'bg-gradient-to-b from-educational-dark to-educational';
      default: return 'bg-gradient-to-b from-amber-800 to-amber-900';
    }
  };
  
  // Create individual tab components with strong interaction guarantees
  const TabButton = ({ id, label }: { id: 'knowledge' | 'characters' | 'notes' | 'references', label: string }) => (
    <div 
      className={`w-full cursor-pointer transition-colors ${currentPage === id ? 'bg-clinical text-white' : 'hover:bg-surface'}`}
      role="button"
      tabIndex={0}
      onClick={() => handleTabClick(id)}
      onKeyDown={(e) => e.key === 'Enter' && handleTabClick(id)}
    >
      <div className="p-2">
        <PixelText>{label}</PixelText>
      </div>
    </div>
  );
  
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-[9999] bg-black/70"
      onClick={handleClose} // Close when clicking background
      style={{ touchAction: 'none' }} // Prevent scroll on mobile
    >
      {/* Main journal container - stop propagation to prevent background click */}
      <div 
        className={`
          relative w-[900px] h-[650px] 
          ${getJournalCoverStyle()}
          pixel-borders
          transform transition-all duration-300
          ${isAnimating ? 'scale-95 opacity-90' : 'scale-100 opacity-100'}
        `}
        onClick={(e) => e.stopPropagation()} // Critical: prevent clicks from reaching background
      >
        {/* Journal cover decoration */}
        <div className="absolute inset-2 border border-amber-500/30"></div>
        
        {/* Night phase knowledge transfer particles */}
        {showParticles && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-50">
            <div className="absolute inset-0 bg-educational/10 animate-pulse"></div>
            <div className="absolute top-0 left-1/2 w-1 h-1 bg-educational rounded-full animate-ping"></div>
            <div className="absolute top-0 left-1/3 w-2 h-2 bg-clinical rounded-full animate-ping" style={{ animationDelay: '100ms' }}></div>
            <div className="absolute top-0 right-1/4 w-1 h-1 bg-qa rounded-full animate-ping" style={{ animationDelay: '300ms' }}></div>
            <div className="absolute top-0 left-2/3 w-2 h-2 bg-educational-light rounded-full animate-ping" style={{ animationDelay: '500ms' }}></div>
            <div className="absolute top-0 right-1/3 w-1 h-1 bg-clinical-light rounded-full animate-ping" style={{ animationDelay: '700ms' }}></div>
          </div>
        )}
        
        {/* Close button */}
        <div
          role="button"
          tabIndex={0}
          className="absolute -top-4 -right-4 w-8 h-8 bg-surface pixel-borders-thin flex items-center justify-center hover:bg-clinical transition-colors z-[100] cursor-pointer"
          onClick={handleClose}
          onKeyDown={(e) => e.key === 'Enter' && handleClose()}
          aria-label="Close journal"
        >
          <span>✕</span>
        </div>
        
        {/* Journal content */}
        <div className="flex h-full">
          {/* Tabs sidebar with enhanced buttons */}
          <div className="w-[200px] bg-surface-dark border-r border-border">
            <div className="p-4">
              <PixelText className="text-xl mb-4 text-center">Journal</PixelText>
              
              <div className="space-y-2">
                <TabButton id="knowledge" label="Knowledge" />
                <TabButton id="characters" label="Characters" />
                <TabButton id="notes" label="Notes" />
                <TabButton id="references" label="References" />
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
          
          {/* Journal pages - critical: needs to be a div, not a modal */}
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