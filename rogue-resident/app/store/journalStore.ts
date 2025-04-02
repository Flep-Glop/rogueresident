// app/store/journalStore.ts
import { create } from 'zustand';

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

export const useJournalStore = create<JournalState>((set) => ({
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
  initializeJournal: (upgrade = 'base') => set({
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
  }),
  
  upgradeJournal: (upgrade) => set({
    currentUpgrade: upgrade,
  }),
  
  addEntry: (entry) => set((state) => ({
    entries: [...state.entries, entry]
  })),
  
  updateCharacterNote: (characterId, note, relationshipChange = 0) => set((state) => {
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
  }),
  
  setAnnotation: (category, text) => set((state) => ({
    customAnnotations: {
      ...state.customAnnotations,
      [category]: text
    }
  })),
  
  toggleJournal: () => set((state) => ({
    isOpen: !state.isOpen
  })),
  
  setCurrentPage: (page) => set({
    currentPage: page
  }),
  
  // Special items
  addKapoorReferenceSheets: () => set({
    hasKapoorReferenceSheets: true
  }),
  
  addKapoorAnnotatedNotes: () => set({
    hasKapoorAnnotatedNotes: true
  })
}));