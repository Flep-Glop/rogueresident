// tests/utils/eventDebugger.ts
/**
 * Event Debugging Utility
 * 
 * A utility that attaches to your event bus during testing to provide
 * real-time diagnostics and event flow visualization.
 */

import { GameEventType } from '../../app/core/events/CentralEventBus';

export type EventSequence = Array<{
  type: GameEventType;
  payload: any;
  timestamp: number;
}>;

/**
 * Creates an event debugger that attaches to your existing event bus
 */
export function createEventDebugger(eventBus: any) {
  let eventHistory: EventSequence = [];
  let listeners: Array<(event: any) => void> = [];
  let isRecording = false;
  
  // Wrap the event bus dispatch method to capture events
  const originalDispatch = eventBus.dispatch;
  
  eventBus.dispatch = function wrappedDispatch(type: GameEventType, payload: any, source?: string) {
    // Call original dispatch
    const result = originalDispatch.call(this, type, payload, source);
    
    // Record event if we're recording
    if (isRecording) {
      const eventRecord = {
        type,
        payload,
        timestamp: Date.now(),
        source
      };
      
      eventHistory.push(eventRecord);
      
      // Notify listeners
      listeners.forEach(listener => listener(eventRecord));
      
      // Log event in a structured format
      console.log(`[EVENT] ${type}`, {
        payload,
        source
      });
    }
    
    return result;
  };
  
  return {
    startRecording() {
      eventHistory = [];
      isRecording = true;
      console.log("Event recording started");
    },
    
    stopRecording() {
      isRecording = false;
      console.log("Event recording stopped");
    },
    
    getEventHistory() {
      return [...eventHistory];
    },
    
    getEventSequence() {
      return eventHistory.map(e => e.type);
    },
    
    addListener(listener: (event: any) => void) {
      listeners.push(listener);
      return () => {
        listeners = listeners.filter(l => l !== listener);
      };
    },
    
    clearHistory() {
      eventHistory = [];
    },
    
    checkSequence(expectedSequence: GameEventType[]) {
      const actualSequence = this.getEventSequence();
      
      // Check if the actual sequence contains the expected sequence in order
      // (though not necessarily consecutively)
      let matchIndex = 0;
      for (let i = 0; i < actualSequence.length; i++) {
        if (actualSequence[i] === expectedSequence[matchIndex]) {
          matchIndex++;
          if (matchIndex === expectedSequence.length) {
            return true;
          }
        }
      }
      
      return false;
    },
    
    // Clean up by restoring original dispatch
    cleanup() {
      eventBus.dispatch = originalDispatch;
      listeners = [];
      eventHistory = [];
    }
  };
}