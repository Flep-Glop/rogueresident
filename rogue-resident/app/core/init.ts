// app/core/init.ts
/**
 * Core System Initialization
 * 
 * This module initializes all core architectural services in the correct order
 * to ensure proper system dependencies and event handling.
 */

import { GameEventType } from './events/EventTypes';
import { useEventBus } from './events/CentralEventBus';
import { setupGameStateMachine } from './statemachine/GameStateMachine';
import { setupStateBridge } from './statemachine/GameStateBridge';
import { setupProgressionService } from './progression/ProgressionService';

export function initializeSystems() {
  console.log('🚀 Initializing core systems...');
  
  // Start order is important for dependencies
  
  // 1. Set up core event bus first (no dependencies)
  console.log('📡 Initializing event system...');
  const eventCleanup = () => {
    useEventBus.getState().clearEventLog();
  };
  
  // 2. Set up state machine (depends on event bus)
  console.log('🔄 Initializing state machine...');
  const stateMachineCleanup = setupGameStateMachine();
  
  // 3. Set up state bridge (depends on event bus and state machine)
  console.log('🌉 Initializing state bridge...');
  const bridgeCleanup = setupStateBridge();
  
  // 4. Set up progression service (depends on event bus)
  console.log('📈 Initializing progression service...');
  const progressionCleanup = setupProgressionService();
  
  // 5. Dispatch session start event to signal systems are ready
  console.log('✅ Core systems initialized, starting session...');
  useEventBus.getState().dispatch(
    GameEventType.SESSION_STARTED,
    { timestamp: Date.now() }
  );
  
  // Return cleanup function
  return () => {
    // Clean up in reverse order
    progressionCleanup();
    bridgeCleanup();
    stateMachineCleanup();
    eventCleanup();
    
    // Signal session end
    useEventBus.getState().dispatch(
      GameEventType.SESSION_ENDED,
      { timestamp: Date.now() }
    );
  };
}

export default { initializeSystems };