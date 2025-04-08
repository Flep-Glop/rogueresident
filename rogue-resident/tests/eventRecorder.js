// tests/eventRecorder.js
/**
 * Event Recorder - Enhanced for Rogue Resident
 * 
 * A specialized utility for recording and analyzing events in the game's
 * event-driven architecture. This implementation is specifically designed
 * to work with the CentralEventBus implementation.
 * 
 * Features:
 * - Records all events with timestamps and metadata
 * - Provides filtering by event type and time ranges
 * - Visualizes event flows and sequences
 * - Helps identify missing events or unexpected patterns
 */

/**
 * Creates an event recorder that subscribes to and records events from the event bus
 * @param {Object} eventBus - The Rogue Resident CentralEventBus instance
 * @returns {Object} - Event recorder interface
 */
function createEventRecorder(eventBus) {
  // Storage for recorded events 
  const recordedEvents = [];
  
  // Recording state
  let isRecording = false;
  let subscriptionIds = [];
  
  // Special event sequences to watch for
  const criticalSequences = {
    journalAcquisition: [
      'DIALOGUE_CRITICAL_PATH',
      'JOURNAL_ACQUIRED',
      'KNOWLEDGE_GAINED'
    ],
    dayNightTransition: [
      'DAY_COMPLETED',
      'GAME_PHASE_CHANGED',
      'ENTERED_NIGHT_PHASE'
    ],
    nightDayTransition: [
      'NIGHT_COMPLETED',
      'GAME_PHASE_CHANGED',
      'ENTERED_DAY_PHASE'
    ]
  };
  
  const recorder = {
    /**
     * Start recording events from the event bus
     */
    startRecording: function() {
      if (isRecording) {
        console.log('🎥 Event recorder already running');
        return;
      }
      
      // Clear previous events
      recordedEvents.length = 0;
      
      // Record timestamp 
      const startTime = new Date().toISOString();
      
      try {
        // Subscribe to all events using wildcard if supported
        if (typeof eventBus.subscribe === 'function') {
          // Check if the implementation supports wildcard subscription
          if (eventBus.subscribe.length >= 2) {
            // Try wildcard subscription first
            const wildcardId = eventBus.subscribe('*', (event) => {
              recordEvent(event.type, event);
            });
            
            if (wildcardId) {
              subscriptionIds.push(wildcardId);
            } else {
              // Fall back to dispatch interception if wildcard doesn't work
              setupDispatchInterception();
            }
          } else {
            // Fall back to dispatch interception
            setupDispatchInterception();
          }
        } else {
          console.warn('🎥 Event bus does not support subscribe method, using fallback');
          setupDispatchInterception();
        }
        
        isRecording = true;
        console.log('🎥 Event recording started at', startTime);
        
      } catch (error) {
        console.error('🎥 Failed to start event recording:', error);
        // Try fallback method
        setupDispatchInterception();
      }
    },
    
    /**
     * Stop recording events
     */
    stopRecording: function() {
      if (!isRecording) {
        console.log('🎥 Event recording already stopped');
        return;
      }
      
      try {
        // Unsubscribe all subscriptions
        subscriptionIds.forEach(id => {
          try {
            if (typeof eventBus.unsubscribe === 'function') {
              eventBus.unsubscribe(id);
            }
          } catch (e) {
            console.warn('🎥 Error unsubscribing:', e);
          }
        });
        
        // Reset subscriptions
        subscriptionIds = [];
        
        // Restore original dispatch if we patched it
        restoreDispatch();
        
        isRecording = false;
        console.log(`🛑 Event recording stopped. ${recordedEvents.length} events recorded.`);
        
      } catch (error) {
        console.error('🎥 Failed to stop event recording:', error);
      }
    },
    
    /**
     * Clear recorded events without stopping recording
     */
    clear: function() {
      recordedEvents.length = 0;
      console.log('🧹 Event records cleared');
    },
    
    /**
     * Get all recorded events
     * @returns {Array} Array of recorded events
     */
    getAllEvents: function() {
      return [...recordedEvents];
    },
    
    /**
     * Get events filtered by type
     * @param {string} eventType - The event type to filter by
     * @returns {Array} Filtered events
     */
    getEventsByType: function(eventType) {
      return recordedEvents.filter(event => event.type === eventType);
    },
    
    /**
     * Get events that happened within a time range
     * @param {number} startTime - Start time in milliseconds
     * @param {number} endTime - End time in milliseconds
     * @returns {Array} Filtered events
     */
    getEventsInTimeRange: function(startTime, endTime) {
      return recordedEvents.filter(event => 
        event.timestamp >= startTime && event.timestamp <= endTime
      );
    },
    
    /**
     * Get events that happened after a specific event
     * @param {string} pivotEventType - The event type to use as pivot
     * @param {number} [limit=Infinity] - Maximum number of events to return
     * @returns {Array} Events after the pivot
     */
    getEventsAfter: function(pivotEventType, limit = Infinity) {
      const pivotIndex = recordedEvents.findIndex(event => event.type === pivotEventType);
      if (pivotIndex === -1) return [];
      
      return recordedEvents.slice(pivotIndex + 1, pivotIndex + 1 + limit);
    },
    
    /**
     * Get all unique event types that were recorded
     * @returns {Array} Array of unique event types
     */
    getEventTypes: function() {
      const types = new Set();
      recordedEvents.forEach(event => types.add(event.type));
      return Array.from(types);
    },
    
    /**
     * Check if events occurred in a specific sequence
     * @param {Array} eventTypeSequence - Array of event types in expected order
     * @returns {boolean} True if sequence was found
     */
    verifyEventSequence: function(eventTypeSequence) {
      // Special case for predefined sequences
      if (typeof eventTypeSequence === 'string' && 
          eventTypeSequence in criticalSequences) {
        eventTypeSequence = criticalSequences[eventTypeSequence];
      }
      
      if (!Array.isArray(eventTypeSequence) || eventTypeSequence.length === 0) {
        return false;
      }
      
      let currentIndex = 0;
      let sequenceStarted = false;
      
      for (const event of recordedEvents) {
        if (event.type === eventTypeSequence[currentIndex]) {
          sequenceStarted = true;
          currentIndex++;
          
          if (currentIndex === eventTypeSequence.length) {
            return true; // Sequence completed
          }
        } else if (sequenceStarted && event.type === eventTypeSequence[0]) {
          // Restart sequence if we see the first event again
          currentIndex = 1;
        }
      }
      
      return false; // Sequence not found
    },
    
    /**
     * Check for critical sequences in the event log
     * @returns {Object} Object with results for each critical sequence
     */
    verifyCriticalSequences: function() {
      const results = {};
      
      for (const [name, sequence] of Object.entries(criticalSequences)) {
        results[name] = this.verifyEventSequence(sequence);
      }
      
      return results;
    },
    
    /**
     * Check for missing expected events
     * @param {Array} expectedEventTypes - Array of event types that should have occurred
     * @returns {Array} Array of missing event types
     */
    findMissingEvents: function(expectedEventTypes) {
      const recordedTypes = this.getEventTypes();
      return expectedEventTypes.filter(type => !recordedTypes.includes(type));
    },
    
    /**
     * Get a visual representation of event flow
     * @param {number} [limit=50] - Maximum number of events to include
     * @returns {string} Formatted event flow
     */
    visualizeEventFlow: function(limit = 50) {
      if (recordedEvents.length === 0) {
        return 'No events recorded';
      }
      
      const output = [];
      const eventsToShow = recordedEvents.slice(-limit);
      
      let lastTimestamp = null;
      
      eventsToShow.forEach((event, index) => {
        // Calculate time since last event
        const timeDiff = lastTimestamp 
          ? event.timestamp - lastTimestamp
          : 0;
        
        lastTimestamp = event.timestamp;
        
        // Format event for display
        const timeStr = new Date(event.timestamp).toISOString().split('T')[1].split('.')[0];
        const timingInfo = index > 0 ? `+${timeDiff}ms` : '';
        
        // Format payload based on complexity
        let payloadStr = '';
        try {
          if (event.payload) {
            const keys = Object.keys(event.payload);
            if (keys.length <= 3) {
              payloadStr = JSON.stringify(event.payload);
            } else {
              payloadStr = `{${keys.join(', ')}}`;
            }
          } else {
            payloadStr = '{}';
          }
        } catch (e) {
          payloadStr = '[Complex Object]';
        }
        
        output.push(`${timeStr} ${timingInfo.padEnd(8)} | ${event.type.padEnd(25)} | ${payloadStr}`);
      });
      
      return output.join('\n');
    },
    
    /**
     * Create a statistical summary of recorded events
     * @returns {Object} Summary statistics
     */
    getSummary: function() {
      if (recordedEvents.length === 0) {
        return { count: 0, types: {}, timeline: [] };
      }
      
      // Count events by type
      const typeCount = {};
      recordedEvents.forEach(event => {
        typeCount[event.type] = (typeCount[event.type] || 0) + 1;
      });
      
      // Create timeline with 1-second buckets
      const timeline = [];
      const startTime = recordedEvents[0].timestamp;
      const endTime = recordedEvents[recordedEvents.length - 1].timestamp;
      const duration = Math.ceil((endTime - startTime) / 1000);
      
      for (let i = 0; i < duration; i++) {
        const bucketStart = startTime + (i * 1000);
        const bucketEnd = bucketStart + 1000;
        
        const eventsInBucket = recordedEvents.filter(
          event => event.timestamp >= bucketStart && event.timestamp < bucketEnd
        );
        
        timeline.push({
          second: i,
          count: eventsInBucket.length,
          types: Array.from(new Set(eventsInBucket.map(e => e.type)))
        });
      }
      
      return {
        count: recordedEvents.length,
        duration: `${duration} seconds`,
        types: typeCount,
        timeline: timeline
      };
    }
  };
  
  // Helper methods
  
  /**
   * Record an event
   * @param {string} eventType - The type of event
   * @param {Object} eventData - The event data
   */
  function recordEvent(eventType, eventData) {
    try {
      const timestamp = Date.now();
      
      // Use either the event object directly or reconstruct
      const eventToRecord = {
        type: eventType,
        timestamp,
        payload: eventData?.payload || eventData,
        source: eventData?.source || 'unknown'
      };
      
      recordedEvents.push(eventToRecord);
    } catch (error) {
      console.error('Error recording event:', error);
    }
  }
  
  /**
   * Setup interception of the dispatch method as a fallback
   */
  function setupDispatchInterception() {
    try {
      // Only intercept if the event bus has a dispatch method
      if (typeof eventBus.dispatch === 'function') {
        // Store original dispatch
        const originalDispatch = eventBus.dispatch;
        
        // Replace with wrapped version
        eventBus.dispatch = function(eventType, payload, source) {
          // Call original dispatch
          const result = originalDispatch.apply(this, arguments);
          
          // Record the event
          recordEvent(eventType, { payload, source });
          
          return result;
        };
        
        console.log('🎥 Event recorder using dispatch interception');
      }
    } catch (error) {
      console.error('Failed to intercept dispatch:', error);
    }
  }
  
  /**
   * Restore the original dispatch method if it was patched
   */
  function restoreDispatch() {
    try {
      // If we have wrapped the dispatch method, restore it
      if (eventBus._originalDispatch) {
        eventBus.dispatch = eventBus._originalDispatch;
        delete eventBus._originalDispatch;
      }
    } catch (error) {
      console.error('Failed to restore dispatch:', error);
    }
  }
  
  return recorder;
}

module.exports = { createEventRecorder };