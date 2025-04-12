'use client';
import { useEffect, useState } from 'react';

export default function BuildInfo() {
  const [buildTime, setBuildTime] = useState('Loading...');
  const [initState, setInitState] = useState<any>('Checking...');
  
  useEffect(() => {
    setBuildTime(new Date().toISOString());
    
    // Check initialization state
    const checkInitState = () => {
      if (typeof window !== 'undefined') {
        const state = (window as any).__INIT_STATE__;
        setInitState(
          state ? 
          `Init: ${state.completed ? 'Complete' : 'Pending'} (${state.attempts} attempts)` : 
          'Not available'
        );
      }
    };
    
    // Check immediately and then every 2 seconds
    checkInitState();
    const interval = setInterval(checkInitState, 2000);
    
    // Add debugging helpers to window
    if (typeof window !== 'undefined') {
      (window as any).__DEV_UTILS__ = {
        clearCaches: () => {
          try {
            // Clear localStorage
            localStorage.clear();
            // Clear session storage
            sessionStorage.clear();
            // Request cache reload
            window.location.reload();
            return "Cache clear requested";
          } catch (e) {
            return `Error clearing cache: ${e}`;
          }
        },
        forceReinit: () => {
          try {
            if ((window as any).__FORCE_REINITIALIZE__) {
              (window as any).__FORCE_REINITIALIZE__();
              return "Reinitialization triggered";
            }
            return "Reinit function not available";
          } catch (e) {
            return `Error triggering reinit: ${e}`;
          }
        },
        getInitState: () => {
          return (window as any).__INIT_STATE__ || 'Not available';
        },
        getGameState: () => {
          if ((window as any).__GAME_STATE_MACHINE_DEBUG__?.getCurrentState) {
            return (window as any).__GAME_STATE_MACHINE_DEBUG__.getCurrentState();
          }
          return 'Not available';
        }
      };
    }
    
    return () => {
      clearInterval(interval);
    };
  }, []);
  
  // Only show in development
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <div 
      style={{ 
        position: 'fixed', 
        bottom: 0, 
        right: 0, 
        background: 'rgba(0,0,0,0.8)', 
        color: '#0f0', 
        padding: '3px 6px', 
        fontSize: '10px',
        zIndex: 9999,
        fontFamily: 'monospace',
        borderRadius: '4px 0 0 0',
        borderTop: '1px solid #333',
        borderLeft: '1px solid #333',
      }}
    >
      <div>{buildTime}</div>
      <div>{initState}</div>
      <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
        <button 
          onClick={() => (window as any).__DEV_UTILS__.clearCaches()}
          style={{ 
            background: '#333', 
            border: 'none', 
            color: '#fff', 
            cursor: 'pointer',
            fontSize: '9px',
            padding: '2px 4px',
            borderRadius: '2px'
          }}
        >
          Clear Cache
        </button>
        <button 
          onClick={() => (window as any).__DEV_UTILS__.forceReinit()}
          style={{ 
            background: '#663399', 
            border: 'none', 
            color: '#fff', 
            cursor: 'pointer',
            fontSize: '9px',
            padding: '2px 4px',
            borderRadius: '2px'
          }}
        >
          Reinit
        </button>
      </div>
    </div>
  );
}