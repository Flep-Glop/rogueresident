// tests/eventRecorder.js
/**
 * Simple Event Recorder for Tests
 * 
 * Utility for recording and checking events during test runs
 */
function createEventRecorder() {
  const events = [];
  const eventTypes = new Set();
  
  return {
    // Record an event
    record(eventType, data) {
      const event = {
        type: eventType,
        data,
        timestamp: Date.now()
      };
      
      events.push(event);
      eventTypes.add(eventType);
      
      return event;
    },
    
    // Clear recorded events
    clear() {
      events.length = 0;
      eventTypes.clear();
    },
    
    // Get all recorded events
    getEvents() {
      return [...events];
    },
    
    // Get events of a specific type
    getEventsByType(eventType) {
      return events.filter(event => event.type === eventType);
    },
    
    // Check if any events of a type exist
    hasEventType(eventType) {
      return eventTypes.has(eventType);
    },
    
    // Get count of events by type
    getEventCount(eventType) {
      return events.filter(event => event.type === eventType).length;
    },
    
    // Get a list of all event types recorded
    getEventTypes() {
      return [...eventTypes];
    },
    
    // Check if a sequence of events occurred in order
    checkSequence(eventTypeSequence) {
      let sequenceIndex = 0;
      
      for (const event of events) {
        if (event.type === eventTypeSequence[sequenceIndex]) {
          sequenceIndex++;
          
          if (sequenceIndex === eventTypeSequence.length) {
            return true; // Sequence complete
          }
        }
      }
      
      return false; // Sequence not found
    }
  };
}

module.exports = { createEventRecorder };