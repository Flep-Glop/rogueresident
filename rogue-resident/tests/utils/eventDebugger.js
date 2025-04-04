// tests/js/utils/eventDebugger.js
/**
 * Event Debugging Utility
 * 
 * A utility that attaches to your event bus during testing to provide
 * real-time diagnostics and event flow visualization.
 */

/**
 * Creates an event debugger that attaches to your existing event bus
 */
function createEventDebugger(eventBus) {
    let eventHistory = [];
    let listeners = [];
    let isRecording = false;
    let stateSnapshots = [];
    
    // Wrap the event bus dispatch method to capture events
    const originalDispatch = eventBus.dispatch;
    
    eventBus.dispatch = function wrappedDispatch(type, payload, source) {
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
      
      addListener(listener) {
        listeners.push(listener);
        return () => {
          listeners = listeners.filter(l => l !== listener);
        };
      },
      
      clearHistory() {
        eventHistory = [];
      },
      
      /**
       * Check if a specific sequence of events occurred in order
       * (not necessarily consecutively)
       */
      checkSequence(expectedSequence) {
        const actualSequence = this.getEventSequence();
        
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
      
      /**
       * Take a snapshot of the current game state for debugging
       */
      takeStateSnapshot(stores) {
        const snapshot = {
          timestamp: Date.now(),
          lastEvent: eventHistory.length > 0 ? eventHistory[eventHistory.length - 1] : null,
          state: {}
        };
        
        // Capture state from each store
        Object.entries(stores).forEach(([name, store]) => {
          snapshot.state[name] = { ...store };
          
          // Remove functions from snapshot for cleaner output
          Object.keys(snapshot.state[name]).forEach(key => {
            if (typeof snapshot.state[name][key] === 'function') {
              delete snapshot.state[name][key];
            }
          });
        });
        
        stateSnapshots.push(snapshot);
        return snapshot;
      },
      
      /**
       * Get all state snapshots
       */
      getStateSnapshots() {
        return [...stateSnapshots];
      },
      
      /**
       * Create a visual event flow (for terminal or HTML output)
       */
      createVisualEventFlow() {
        if (eventHistory.length === 0) return "No events recorded";
        
        // Get the timestamp of the first event for relative timing
        const firstTimestamp = eventHistory[0].timestamp;
        
        const eventLines = eventHistory.map((event, index) => {
          const relativeTime = event.timestamp - firstTimestamp;
          const prefix = index === 0 ? '┌' : index === eventHistory.length - 1 ? '└' : '├';
          const payloadPreview = formatPayload(event.payload);
          
          return `${prefix}─ [${relativeTime.toString().padStart(4, ' ')}ms] ${event.type} ${payloadPreview}`;
        });
        
        return eventLines.join('\n');
      },
      
      /**
       * Generate a Mermaid diagram of the event flow
       */
      generateMermaidDiagram() {
        if (eventHistory.length === 0) return "graph TD\n  NoEvents[No events recorded]";
        
        let diagram = "graph TD\n";
        let uniqueEvents = new Set();
        
        // Add nodes
        eventHistory.forEach((event, index) => {
          const id = `e${index}`;
          const label = `${event.type.split(':')[1] || event.type}\n${formatPayload(event.payload)}`;
          diagram += `  ${id}["${label}"]\n`;
          uniqueEvents.add(event.type);
        });
        
        // Add connections
        for (let i = 0; i < eventHistory.length - 1; i++) {
          diagram += `  e${i} --> e${i+1}\n`;
        }
        
        return diagram;
      },
      
      /**
       * Clean up by restoring original dispatch
       */
      cleanup() {
        eventBus.dispatch = originalDispatch;
        listeners = [];
        eventHistory = [];
        stateSnapshots = [];
      }
    };
  }
  
  /**
   * Helper to format payload for visualization
   */
  function formatPayload(payload) {
    if (!payload) return '';
    
    try {
      // Extract key information based on common payload shapes
      if (typeof payload === 'object') {
        if (payload.nodeId) return `(node: ${payload.nodeId})`;
        if (payload.character) return `(character: ${payload.character})`;
        if (payload.tier) return `(tier: ${payload.tier})`;
        if (payload.flowId) return `(flow: ${payload.flowId})`;
        
        // Try to get first key-value pair for other objects
        const keys = Object.keys(payload);
        if (keys.length > 0) {
          const key = keys[0];
          const value = payload[key];
          if (typeof value === 'string' || typeof value === 'number') {
            return `(${key}: ${value})`;
          }
        }
      }
      
      // Generic stringify for other cases
      const str = JSON.stringify(payload);
      if (str.length > 30) return str.substring(0, 27) + '...';
      return str;
    } catch (e) {
      return '[Complex payload]';
    }
  }
  
  module.exports = { createEventDebugger };