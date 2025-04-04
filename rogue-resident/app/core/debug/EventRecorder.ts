// app/core/debug/EventRecorder.ts
/**
 * Event Recorder
 * 
 * Captures and records game events and state snapshots during gameplay.
 * Used for debugging, testing, and analyzing player progression paths.
 * 
 * This recorder is designed to work with the CentralEventBus system
 * while adding minimal performance overhead during normal gameplay.
 */

import { GameEvent, GameEventType, useEventBus } from '../events/CentralEventBus';
import { useGameStore } from '../../store/gameStore';
import { useJournalStore } from '../../store/journalStore';

// Types for capturing state snapshots
export interface GameStateSnapshot {
  timestamp: number;
  label: string;
  state: Partial<GameState>;
  eventCount: number;
}

export interface RecordedGameEvent extends GameEvent {
  stateSnapshot?: Partial<GameState>;
}

export interface SessionExport {
  events: RecordedGameEvent[];
  snapshots: GameStateSnapshot[];
  summary: FlowSummary;
  metadata: SessionMetadata;
}

export interface FlowSummary {
  startTime: number;
  endTime: number;
  duration: number;
  eventCounts: Record<string, number>;
  completedNodes: string[];
  criticalPathsCompleted: string[];
  progressionBlocks: ProgressionBlock[];
}

export interface ProgressionBlock {
  eventId: string;
  timestamp: number;
  description: string;
  blockType: 'missing_journal' | 'dialogue_loop' | 'node_inaccessible' | 'other';
}

export interface SessionMetadata {
  recordingDate: string;
  seed?: number;
  seedName?: string;
  gameVersion?: string;
  recordingMode: 'manual' | 'automated' | 'playtest';
}

// Simplified game state type for snapshots
interface GameState {
  gameState: string;
  gamePhase: string;
  currentNodeId: string | null;
  completedNodeIds: string[];
  player: {
    health: number;
    insight: number;
  };
  currentDay: number;
  hasJournal?: boolean;
}

class EventRecorderImpl {
  private events: RecordedGameEvent[] = [];
  private stateSnapshots: GameStateSnapshot[] = [];
  private isCapturing: boolean = false;
  private startTimestamp: number = 0;
  private sessionMetadata: SessionMetadata = {
    recordingDate: new Date().toISOString(),
    recordingMode: 'manual'
  };
  private unsubscribeFn: (() => void) | null = null;
  
  /**
   * Start capturing events
   */
  startCapture(metadata: Partial<SessionMetadata> = {}) {
    if (this.isCapturing) {
      console.warn('Event recorder is already capturing events');
      return;
    }
    
    // Reset state
    this.events = [];
    this.stateSnapshots = [];
    this.startTimestamp = Date.now();
    this.isCapturing = true;
    
    // Set metadata
    this.sessionMetadata = {
      ...this.sessionMetadata,
      ...metadata,
      recordingDate: new Date().toISOString()
    };
    
    // Try to get seed information if available
    try {
      const currentRun = useGameStore.getState().currentRun;
      if (currentRun) {
        this.sessionMetadata.seed = currentRun.seed;
        this.sessionMetadata.seedName = currentRun.seedName;
      }
    } catch (e) {
      // Ignore errors if stores aren't available
    }
    
    // Take initial state snapshot
    this.captureSnapshot('session_start');
    
    // Subscribe to all events via CentralEventBus
    this.unsubscribeFn = useEventBus.getState().subscribe<any>(
      GameEventType.SESSION_STARTED,
      this.handleEvent
    );
    
    console.log('🎥 Event recording started:', this.sessionMetadata);
  }
  
  /**
   * Stop capturing events
   */
  stopCapture() {
    if (!this.isCapturing) {
      console.warn('Event recorder is not currently capturing events');
      return;
    }
    
    // Take final state snapshot
    this.captureSnapshot('session_end');
    
    // Clean up subscription
    if (this.unsubscribeFn) {
      this.unsubscribeFn();
      this.unsubscribeFn = null;
    }
    
    this.isCapturing = false;
    
    console.log(`🎬 Event recording stopped: Captured ${this.events.length} events`);
    
    return this.exportSession();
  }
  
