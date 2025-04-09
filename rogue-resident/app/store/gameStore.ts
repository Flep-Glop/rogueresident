/**
 * @file app/store/gameStore.ts
 * @description Zustand store for managing global game state like day, phase, map data, etc.
 * Includes persistence and hydration logic. Uses hardcoded map data.
 */

import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import CentralEventBus from '@/app/core/events/CentralEventBus';
// Import type definitions - Assuming you create the types file
import { GameMap, MapNode } from '@/app/types/game';

// --- Define the Hardcoded Map Data Directly Here ---
// Based on the data found in your original gameStore.ts startGame function
const hardcodedMapData: GameMap = {
  id: 'kapoor-calib',
  name: 'Kapoor Calibration',
  nodes: [
      { id: 'calibration_node', name: 'Calibration Point', x: 50, y: 50, requiresJournal: true, phaseSpecific: 'day' },
      { id: 'second_node', name: 'Observation Post', x: 75, y: 75 },
      // Add more nodes as needed in the future
  ]
};
// ---------------------------------------------------


// Define the shape of the game state managed by this store
interface GameState {
  // Core State Properties
  day: number;
  phase: 'day' | 'night' | 'transition' | 'dialogue' | 'loading';
  mapData: GameMap | null;
  selectedNodeId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions - Functions to modify the state
  initializeMap: () => void;
  selectNode: (nodeId: string | null) => void;
  advanceDay: () => void;
  setPhase: (newPhase: GameState['phase']) => void;
  startGame: () => void;
  resetGame: () => void;
  setError: (message: string | null) => void;
  setLoading: (loading: boolean) => void;

  // Internal helper for hydration logic
  _hydrate: () => void;
}

// Define the initial state values
const initialState: Omit<GameState, 'initializeMap' | 'selectNode' | 'advanceDay' | 'setPhase' | 'startGame' | 'resetGame' | 'setError' | 'setLoading' | '_hydrate'> = {
  day: 1,
  phase: 'loading', // Start in 'loading' phase
  mapData: null,    // Map data is null initially, loaded by initializeMap or startGame
  selectedNodeId: null,
  isLoading: true,   // Assume loading initially
  error: null,
};

// Define a safe storage mechanism for persistence
const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(name) || null;
      }
    } catch (error) {
      console.warn(`LocalStorage unavailable or error reading item "${name}":`, error);
    }
    return null;
  },
  setItem: (name, value) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(name, value);
      }
    } catch (error) {
      console.warn(`LocalStorage unavailable or error setting item "${name}":`, error);
    }
  },
  removeItem: (name) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(name);
      }
    } catch (error) {
      console.warn(`LocalStorage unavailable or error removing item "${name}":`, error);
    }
  },
};


