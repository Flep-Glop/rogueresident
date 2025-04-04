// app/store/journalStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { GameEventType, legacyEventBus } from '../core/events/GameEvents';

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
  | 'annotated'   // Special upgrade from excellent Kapoor performance
  | 'indexed'     // Better organization (after first boss)
  | 'integrated'; // Special references from characters

type JournalState = {
  // Core journal properties
  hasJournal: boolean;
  currentUpgrade: JournalUpgrade;
  entries: JournalEntry[];
  characterNotes: JournalCharacterNote[];
  customAnnotations: Record<string, string>; // Custom player notes by category
  
  // Journal upgrade items
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
  
  // Special items
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
        
        // Emit event when journal is initialized
        if (typeof window !== 'undefined') {
          // Get event bus and emit event
          const eventBus = legacyEventBus.getState();
          if (eventBus) {
            eventBus.dispatch(GameEventType.UI_JOURNAL_OPENED, {
              upgrade,
              source: 'initializeJournal'
            });
          }
        }
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
        
        // Emit events for journal open/close
        if (typeof window !== 'undefined') {
          const eventBus = legacyEventBus.getState();
          if (eventBus) {
            eventBus.dispatch(
              nextIsOpen ? GameEventType.UI_JOURNAL_OPENED : GameEventType.UI_JOURNAL_CLOSED, 
              { page: get().currentPage }
            );
          }
        }
      },
      
      setCurrentPage: (page) => set({
        currentPage: page
      }),
      
      // Special items
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
  
  // Add any critical progression checks and repairs here
  // For example, ensuring the journal exists if we detect a completed calibration node
  // in the event history
  
  // Return true if repairs were needed
  return false;
};

// Helper for other systems to easily check journal state
export const getJournalState = () => {
  return {
    hasJournal: useJournalStore.getState().hasJournal,
    currentUpgrade: useJournalStore.getState().currentUpgrade
  };
};

export default useJournalStore;