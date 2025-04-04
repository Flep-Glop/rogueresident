// tests/js/utils/testEventRecorder.js
/**
 * Test Event Recorder
 * 
 * A utility that creates an in-memory recorder for tracking events during tests.
 * This avoids relying on the actual event bus implementation and provides
 * a deterministic way to validate event sequences.
 */

/**
 * Creates a test event recorder with methods to record, query and clear events
 */
function createTestEventRecorder() {
    // In-memory storage of recorded events
    const events = [];
    
    // Record a new event
    const recordEvent = (type, payload, source) => {
      const event = {
        type,
        payload,
        timestamp: Date.now(),
        source: source || 'test',
        id: `test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
      };
      
      events.push(event);
      return event;
    };
    
    // Get all recorded events
    const getAllEvents = () => [...events];
    
    // Get events by type
    const getEventsByType = (type) => events.filter(e => e.type === type);
    
    // Check if a specific event type exists
    const hasEventType = (type) => events.some(e => e.type === type);
    
    // Check if an event matches specific criteria
    const hasEventMatching = (predicate) => events.some(predicate);
    
    // Clear all recorded events
    const clearEvents = () => {
      events.length = 0;
    };
    
    // Get count of specific event type
    const getEventTypeCount = (type) => 
      events.filter(e => e.type === type).length;
    
    // Get the sequence of event types (useful for validating order)
    const getEventTypeSequence = () => events.map(e => e.type);
    
    // Check if a specific sequence of events occurred in order
    const checkSequence = (expectedSequence) => {
      const actualSequence = getEventTypeSequence();
      
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
    };
    
    // Get event flow visualization (for debugging)
    const getEventFlowVisualization = () => {
      if (events.length === 0) return "No events recorded";
      
      return events.map((e, i) => {
        const prefix = i === 0 ? '┌' : i === events.length - 1 ? '└' : '├';
        
        // Format timestamp as relative time (ms from first event)
        const firstTimestamp = events[0].timestamp;
        const relativeTime = e.timestamp - firstTimestamp;
        
        return `${prefix}─ [${relativeTime.toString().padStart(4, ' ')}ms] ${e.type} ${formatPayload(e.payload)}`;
      }).join('\n');
    };
    
    // Helper to format payload for visualization
    const formatPayload = (payload) => {
      if (!payload) return '';
      
      try {
        // Extract key information based on common payload shapes
        if (typeof payload === 'object') {
          if (payload.nodeId) return `(node: ${payload.nodeId})`;
          if (payload.character) return `(character: ${payload.character})`;
          if (payload.tier) return `(tier: ${payload.tier})`;
          if (payload.flowId) return `(flow: ${payload.flowId})`;
        }
        
        // Generic stringify for other cases
        const str = JSON.stringify(payload);
        if (str.length > 30) return str.substring(0, 27) + '...';
        return str;
      } catch (e) {
        return '[Complex payload]';
      }
    };
    
    return {
      recordEvent,
      getAllEvents,
      getEventsByType,
      hasEventType,
      hasEventMatching,
      clearEvents,
      getEventTypeCount,
      getEventTypeSequence,
      checkSequence,
      getEventFlowVisualization
    };
  }
  
  module.exports = { createTestEventRecorder };