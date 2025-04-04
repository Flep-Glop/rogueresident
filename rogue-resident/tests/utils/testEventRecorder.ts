// tests/utils/testEventRecorder.ts
/**
 * Test Event Recorder
 * 
 * A utility that creates an in-memory recorder for tracking events during tests.
 * This avoids relying on the actual event bus implementation and provides
 * a deterministic way to validate event sequences.
 */

// Simple event interface matching the game's event structure
export interface TestEvent {
    type: string;
    payload: any;
    timestamp: number;
    source?: string;
    id?: string;
  }
  
  /**
   * Creates a test event recorder with methods to record, query and clear events
   */
  export function createTestEventRecorder() {
    // In-memory storage of recorded events
    const events: TestEvent[] = [];
    
    // Record a new event
    const recordEvent = (type: string, payload: any, source?: string) => {
      const event: TestEvent = {
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
    const getEventsByType = (type: string) => events.filter(e => e.type === type);
    
    // Check if a specific event type exists
    const hasEventType = (type: string) => events.some(e => e.type === type);
    
    // Check if an event matches specific criteria
    const hasEventMatching = (predicate: (event: TestEvent) => boolean) => 
      events.some(predicate);
    
    // Clear all recorded events
    const clearEvents = () => {
      events.length = 0;
    };
    
    // Get count of specific event type
    const getEventTypeCount = (type: string) => 
      events.filter(e => e.type === type).length;
    
    // Get the sequence of event types (useful for validating order)
    const getEventTypeSequence = () => events.map(e => e.type);
    
    return {
      recordEvent,
      getAllEvents,
      getEventsByType,
      hasEventType,
      hasEventMatching,
      clearEvents,
      getEventTypeCount,
      getEventTypeSequence
    };
  }
  
  export type TestEventRecorder = ReturnType<typeof createTestEventRecorder>;
  
  export default createTestEventRecorder;