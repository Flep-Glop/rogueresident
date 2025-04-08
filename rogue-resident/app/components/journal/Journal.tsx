'use client';
import { useState, useEffect } from 'react';
import { useJournalStore } from '@/app/store/journalStore';
import { useGameStore } from '@/app/store/gameStore';

// Define valid page types to ensure type safety across the UI
export type JournalPageType = 'knowledge' | 'characters' | 'notes' | 'references';

// Simple placeholder components for the missing journal pages
const JournalKnowledgePage = () => (
  <div className="p-4">
    <h2 className="text-2xl mb-4">Knowledge</h2>
    <p className="text-gray-300">Knowledge entries will appear here as you discover them.</p>
  </div>
);

const JournalCharactersPage = () => (
  <div className="p-4">
    <h2 className="text-2xl mb-4">Characters</h2>
    <p className="text-gray-300">Character information will be recorded here.</p>
  </div>
);

const JournalNotesPage = () => (
  <div className="p-4">
    <h2 className="text-2xl mb-4">Notes</h2>
    <p className="text-gray-300">Your research notes will be collected here.</p>
  </div>
);

const JournalReferencesPage = () => (
  <div className="p-4">
    <h2 className="text-2xl mb-4">References</h2>
    <p className="text-gray-300">Reference materials will be cataloged here.</p>
  </div>
);

// Simple pixel text component 
const PixelText = ({ className = "", children }: { className?: string, children: React.ReactNode }) => (
  <div className={`font-pixel ${className}`}>{children}</div>
);

/**
 * Journal Component - Simplified for prototype
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
  
  // Animation states
  const [isAnimating, setIsAnimating] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  
  // Lock body when journal is open
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
  
  // Handle open/close animations
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      
      // After animation completes
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  
  // Special effects during night phase
  useEffect(() => {
    if (isOpen && gamePhase === 'night') {
      setShowParticles(true);
      
      const timer = setTimeout(() => setShowParticles(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, gamePhase]);
  
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

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-[9999] bg-black/70"
      onClick={(e) => {
        e.stopPropagation();
        toggleJournal();
      }}
      style={{ touchAction: 'none' }} // Prevent scroll on mobile
    >
      {/* Main journal container */}
      <div 
        className={`
          journal-container
          relative w-[900px] h-[650px] 
          ${getJournalCoverStyle()}
          pixel-borders
          transform transition-all duration-300
          ${isAnimating ? 'scale-95 opacity-90' : 'scale-100 opacity-100'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Journal cover decoration */}
        <div className="absolute inset-2 border border-amber-500/30 pointer-events-none"></div>
        
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
          onClick={() => toggleJournal()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.stopPropagation();
              toggleJournal();
            }
          }}
          aria-label="Close journal"
        >
          <span>✕</span>
        </div>
        
        {/* Journal content */}
        <div className="flex h-full journal-content relative z-10" onClick={(e) => e.stopPropagation()}>
          {/* Tabs sidebar with simplified buttons */}
          <div className="w-[200px] bg-surface-dark border-r border-border relative z-20">
            <div className="p-4">
              <PixelText className="text-xl mb-4 text-center">Journal</PixelText>
              
              <div className="space-y-2">
                {/* Tab buttons */}
                {['knowledge', 'characters', 'notes', 'references'].map((tabId) => (
                  <div 
                    key={tabId}
                    className={`w-full cursor-pointer transition-colors relative z-30 ${currentPage === tabId ? 'bg-clinical text-white' : 'hover:bg-surface'}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setCurrentPage(tabId as JournalPageType)}
                  >
                    <div className="p-2">
                      <PixelText>{tabId.charAt(0).toUpperCase() + tabId.slice(1)}</PixelText>
                    </div>
                  </div>
                ))}
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
          <div 
            className="flex-1 bg-surface overflow-y-auto p-6 relative z-20"
            onClick={(e) => e.stopPropagation()}
          >
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