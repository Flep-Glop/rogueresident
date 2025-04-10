// app/components/debug/ChamberDebugInitializer.tsx
/**
 * Chamber Debug Initializer
 * 
 * Sets up the Chamber Pattern debugging tools in development environments.
 * This component doesn't render anything visible, it only initializes the
 * debugging environment.
 */
import { useEffect } from 'react';
import { resetRenderStats } from '@/app/core/utils/chamberDebug';
import { createTrackedStores } from '@/app/core/utils/storeAnalyzer';

const ChamberDebugInitializer: React.FC = () => {
  useEffect(() => {
    console.log('[ChamberDebug] Initializing chamber pattern debugging tools');
    
    try {
      // Reset all component render statistics
      resetRenderStats();
      
      // Set up store monitoring
      createTrackedStores();
      
      // Expose global debug commands
      if (typeof window !== 'undefined') {
        (window as any).__CHAMBER_PATTERN_VERSION__ = '1.0.0';
        
        // Simple API to reset tracking
        (window as any).__RESET_CHAMBER_DEBUG__ = () => {
          console.log('[ChamberDebug] Resetting chamber pattern stats');
          resetRenderStats();
          if ((window as any).__STORE_ANALYZER__?.reset) {
            (window as any).__STORE_ANALYZER__.reset();
          }
        };
      }
    } catch (error) {
      console.error('[ChamberDebug] Error initializing debugging tools:', error);
    }
    
    return () => {
      console.log('[ChamberDebug] Cleaning up chamber pattern debugging tools');
      // Cleanup logic if needed
    };
  }, []);
  
  // This component doesn't render anything
  return null;
};

export default ChamberDebugInitializer;