// app/components/journal/Journal.tsx
'use client';
import { useState, useEffect } from 'react';
import { useJournalStore } from '@/app/store/journalStore'; // [source: 36, 1265]
import { useGameStore } from '@/app/store/gameStore'; // [source: 36, 1265]
import { useEventSubscription } from '@/app/core/events/CentralEventBus'; // [source: 36, 1265]
import { GameEventType } from '@/app/core/events/EventTypes'; // [source: 37, 1266]
import { PixelText } from '../PixelThemeProvider'; // *** ADDED IMPORT ***

// Define valid page types to ensure type safety across the UI
export type JournalPageType = 'knowledge' | 'characters' | 'notes' | 'references'; // [source: 37-38, 1266-1267]

// Simple placeholder components for the missing journal pages
const JournalKnowledgePage = () => (
  <div className="p-4">
    <h2 className="text-2xl mb-4">Knowledge</h2>
    <p className="text-gray-300">Knowledge entries will appear here as you discover them.</p>
  </div>
);
const JournalCharactersPage = () => ( // [source: 39, 1268]
  <div className="p-4">
    <h2 className="text-2xl mb-4">Characters</h2>
    <p className="text-gray-300">Character information will be recorded here.</p>
  </div>
);
const JournalNotesPage = () => ( // [source: 40, 1269]
  <div className="p-4">
    <h2 className="text-2xl mb-4">Notes</h2>
    <p className="text-gray-300">Your research notes will be collected here.</p>
  </div>
);
const JournalReferencesPage = () => ( // [source: 41, 1270]
  <div className="p-4">
    <h2 className="text-2xl mb-4">References</h2>
    <p className="text-gray-300">Reference materials will be cataloged here.</p>
  </div>
);

// *** REMOVED LOCAL PIXELTEXT DEFINITION *** [source: 42, 1271]

/**
 * Journal Component - Simplified for prototype
 */
