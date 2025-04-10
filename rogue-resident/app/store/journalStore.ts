// app/store/journalStore.ts
/**
 * Journal System
 * 
 * Manages the player's in-game journal - a record of discoveries, observations,
 * and character interactions that serves as both a narrative device and a
 * gameplay mechanic supporting knowledge acquisition.
 * 
 * Design Philosophy:
 * - Journal entries connect gameplay moments to knowledge context
 * - Entries evolve with the player's growing understanding
 * - Multiple sources (dialogue, observation, experiments) feed into journal
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { safeDispatch } from '@/app/core/events/CentralEventBus';
import { GameEventType } from '@/app/core/events/EventTypes';

// Journal entry categories to organize different types of notes
export type JournalCategory = 'Log' | 'Observation' | 'Personal' | 'Objective';

export type JournalTier = 'base' | 'technical' | 'annotated';

// Core interfaces
export interface JournalEntry {
  id: string;
  timestamp: Date;
  title: string;
  content: string;
  tags: string[];
  category: JournalCategory;
  isNew?: boolean; // Tracks entries the player hasn't viewed yet
  relatedConceptIds?: string[]; // Links to knowledge constellation
  mentorName?: string; // Associated mentor if from dialogue
  experimentData?: any; // Optional data from experiments
  location?: string; // Where entry was recorded
}

export interface CharacterNote {
  characterId: string;
  name: string;
  notes: string;
  lastUpdated: Date;
}

export interface CustomAnnotation {
  id: string;
  referenceId: string; // Entry ID or concept ID being annotated
  content: string;
  timestamp: Date;
  tags: string[];
}

interface JournalState {
  // Core state
  hasJournal: boolean; // Whether player has acquired journal
  currentUpgrade: JournalTier;
  entries: JournalEntry[];
  characterNotes: CharacterNote[];
  customAnnotations: CustomAnnotation[];
  isJournalOpen: boolean;
  activeEntryId: string | null;
  
  // Filters
  activeFilters: {
    categories: JournalCategory[];
    tags: string[];
    searchTerm: string;
  };
  
  // Methods
  addEntry: (entryData: Omit<JournalEntry, 'timestamp' | 'id'>) => void;
  addJournalEntry: (entryData: Omit<JournalEntry, 'timestamp' | 'id'>) => void; // Alias
  updateEntry: (id: string, content: string) => void;
  addCharacterNote: (characterId: string, name: string, notes: string) => void;
  updateCharacterNote: (characterId: string, notes: string) => void;
  addAnnotation: (referenceId: string, content: string, tags?: string[]) => void;
  markEntryAsRead: (id: string) => void;
  markAllEntriesAsRead: () => void;
  updateFilters: (filters: Partial<JournalState['activeFilters']>) => void;
  setJournalOpen: (isOpen: boolean) => void;
  setActiveEntry: (id: string | null) => void;
  upgradeJournal: (tier: JournalTier) => boolean;
  
  // Queries
  getNewEntryCount: () => number;
  getFilteredEntries: () => JournalEntry[];
  getEntryById: (id: string) => JournalEntry | null;
  
  // Development helpers
  clearJournal: () => void;
}

export const useJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
      // Initial state
      hasJournal: false,
      currentUpgrade: 'base',
      entries: [],
      characterNotes: [],
      customAnnotations: [],
      isJournalOpen: false,
      activeEntryId: null,
      activeFilters: {
        categories: [],
        tags: [],
        searchTerm: ''
      },
      
      // Add a new journal entry
      addEntry: (entryData: Omit<JournalEntry, 'timestamp' | 'id'>) => {
        const id = `journal-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        console.log(`Adding journal entry: ${id}`, entryData);
        
        set(state => ({
          entries: [
            ...state.entries,
            {
              id,
              timestamp: new Date(),
              ...entryData,
              isNew: true
            }
          ]
        }));
        
        // Fire appropriate events
        safeDispatch(GameEventType.JOURNAL_ENTRY_TRIGGERED, { 
          entryId: id, 
          title: entryData.title 
        }, 'journalStore');
      },
      
      // Alias for addEntry (for compatibility)
      addJournalEntry: (entryData: Omit<JournalEntry, 'timestamp' | 'id'>) => {
        get().addEntry(entryData);
      },
      
      // Update an existing entry's content
      updateEntry: (id: string, content: string) => {
        set(state => ({
          entries: state.entries.map(entry =>
            entry.id === id 
              ? { ...entry, content, isNew: false } 
              : entry
          )
        }));
      },
      
      // Add notes about a character
      addCharacterNote: (characterId: string, name: string, notes: string) => {
        set(state => {
          // Check if character already has notes
          const existingIndex = state.characterNotes.findIndex(
            note => note.characterId === characterId
          );
          
          if (existingIndex >= 0) {
            // Update existing note
            const updatedNotes = [...state.characterNotes];
            updatedNotes[existingIndex] = {
              ...updatedNotes[existingIndex],
              notes,
              lastUpdated: new Date()
            };
            return { characterNotes: updatedNotes };
          } else {
            // Add new character note
            return {
              characterNotes: [
                ...state.characterNotes,
                {
                  characterId,
                  name,
                  notes,
                  lastUpdated: new Date()
                }
              ]
            };
          }
        });
      },
      
      // Update an existing character note
      updateCharacterNote: (characterId: string, notes: string) => {
        set(state => ({
          characterNotes: state.characterNotes.map(note =>
            note.characterId === characterId
              ? { ...note, notes, lastUpdated: new Date() }
              : note
          )
        }));
      },
      
      // Add a custom annotation
      addAnnotation: (referenceId: string, content: string, tags: string[] = []) => {
        const id = nanoid();
        
        set(state => ({
          customAnnotations: [
            ...state.customAnnotations,
            {
              id,
              referenceId,
              content,
              timestamp: new Date(),
              tags
            }
          ]
        }));
      },
      
      // Mark a specific entry as read
      markEntryAsRead: (id: string) => {
        set(state => ({
          entries: state.entries.map(entry =>
            entry.id === id
              ? { ...entry, isNew: false }
              : entry
          )
        }));
      },
      
      // Mark all entries as read
      markAllEntriesAsRead: () => {
        set(state => ({
          entries: state.entries.map(entry => ({ ...entry, isNew: false }))
        }));
      },
      
      // Update active filters
      updateFilters: (filters: Partial<JournalState['activeFilters']>) => {
        set(state => ({
          activeFilters: {
            ...state.activeFilters,
            ...filters
          }
        }));
      },
      
      // Toggle journal open/closed
      setJournalOpen: (isOpen: boolean) => {
        set({ isJournalOpen: isOpen });
      },
      
      // Set the active entry
      setActiveEntry: (id: string | null) => {
        set({ activeEntryId: id });
        
        // If opening an entry, mark it as read
        if (id) {
          get().markEntryAsRead(id);
        }
      },
      
      // Upgrade the journal to a new tier
      upgradeJournal: (tier: JournalTier) => {
        const currentTier = get().currentUpgrade;
        const tierValues = { base: 1, technical: 2, annotated: 3 };
        
        // Only allow upgrades (no downgrades)
        if (tierValues[tier] <= tierValues[currentTier]) {
          console.warn(`Cannot downgrade journal from ${currentTier} to ${tier}`);
          return false;
        }
        
        set({ 
          currentUpgrade: tier,
          hasJournal: true
        });
        
        // Dispatch event
        safeDispatch(GameEventType.JOURNAL_ACQUIRED, { 
          tier, 
          character: 'player',
          source: 'upgrade'
        }, 'journalStore');
        
        return true;
      },
      
      // Get count of unread entries
      getNewEntryCount: () => {
        return get().entries.filter(entry => entry.isNew).length;
      },
      
      // Get entries filtered by active filters
      getFilteredEntries: () => {
        const { entries, activeFilters } = get();
        
        return entries.filter(entry => {
          // Category filter
          if (activeFilters.categories.length > 0 && !activeFilters.categories.includes(entry.category)) {
            return false;
          }
          
          // Tag filter
          if (activeFilters.tags.length > 0 && !activeFilters.tags.some(tag => entry.tags.includes(tag))) {
            return false;
          }
          
          // Search term
          if (activeFilters.searchTerm) {
            const searchLower = activeFilters.searchTerm.toLowerCase();
            return (
              entry.title.toLowerCase().includes(searchLower) ||
              entry.content.toLowerCase().includes(searchLower) ||
              entry.tags.some(tag => tag.toLowerCase().includes(searchLower))
            );
          }
          
          return true;
        });
      },
      
      // Get an entry by ID
      getEntryById: (id: string) => {
        return get().entries.find(entry => entry.id === id) || null;
      },
      
      // Clear the journal (for development/testing)
      clearJournal: () => {
        set({
          entries: [],
          characterNotes: [],
          customAnnotations: [],
          activeEntryId: null
        });
      }
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
      }),
    }
  )
);

// Optional: Add window debugging for non-production environments
if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  (window as any).__JOURNAL_DEBUG__ = {
    getState: () => useJournalStore.getState(),
    addTestEntry: (category: JournalCategory = 'Log') => {
      const sampleTitles = [
        'First Observations in Kapoor Wing',
        'Unusual Readings from Chamber A-7',
        'Conversation with Dr. Quinn',
        'Calibration Procedure Notes',
        'Thoughts on Electron Equilibrium'
      ];
      
      const sampleTags = [
        ['observation', 'kapoor', 'first-day'],
        ['anomaly', 'measurements', 'chamber-a7'],
        ['personnel', 'conversation', 'radiation-physics'],
        ['procedure', 'calibration', 'technical'],
        ['theory', 'electrons', 'physics']
      ];
      
      const randomIndex = Math.floor(Math.random() * sampleTitles.length);
      
      useJournalStore.getState().addEntry({
        title: sampleTitles[randomIndex],
        content: `This is a test journal entry for development purposes. Generated at ${new Date().toLocaleTimeString()}.`,
        category,
        tags: sampleTags[randomIndex]
      });
    },
    reset: () => useJournalStore.getState().clearJournal()
  };
}