// Create the Zustand store with persistence middleware
export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // --- Actions Implementation ---

      /**
       * Initializes the map data using the hardcoded structure.
       * Ensures loading state is managed correctly.
       */
      initializeMap: () => {
         if (get().mapData) {
            console.log('🗺️ Map already initialized in store.');
             if (get().isLoading) {
                set({ isLoading: false });
             }
            return;
         }
         console.log('🗺️ Initializing map data in store (using hardcoded)...');
         set({ isLoading: true, error: null });
         try {
           // Use the hardcoded map data defined above
           const loadedMapData = hardcodedMapData;
           if (!loadedMapData) { throw new Error("Hardcoded map data is missing."); }

           set({
             mapData: loadedMapData,
             isLoading: false,
             phase: get().phase === 'loading' ? 'day' : get().phase,
             error: null,
           });
           console.log('🗺️ Hardcoded map data loaded successfully in store.');
           CentralEventBus.emit('map:loaded', { mapId: loadedMapData.id });

         } catch (err) {
           console.error("🗺️ Error loading hardcoded map data into store:", err);
           const errorMessage = err instanceof Error ? err.message : 'Failed to load map data.';
           set({ isLoading: false, error: errorMessage, phase: get().phase === 'loading' ? 'day' : get().phase, mapData: null });
         }
      },

      /**
       * Sets the currently selected map node ID.
       */
      selectNode: (nodeId: string | null) => {
        const currentNodeId = get().selectedNodeId;
        if (currentNodeId !== nodeId) {
            console.log(`[Store] Selecting node: ${nodeId ?? 'None'}`);
            set({ selectedNodeId: nodeId });
            if (nodeId) { CentralEventBus.emit('map:node:selected', { nodeId }); }
            else { CentralEventBus.emit('map:node:deselected', {}); }
        }
      },

      /**
       * Advances the game day by one, resets phase to 'day'.
       */
      advanceDay: () => {
        const currentDay = get().day;
        console.log(`[Store] Advancing day from ${currentDay} to ${currentDay + 1}`);
        set((state) => ({ day: state.day + 1, phase: 'day', selectedNodeId: null }));
        CentralEventBus.emit('state:day:changed', { newDay: get().day });
        CentralEventBus.emit('state:phase:changed', { newPhase: 'day' });
      },

      /**
       * Explicitly sets the game phase.
       */
      setPhase: (newPhase: GameState['phase']) => {
        const currentPhase = get().phase;
        if (currentPhase !== newPhase) {
            console.log(`[Store] Setting phase from ${currentPhase} to ${newPhase}`);
            set({ phase: newPhase });
            CentralEventBus.emit('state:phase:changed', { newPhase });
        }
      },

      /**
       * Resets the game state to initial values and loads the hardcoded starting map.
       */
       startGame: () => {
         console.log('🎮 Starting new game (GameStore)...');
         // Use the hardcoded map data defined at the top of the file
         const startingMapData = hardcodedMapData;
         set({
           ...initialState, // Reset state properties
           mapData: startingMapData, // Load the hardcoded map
           isLoading: false,
           phase: 'day', // Start in 'day' phase
         });
         console.log('🗺️ Using starting map with', startingMapData?.nodes?.length ?? 0, 'nodes');
         CentralEventBus.emit('game:started', {});
         CentralEventBus.emit('state:phase:changed', { newPhase: 'day' });
       },

      /**
       * Force resets the entire store state back to its defined initial values.
       */
      resetGame: () => {
        console.warn('🔄 Resetting game state forcefully...');
        set(initialState);
         get().initializeMap(); // Re-initialize map after reset
        CentralEventBus.emit('game:reset', {});
      },

      /** Sets the global error message state. */
      setError: (message: string | null) => set({ error: message }),

      /** Sets the global loading state. */
      setLoading: (loading: boolean) => set({ isLoading: loading }),

      /** Internal helper for post-hydration checks. */
      _hydrate: () => {
         console.log('🔄 Hydrating gameStore from persisted state...');
         const state = get();
         if (!state.mapData && !state.isLoading) {
             console.warn('🗺️ Hydrated state has no map data, attempting re-initialization.');
             get().initializeMap();
         } else if (state.mapData && state.isLoading) {
             console.warn('🗺️ Hydrated state has map data but isLoading is true. Correcting.');
             set({ isLoading: false });
         }
         if (state.phase === 'loading' && !state.isLoading) {
             console.warn("🗺️ Hydrated state phase is 'loading' but not actively loading. Setting to 'day'.");
             set({ phase: 'day' });
             CentralEventBus.emit('state:phase:changed', { newPhase: 'day' });
         }
         console.log('💧 Hydration checks complete.');
      },
    }),
    // --- Persistence Configuration ---
    {
      name: 'game-storage', // Key used in localStorage
      storage: createJSONStorage(() => safeLocalStorage), // Use safe localStorage wrapper
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('🚨 Failed to hydrate gameStore:', error);
        } else {
          console.log('💧 gameStore hydration process starting...');
           if (state) {
               setTimeout(() => state._hydrate(), 0); // Run checks after hydration settles
           }
        }
      },
    }
  )
);