  /**
   * Capture an individual event
   */
  captureEvent = (event: GameEvent) => {
    if (!this.isCapturing) return;
    
    // Create recorded event with optional state snapshot
    const recordedEvent: RecordedGameEvent = {
      ...event,
      stateSnapshot: this.shouldCaptureStateWithEvent(event) 
        ? this.captureGameState() 
        : undefined
    };
    
    this.events.push(recordedEvent);
    
    // Take snapshots at key progression events
    if (this.isCriticalProgressionEvent(event)) {
      this.captureSnapshot(`event_${event.type}`);
    }
  }
  
  /**
   * Event handler for subscription
   */
  private handleEvent = (event: GameEvent) => {
    this.captureEvent(event);
  }
  
  /**
   * Capture the current game state
   */
  captureGameState(): Partial<GameState> {
    try {
      // Get state from stores
      const gameStore = useGameStore.getState();
      const journalStore = useJournalStore.getState();
      
      return {
        gameState: gameStore.gameState,
        gamePhase: gameStore.gamePhase,
        currentNodeId: gameStore.currentNodeId,
        completedNodeIds: [...gameStore.completedNodeIds],
        player: {
          health: gameStore.player.health,
          insight: gameStore.player.insight
        },
        currentDay: gameStore.currentDay,
        hasJournal: journalStore.hasJournal
      };
    } catch (e) {
      // Return empty state if stores aren't available
      console.error('Failed to capture game state:', e);
      return {};
    }
  }
  
  /**
   * Capture a full state snapshot with label
   */
  captureSnapshot(label: string) {
    if (!this.isCapturing) return;
    
    const snapshot: GameStateSnapshot = {
      timestamp: Date.now(),
      label,
      state: this.captureGameState(),
      eventCount: this.events.length
    };
    
    this.stateSnapshots.push(snapshot);
    
    return snapshot;
  }
  
  /**
   * Check if an event should include a state snapshot
   */
  private shouldCaptureStateWithEvent(event: GameEvent): boolean {
    // Only capture state with important events to avoid bloat
    return [
      GameEventType.NODE_COMPLETED,
      GameEventType.JOURNAL_ACQUIRED,
      GameEventType.DIALOGUE_COMPLETED,
      GameEventType.BOSS_DEFEATED,
      GameEventType.GAME_STATE_CHANGED,
      GameEventType.GAME_PHASE_CHANGED,
      GameEventType.PROGRESSION_REPAIR
    ].includes(event.type);
  }
  
  /**
   * Check if an event is critical for progression
   */
  private isCriticalProgressionEvent(event: GameEvent): boolean {
    return [
      GameEventType.JOURNAL_ACQUIRED,
      GameEventType.BOSS_DEFEATED,
      GameEventType.PROGRESSION_REPAIR,
      GameEventType.DAY_STARTED,
      GameEventType.NIGHT_STARTED,
      GameEventType.GAME_STATE_CHANGED
    ].includes(event.type);
  }
  
  /**
   * Clear all recorded events and snapshots
   */
  clear() {
    this.events = [];
    this.stateSnapshots = [];
    console.log('🧹 Event recorder cleared');
  }
  
  /**
   * Get all recorded events
   */
  getEvents(): RecordedGameEvent[] {
    return [...this.events];
  }
  
  /**
   * Get events by type
   */
  getEventsByType(type: GameEventType): RecordedGameEvent[] {
    return this.events.filter(event => event.type === type);
  }
  
  /**
   * Get all state snapshots
   */
  getSnapshots(): GameStateSnapshot[] {
    return [...this.stateSnapshots];
  }
  