export default function Journal() { // [source: 43, 1272]
  const {
    isOpen,
    currentPage,
    setCurrentPage,
    toggleJournal,
    currentUpgrade,
    hasJournal
  } = useJournalStore(); // [source: 43, 1272]
  const { gamePhase } = useGameStore(); // [source: 44, 1273]

  // Animation states
  const [isAnimating, setIsAnimating] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [showFloatingButton, setShowFloatingButton] = useState(false); // [source: 45, 1274]
  const [journalAnimating, setJournalAnimating] = useState(false); // [source: 45, 1274]

  // Listen for journal acquisition events
  useEventSubscription( // [source: 46, 1275]
    GameEventType.JOURNAL_ACQUIRED,
    (event) => {
      const payload = event.payload as any;
      if (payload) {
        // Show animation first
        setJournalAnimating(true);

        // Show floating button after animation completes
        setTimeout(() => {
          setJournalAnimating(false);
          setShowFloatingButton(true); // [source: 47, 1276]
        }, 3000);
      }
    },
    [] // [source: 47, 1276]
  );

  // Lock body when journal is open
  useEffect(() => { // [source: 48, 1277]
    if (isOpen) {
      // Store original overflow
      const originalOverflow = document.body.style.overflow;

      // Lock the background
      document.body.style.overflow = 'hidden';

      // Unlock when closing
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    } // [source: 49, 1278]
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
  useEffect(() => { // [source: 50, 1279]
    if (isOpen && gamePhase === 'night') {
      setShowParticles(true);

      const timer = setTimeout(() => setShowParticles(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, gamePhase]); // [source: 50, 1279]

  // Floating journal button when closed
  if (hasJournal && !isOpen && showFloatingButton) { // [source: 51, 1280]
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          className="px-4 py-2 bg-clinical text-white font-pixel hover:bg-clinical-light transition-colors shadow-lg animate-float"
          onClick={() => toggleJournal()}
        >
          Open Journal
        </button>
      </div> // [source: 52, 1281]
    );
  }

  // Don't render anything if player doesn't have journal or it's not open
  if (!hasJournal || !isOpen) return null; // [source: 52, 1281]

  // Determine journal cover style based on upgrade level
  const getJournalCoverStyle = () => { // [source: 53, 1282]
    switch(currentUpgrade) {
      case 'base': return 'bg-gradient-to-b from-amber-800 to-amber-900';
      case 'technical': return 'bg-gradient-to-b from-clinical-dark to-clinical'; // [source: 54, 1283]
      case 'annotated': return 'bg-gradient-to-b from-clinical-dark to-clinical-light'; // [source: 54, 1283]
      case 'indexed': return 'bg-gradient-to-b from-blue-900 to-blue-700'; // [source: 54, 1283]
      case 'integrated': return 'bg-gradient-to-b from-educational-dark to-educational'; // [source: 55, 1284]
      default: return 'bg-gradient-to-b from-amber-800 to-amber-900'; // [source: 55, 1284]
    }
  };

  return ( // [source: 56, 1285]
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
          journal-container // [source: 57, 1286]
          relative w-[900px] h-[650px]
          ${getJournalCoverStyle()}
          pixel-borders
          transform transition-all duration-300
          ${isAnimating ? 'scale-95 opacity-90' : 'scale-100 opacity-100'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Journal cover decoration */}
        <div className="absolute inset-2 border border-amber-500/30 pointer-events-none"></div> {/* [source: 58, 1287] */}

        {/* Night phase knowledge transfer particles */}
        {showParticles && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-50">
            <div className="absolute inset-0 bg-educational/10 animate-pulse"></div>
            <div className="absolute top-0 left-1/2 w-1 h-1 bg-educational rounded-full animate-ping"></div>
            <div className="absolute top-0 left-1/3 w-2 h-2 bg-clinical rounded-full animate-ping" style={{ animationDelay: '100ms' }}></div> {/* [source: 59, 1288] */}
            <div className="absolute top-0 right-1/4 w-1 h-1 bg-qa rounded-full animate-ping" style={{ animationDelay: '300ms' }}></div> {/* [source: 59, 1288] */}
            <div className="absolute top-0 left-2/3 w-2 h-2 bg-educational-light rounded-full animate-ping" style={{ animationDelay: '500ms' }}></div> {/* [source: 59, 1288] */}
            <div className="absolute top-0 right-1/3 w-1 h-1 bg-clinical-light rounded-full animate-ping" style={{ animationDelay: '700ms' }}></div> {/* [source: 59, 1288] */}
          </div> // [source: 60, 1289]
        )}

        {/* Close button */}
        <div
          role="button"
          tabIndex={0}
          className="absolute -top-4 -right-4 w-8 h-8 bg-surface pixel-borders-thin flex items-center justify-center hover:bg-clinical transition-colors z-[100] cursor-pointer"
          onClick={() => toggleJournal()}
          onKeyDown={(e) => { // [source: 61, 1290]
            if (e.key === 'Enter') {
              e.stopPropagation();
              toggleJournal(); // [source: 62, 1291]
            }
          }}
          aria-label="Close journal"
        >
          <span>✕</span>
        </div>

        {/* Journal content */}
        <div className="flex h-full journal-content relative z-10" onClick={(e) => e.stopPropagation()}>
          {/* Tabs sidebar with simplified buttons */}
          <div className="w-[200px] bg-surface-dark border-r border-border relative z-20"> {/* [source: 63, 1292] */}
            <div className="p-4">
              <PixelText className="text-xl mb-4 text-center">Journal</PixelText>

              <div className="space-y-2">
                {/* Tab buttons */}
                {['knowledge', 'characters', 'notes', 'references'].map((tabId) => ( // [source: 64, 1293]
                  <div
                    key={tabId}
                    className={`w-full cursor-pointer transition-colors relative z-30 ${currentPage === tabId ? 'bg-clinical text-white' : 'hover:bg-surface'}`}
                    role="button" // [source: 65, 1294]
                    tabIndex={0}
                    onClick={() => setCurrentPage(tabId as JournalPageType)} // [source: 65, 1294]
                  >
                    <div className="p-2">
                      <PixelText>{tabId.charAt(0).toUpperCase() + tabId.slice(1)}</PixelText> {/* [source: 66, 1295] */}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Journal quality indicator */}
            <div className="absolute bottom-4 left-4 w-[180px]"> {/* [source: 67, 1296] */}
              <div className="p-2 bg-surface-dark/70 text-center">
                <PixelText className="text-xs">
                  {currentUpgrade === 'base' && "Basic Notebook"}
                  {currentUpgrade === 'technical' && "Technical Journal"} {/* [source: 68, 1297] */}
                  {currentUpgrade === 'annotated' && "Annotated Journal"} {/* [source: 68, 1297] */}
                  {currentUpgrade === 'indexed' && "Indexed Compendium"} {/* [source: 68, 1297] */}
                  {currentUpgrade === 'integrated' && "Integrated Codex"} {/* [source: 68, 1297] */}
                </PixelText> {/* [source: 69, 1298] */}
              </div>
            </div>
          </div>

          {/* Journal pages */}
          <div
            className="flex-1 bg-surface overflow-y-auto p-6 relative z-20"
            onClick={(e) => e.stopPropagation()} // [source: 70, 1299]
          >
            {currentPage === 'knowledge' && <JournalKnowledgePage />}
            {currentPage === 'characters' && <JournalCharactersPage />}
            {currentPage === 'notes' && <JournalNotesPage />}
            {currentPage === 'references' && <JournalReferencesPage />}
          </div>
        </div>
      </div> {/* [source: 71, 1300] */}

      {/* CSS Animations (Keep these for now until consolidated) */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; } // [source: 71, 1300]
          50% { opacity: 0.7; } // [source: 72, 1301]
        }

        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0; // [source: 74, 1303]
          }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); } // [source: 74, 1303]
          50% { transform: translateY(-5px); } // [source: 75, 1304]
        } // [source: 76, 1305]

        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; // [source: 76, 1305]
        }

        .animate-ping {
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; // [source: 77, 1306]
        }

        .animate-float {
          animation: float 3s ease-in-out infinite; // [source: 78, 1307]
        }
      `}</style> {/* [source: 79, 1308] */}
    </div>
  );
} // [source: 80, 1309]