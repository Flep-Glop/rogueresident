// Emergency hotfix for event system issues
// Add this file to your app and import it in your main app entry point

/**
 * EMERGENCY HOTFIX FOR EVENT SYSTEM
 * 
 * This is a temporary solution to sanitize the event system and recover from
 * the React effect lifecycle issues we're encountering. Import this file early
 * in your application bootstrap to apply the fixes.
 * 
 * HOW TO USE:
 * 1. Add this file to your codebase (e.g., at app/core/events/InstallEmergencyHotfix.ts)
 * 2. Import it in your main entry point (e.g., app/page.tsx or app/layout.tsx)
 *    `import '@/app/core/events/InstallEmergencyHotfix';`
 * 3. The fixes will be applied automatically
 * 
 * After adding this, you should gradually migrate to the enhanced event system code
 * rather than relying on this emergency fix.
 */

// Function to sanitize eventbus listener sets
function sanitizeEventBusListeners() {
    if (typeof window === 'undefined') return;
    
    console.log('[HOTFIX] Checking for event system in window...');
    
    // Try to access the event bus through various paths
    const possiblePaths = [
      // Direct window property
      'useEventBus',
      // From Zustand store getter
      'getEventBusState',
      // From a global instance
      'APP_EVENT_BUS',
      // From debug globals
      '__EVENT_BUS_INSTANCE',
      '__EVENT_SYSTEM'
    ];
    
    let eventBus: any = null;
    let listeners: Map<string, Set<Function>> | null = null;
    
    // Try to find the event bus
    for (const path of possiblePaths) {
      try {
        if ((window as any)[path]) {
          const potential = (window as any)[path];
          
          // Check if it has a getState method (Zustand)
          if (typeof potential.getState === 'function') {
            const state = potential.getState();
            if (state && state.listeners instanceof Map) {
              eventBus = potential;
              listeners = state.listeners;
              console.log(`[HOTFIX] Found event bus at window.${path}`);
              break;
            }
          }
          
          // Check if it has listeners directly
          if (potential.listeners instanceof Map) {
            eventBus = potential;
            listeners = potential.listeners;
            console.log(`[HOTFIX] Found event bus at window.${path}`);
            break;
          }
        }
      } catch (e) {
        // Continue checking other paths
      }
    }
    
    // If we couldn't find it through globals, try to import it
    if (!eventBus) {
      try {
        console.log('[HOTFIX] Attempting to dynamically import event bus...');
        
        // Try multiple possible paths to find the event bus
        Promise.any([
          import('@/app/core/events/CentralEventBus'),
          import('./CentralEventBus'),
          import('../../core/events/CentralEventBus')
        ]).then(module => {
          if (module.default && typeof module.default.getState === 'function') {
            const state = module.default.getState();
            if (state && state.listeners instanceof Map) {
              sanitizeListeners(state.listeners);
            }
          }
        }).catch(error => {
          console.error('[HOTFIX] Failed to import event bus:', error);
        });
        
        return; // Return early since we're handling it in the import
      } catch (e) {
        console.error('[HOTFIX] Dynamic import failed:', e);
      }
    }
    
    // If we found listeners, sanitize them
    if (listeners) {
      sanitizeListeners(listeners);
    } else {
      console.error('[HOTFIX] Could not find event bus listeners to sanitize');
    }
  }
  
  // Function to clean up listener sets
  function sanitizeListeners(listeners: Map<string, Set<Function>>) {
    console.log('[HOTFIX] Sanitizing event listeners...');
    let totalListeners = 0;
    let totalRemoved = 0;
    
    // Check each event type
    for (const [eventType, listenerSet] of listeners.entries()) {
      totalListeners += listenerSet.size;
      
      // Filter out invalid listeners
      const validListeners = Array.from(listenerSet).filter(listener => {
        try {
          // Basic type check
          return typeof listener === 'function';
        } catch (e) {
          return false;
        }
      });
      
      // If we removed listeners, update the set
      if (validListeners.length !== listenerSet.size) {
        const removedCount = listenerSet.size - validListeners.length;
        totalRemoved += removedCount;
        
        console.log(`[HOTFIX] Removed ${removedCount} invalid listeners for ${eventType}`);
        listeners.set(eventType, new Set(validListeners));
      }
    }
    
    console.log(`[HOTFIX] Sanitization complete. Checked ${totalListeners} listeners, removed ${totalRemoved}.`);
  }
  
  // Install global emergency recovery utilities
  function installEmergencyRecovery() {
    if (typeof window === 'undefined') return;
    
    console.log('[HOTFIX] Installing emergency recovery utilities...');
    
    // Add cleanup function to window
    (window as any).__SANITIZE_EVENT_SYSTEM__ = () => {
      console.log('[RECOVERY] Manual event system sanitization requested...');
      sanitizeEventBusListeners();
      return 'Event system sanitization complete';
    };
    
    // Add journal force function to window if it doesn't exist
    if (!(window as any).__FORCE_JOURNAL_ACQUISITION__) {
      (window as any).__FORCE_JOURNAL_ACQUISITION__ = () => {
        console.log('[RECOVERY] Attempting to force journal acquisition...');
        
        try {
          // Try multiple possible import paths
          Promise.any([
            import('@/app/store/journalStore'),
            import('../../store/journalStore'),
          ]).then(module => {
            const journalStore = module.useJournalStore.getState();
            if (!journalStore.hasJournal) {
              journalStore.initializeJournal('technical');
              console.log('[RECOVERY] Journal initialized successfully');
              return true;
            } else {
              console.log('[RECOVERY] Journal already exists');
              return false;
            }
          }).catch(error => {
            console.error('[RECOVERY] Failed to import journal store:', error);
            return false;
          });
        } catch (e) {
          console.error('[RECOVERY] Journal acquisition failed:', e);
          return false;
        }
      };
    }
    
    // Add a utility to dump event diagnostics
    (window as any).__DUMP_EVENT_DIAGNOSTICS__ = () => {
      try {
        // Try to find all event-related state
        const diagnostics: any = { 
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV,
        };
        
        // Check for global state
        if ((window as any).useEventBus && typeof (window as any).useEventBus.getState === 'function') {
          const state = (window as any).useEventBus.getState();
          
          diagnostics.eventBus = {
            found: true,
            listenerCount: 0,
            eventTypes: []
          };
          
          if (state.listeners instanceof Map) {
            const listenersByType: Record<string, number> = {};
            let totalListeners = 0;
            
            for (const [type, listeners] of state.listeners.entries()) {
              listenersByType[type] = listeners.size;
              totalListeners += listeners.size;
            }
            
            diagnostics.eventBus.listenerCount = totalListeners;
            diagnostics.eventBus.listenersByType = listenersByType;
            diagnostics.eventBus.eventTypes = Object.keys(listenersByType);
          }
        } else {
          diagnostics.eventBus = { found: false };
        }
        
        // Check for journal system
        try {
          // Try multiple possible import paths
          Promise.any([
            import('@/app/store/journalStore'),
            import('../../store/journalStore'),
          ]).then(module => {
            if (module.useJournalStore && typeof module.useJournalStore.getState === 'function') {
              const journalState = module.useJournalStore.getState();
              
              diagnostics.journalSystem = {
                found: true,
                hasJournal: journalState.hasJournal,
                tier: journalState.currentUpgrade
              };
            } else {
              diagnostics.journalSystem = { found: false };
            }
            
            // Output the full diagnostics once journal check is complete
            console.log('[DIAGNOSTICS] Event System State:', diagnostics);
            return diagnostics;
            
          }).catch(error => {
            diagnostics.journalSystem = { found: false, error: error.message };
            console.log('[DIAGNOSTICS] Event System State:', diagnostics);
            return diagnostics;
          });
        } catch (e) {
          diagnostics.journalSystem = { found: false, error: e instanceof Error ? e.message : String(e) };
          console.log('[DIAGNOSTICS] Event System State:', diagnostics);
          return diagnostics;
        }
        
        return 'Diagnostics running asynchronously, check console for results...';
      } catch (e) {
        console.error('[DIAGNOSTICS] Failed to gather event diagnostics:', e);
        return 'Error gathering diagnostics, check console for details.';
      }
    };
  }
  
  // Run the hotfix
  try {
    console.log('📡 Applying emergency event system hotfix...');
    sanitizeEventBusListeners();
    installEmergencyRecovery();
    console.log('✅ Event system hotfix applied successfully');
    
    // Schedule regular cleanup for long sessions
    if (typeof window !== 'undefined') {
      const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
      
      console.log(`🕒 Scheduling automatic cleanups every ${CLEANUP_INTERVAL / 60000} minutes`);
      
      const cleanupInterval = setInterval(() => {
        console.log('🧹 Running scheduled event system cleanup...');
        sanitizeEventBusListeners();
      }, CLEANUP_INTERVAL);
      
      // Clean up interval if module hot reloads
      if (module.hot) {
        module.hot.dispose(() => {
          console.log('♻️ Hot module reload detected, clearing cleanup interval');
          clearInterval(cleanupInterval);
        });
      }
    }
  } catch (error) {
    console.error('❌ Error applying event system hotfix:', error);
  }
  
  export default 'Emergency hotfix for event system applied';