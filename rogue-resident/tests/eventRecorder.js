// tests/eventRecorder.js
function createEventRecorder() {
    const events = [];
    
    return {
      record(type, data) {
        events.push({ type, data, timestamp: Date.now() });
      },
      
      getEvents() {
        return [...events];
      },
      
      getEventTypes() {
        return events.map(e => e.type);
      },
      
      hasEventType(type) {
        return events.some(e => e.type === type);
      },
      
      clear() {
        events.length = 0;
      }
    };
  }
  
  module.exports = { createEventRecorder };