  /**
   * Check if a specific sequence of events has occurred
   */
  hasEventSequence(sequence: GameEventType[]): boolean {
    const eventTypes = this.events.map(e => e.type);
    
    let sequenceIndex = 0;
    for (const eventType of eventTypes) {
      if (eventType === sequence[sequenceIndex]) {
        sequenceIndex++;
        if (sequenceIndex === sequence.length) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Generate a summary of the recorded flow
   */
  private generateFlowSummary(): FlowSummary {
    // Count events by type
    const eventCounts: Record<string, number> = {};
    for (const event of this.events) {
      eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
    }
    
    // Find completed nodes
    const completedNodes: string[] = [];
    for (const event of this.events) {
      if (event.type === GameEventType.NODE_COMPLETED && event.payload?.nodeId) {
        completedNodes.push(event.payload.nodeId);
      }
    }
    
    // Check for critical paths
    const criticalPathsCompleted: string[] = [];
    if (this.events.some(e => e.type === GameEventType.JOURNAL_ACQUIRED)) {
      criticalPathsCompleted.push('journal_acquisition');
    }
    if (this.events.some(e => e.type === GameEventType.BOSS_DEFEATED)) {
      criticalPathsCompleted.push('boss_defeated');
    }
    
    // Check for progression blocks
    const progressionBlocks: ProgressionBlock[] = [];
    for (const event of this.events) {
      if (event.type === GameEventType.PROGRESSION_REPAIR) {
        progressionBlocks.push({
          eventId: event.id || '',
          timestamp: event.timestamp,
          description: event.payload?.description || 'Unknown progression repair',
          blockType: this.determineBlockType(event.payload)
        });
      }
    }
    
    return {
      startTime: this.startTimestamp,
      endTime: Date.now(),
      duration: Date.now() - this.startTimestamp,
      eventCounts,
      completedNodes,
      criticalPathsCompleted,
      progressionBlocks
    };
  }
  
  /**
   * Determine the type of progression block from a repair event
   */
  private determineBlockType(payload: any): 'missing_journal' | 'dialogue_loop' | 'node_inaccessible' | 'other' {
    if (!payload) return 'other';
    
    const description = String(payload.description || '').toLowerCase();
    
    if (description.includes('journal')) return 'missing_journal';
    if (description.includes('dialogue') || description.includes('loop')) return 'dialogue_loop';
    if (description.includes('node') || description.includes('access')) return 'node_inaccessible';
    
    return 'other';
  }
  
  /**
   * Export the full session data
   */
  exportSession(): SessionExport {
    return {
      events: this.events,
      snapshots: this.stateSnapshots,
      summary: this.generateFlowSummary(),
      metadata: this.sessionMetadata
    };
  }
  
  /**
   * Generate a visualization of the event flow for debugging
   */
  generateFlowVisualization(): string {
    if (this.events.length === 0) return "No events recorded";
    
    const firstTimestamp = this.events[0].timestamp;
    
    return this.events.map((event, index) => {
      const relativeTime = event.timestamp - firstTimestamp;
      const prefix = index === 0 ? '┌' : index === this.events.length - 1 ? '└' : '├';
      
      let details = '';
      if (event.type === GameEventType.NODE_COMPLETED && event.payload?.nodeId) {
        details = `(node: ${event.payload.nodeId})`;
      } else if (event.type === GameEventType.JOURNAL_ACQUIRED) {
        details = `(tier: ${event.payload?.tier})`;
      }
      
      return `${prefix}─ [${relativeTime.toString().padStart(5, ' ')}ms] ${event.type} ${details}`;
    }).join('\n');
  }
  
  /**
   * Generate a Mermaid diagram of the progression flow
   */
  generateMermaidDiagram(): string {
    if (this.events.length === 0) return "graph TD\n  NoEvents[No events recorded]";
    
    let diagram = "graph TD\n";
    
    // Add nodes for key events
    const keyEvents = this.events.filter(e => this.isCriticalProgressionEvent(e));
    keyEvents.forEach((event, index) => {
      diagram += `  E${index}["${event.type}"]\n`;
    });
    
    // Add connections
    for (let i = 0; i < keyEvents.length - 1; i++) {
      diagram += `  E${i} --> E${i+1}\n`;
    }
    
    return diagram;
  }
  
  /**
   * Save the session to localStorage
   */
  saveSession(name: string = `session-${Date.now()}`) {
    try {
      const session = this.exportSession();
      localStorage.setItem(`event-recorder-${name}`, JSON.stringify(session));
      console.log(`💾 Saved session: ${name}`);
      return true;
    } catch (e) {
      console.error('Failed to save session:', e);
      return false;
    }
  }
  
  /**
   * Load a session from localStorage
   */
  loadSession(name: string): SessionExport | null {
    try {
      const data = localStorage.getItem(`event-recorder-${name}`);
      if (!data) return null;
      
      return JSON.parse(data) as SessionExport;
    } catch (e) {
      console.error('Failed to load session:', e);
      return null;
    }
  }
  
  /**
   * List all saved sessions
   */
  listSavedSessions(): string[] {
    const sessions: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('event-recorder-')) {
        sessions.push(key.replace('event-recorder-', ''));
      }
    }
    
    return sessions;
  }
}

// Create a singleton instance
export const EventRecorder = new EventRecorderImpl();

// Export a hook for easy component access
export function useEventRecorder() {
  return EventRecorder;
}

export default EventRecorder;