// app/store/journalStore.ts
/**
 * Journal Store for Vertical Slice
 * 
 * Streamlined implementation focused on the core vertical slice experience
 * of obtaining and using a journal from Dr. Kapoor's interactions.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { GameEventType } from '../core/events/EventTypes';
import { useEventBus, safeDispatch } from '../core/events/CentralEventBus';

export type JournalEntry = {
  id: string;
  title: string;
  date: string;
  content: string;
  tags: string[];
  relatedConcepts?: string[];
};

export type JournalCharacterNote = {
  characterId: string;
  notes: string;
  relationshipLevel: number;
  lastInteraction: string;
};

export type JournalUpgrade = 
  | 'base'        // Basic notebook (all players)
  | 'technical'   // Technical upgrade from decent Kapoor performance
  | 'annotated';  // Special upgrade from excellent Kapoor performance

type JournalState = {
  // Core journal properties
  hasJournal: boolean;
  currentUpgrade: JournalUpgrade;
  entries: JournalEntry[];
  characterNotes: JournalCharacterNote[];
  customAnnotations: Record<string, string>; // Custom player notes by category
  
  // Journal upgrade items - focused on Kapoor for vertical slice
  hasKapoorReferenceSheets: boolean;
  hasKapoorAnnotatedNotes: boolean;
  
  // Journal UI state
  isOpen: boolean;
  currentPage: 'knowledge' | 'characters' | 'notes' | 'references';
  
  // Actions
  initializeJournal: (upgrade?: JournalUpgrade) => void;
  upgradeJournal: (upgrade: JournalUpgrade) => void;
  addEntry: (entry: JournalEntry) => void;
  updateCharacterNote: (characterId: string, note: string, relationshipChange?: number) => void;
  setAnnotation: (category: string, text: string) => void;
  toggleJournal: () => void;
  setCurrentPage: (page: 'knowledge' | 'characters' | 'notes' | 'references') => void;
  
  // Special items - focused on Kapoor for vertical slice
  addKapoorReferenceSheets: () => void;
  addKapoorAnnotatedNotes: () => void;
};

// Create persisted store to ensure journal state survives refreshes
export const useJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
      // Initial state
      hasJournal: false,
      currentUpgrade: 'base',
      entries: [],
      characterNotes: [],
      customAnnotations: {},
      
      hasKapoorReferenceSheets: false,
      hasKapoorAnnotatedNotes: false,
      
      isOpen: false,
      currentPage: 'knowledge',
      
      // Actions
      initializeJournal: (upgrade = 'base') => {
        // Only initialize if journal doesn't already exist
        if (get().hasJournal) {
          console.log('[JOURNAL] Journal already initialized, skipping');
          return;
        }
        
        console.log(`[JOURNAL] Initializing journal with upgrade: ${upgrade}`);
        
        set({
          hasJournal: true,
          currentUpgrade: upgrade,
          entries: [
            {
              id: 'initial',
              title: 'Journal Initialized',
              date: new Date().toISOString(),
              content: 'This journal has been provided to track your medical physics residency progress.',
              tags: ['system']
            }
          ]
        });
        
        // Emit simplified UI event when journal is initialized
        safeDispatch(
          GameEventType.UI_BUTTON_CLICKED, 
          {
            componentId: 'journal',
            action: 'initialize',
            metadata: {
              upgrade,
              source: 'initializeJournal'
            }
          }
        );
      },
      
      upgradeJournal: (upgrade) => {
        set({
          currentUpgrade: upgrade,
        });
      },
      
      addEntry: (entry) => {
        // Check for duplicate entries by ID
        const existingEntry = get().entries.find(e => e.id === entry.id);
        if (existingEntry) {
          console.log(`[JOURNAL] Entry with ID ${entry.id} already exists, skipping`);
          return;
        }
        
        set((state) => ({
          entries: [...state.entries, entry]
        }));
      },
      
      updateCharacterNote: (characterId, note, relationshipChange = 0) => {
        set((state) => {
          const existingNoteIndex = state.characterNotes.findIndex(n => n.characterId === characterId);
          
          if (existingNoteIndex >= 0) {
            // Update existing note
            const updatedNotes = [...state.characterNotes];
            updatedNotes[existingNoteIndex] = {
              ...updatedNotes[existingNoteIndex],
              notes: note,
              relationshipLevel: Math.max(0, Math.min(5, updatedNotes[existingNoteIndex].relationshipLevel + relationshipChange)),
              lastInteraction: new Date().toISOString()
            };
            return { characterNotes: updatedNotes };
          } else {
            // Add new note
            return {
              characterNotes: [
                ...state.characterNotes,
                {
                  characterId,
                  notes: note,
                  relationshipLevel: Math.max(0, Math.min(5, relationshipChange)),
                  lastInteraction: new Date().toISOString()
                }
              ]
            };
          }
        });
      },
      
      setAnnotation: (category, text) => set((state) => ({
        customAnnotations: {
          ...state.customAnnotations,
          [category]: text
        }
      })),
      
      toggleJournal: () => {
        const nextIsOpen = !get().isOpen;
        set({ isOpen: nextIsOpen });
        
        // Use UI_BUTTON_CLICKED instead of specific journal events
        safeDispatch(
          GameEventType.UI_BUTTON_CLICKED, 
          { 
            componentId: 'journal',
            action: nextIsOpen ? 'open' : 'close',
            metadata: { page: get().currentPage }
          }
        );
      },
      
      setCurrentPage: (page) => set({
        currentPage: page
      }),
      
      // Special items - focused on Kapoor for vertical slice
      addKapoorReferenceSheets: () => {
        set({
          hasKapoorReferenceSheets: true
        });
        
        // Add entry about reference sheets
        get().addEntry({
          id: 'kapoor-reference-sheets',
          title: 'Calibration Reference Sheets',
          date: new Date().toISOString(),
          content: 'Dr. Kapoor has provided standard reference sheets for calibration procedures. These include baseline values, tolerance tables, and correction factor references.',
          tags: ['kapoor', 'reference', 'calibration']
        });
      },
      
      addKapoorAnnotatedNotes: () => {
        set({
          hasKapoorAnnotatedNotes: true
        });
        
        // Add entry about annotated notes
        get().addEntry({
          id: 'kapoor-annotated-notes',
          title: 'Annotated Protocol Notes',
          date: new Date().toISOString(),
          content: 'Dr. Kapoor has shared his own annotated protocol notes, with insights from years of experience. These annotations highlight common pitfalls and efficiency improvements not found in standard documentation.',
          tags: ['kapoor', 'protocols', 'advanced']
        });
      },
    }),
    {
      name: 'rogue-resident-journal', // Local storage key
      storage: createJSONStorage(() => localStorage),
      // Only persist these keys
      partialize: (state) => ({
        hasJournal: state.hasJournal,
        currentUpgrade: state.currentUpgrade,
        entries: state.entries,
        characterNotes: state.characterNotes,
        customAnnotations: state.customAnnotations,
        hasKapoorReferenceSheets: state.hasKapoorReferenceSheets,
        hasKapoorAnnotatedNotes: state.hasKapoorAnnotatedNotes,
      }),
    }
  )
);

// Critical progression guarantor - ensures journal is available if required progression is met
export const ensureJournalProgression = () => {
  // This would be called at critical checkpoints like loading a saved game
  // or after completing critical nodes, to ensure progression items exist
  
  const currentState = useJournalStore.getState();
  const eventBus = useEventBus.getState();
  
  // Check for completed Kapoor node in recent event history
  const recentNodeCompletions = eventBus.getEventHistory(GameEventType.NODE_COMPLETED, 20);
  const hasCompletedKapoorNode = recentNodeCompletions.some(event => {
    const payload = event.payload as any;
    return payload.character === 'kapoor' && payload.result?.isJournalAcquisition;
  });
  
  // If we've completed a Kapoor journal node but don't have a journal, fix it
  if (hasCompletedKapoorNode && !currentState.hasJournal) {
    console.warn('[JournalProgression] Critical progression issue detected: Kapoor node completed but no journal found');
    
    // Fix by initializing journal
    currentState.initializeJournal('technical');
    
    // Report fix through event system
    safeDispatch(
      GameEventType.JOURNAL_ACQUIRED,
      {
        tier: 'technical',
        character: 'kapoor',
        source: 'progression_recovery',
        forced: true
      },
      'journal_progression_recovery'
    );
    
    return true; // Repairs were needed
  }
  
  return false; // No repairs needed
};

// Helper for other systems to easily check journal state
export const getJournalState = () => {
  return {
    hasJournal: useJournalStore.getState().hasJournal,
    currentUpgrade: useJournalStore.getState().currentUpgrade
  };
};

export default useJournalStore;