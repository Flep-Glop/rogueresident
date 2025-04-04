// tests/journalAcquisitionTest.ts
/**
 * Journal Acquisition Test
 * 
 * Tests the critical progression path of acquiring the journal
 * through both normal means and progression repair mechanisms.
 */

import { createEventDebugger } from './utils/eventDebugger';
import setupMocks from './utils/testStoreMocks';
import { GameEventType } from '../app/core/events/CentralEventBus';
import { runProgressionChecks } from '../app/core/progression/ProgressionGuarantee';
import { TEST_NODE_IDS } from './testDefinitions';

describe('Journal Acquisition', () => {
  // Setup mocks for testing
  const mocks = setupMocks();
  let eventDebugger: ReturnType<typeof createEventDebugger>;
  
  beforeEach(() => {
    // Reset all mocks for a clean test
    mocks.resetAllMocks();
    
    // Setup event debugger
    eventDebugger = createEventDebugger(mocks.eventBusMock);
    eventDebugger.startRecording();
  });
  
  afterEach(() => {
    // Clean up event debugger
    eventDebugger.cleanup();
  });
  
  test('Journal is acquired through normal dialogue progression', async () => {
    // 1. Setup initial state - player doesn't have journal
    mocks.journalStoreMock.hasJournal = false;
    
    // 2. Setup dialogue state to be at journal presentation
    mocks.dialogueStateMachineMock.currentState = {
      id: 'journal-presentation',
      type: 'critical-moment',
      text: 'Journal presentation text',
      isCriticalPath: true
    };
    
    // 3. Simulate journal acquisition through dialogue
    await import('../app/core/events/CentralEventBus').then(module => {
      module.journalAcquired('base', 'kapoor', 'test');
    });
    
    // 4. Verify journal initialization was called
    expect(mocks.journalStoreMock.initializeJournal).toHaveBeenCalled();
    
    // 5. Verify journal acquisition event was emitted
    expect(eventDebugger.checkSequence([
      GameEventType.JOURNAL_ACQUIRED
    ])).toBe(true);
  });
  
  test('Journal is repaired when progression is broken', async () => {
    // 1. Setup initial state - player doesn't have journal but has completed calibration
    mocks.journalStoreMock.hasJournal = false;
    mocks.gameStoreMock.completedNodeIds = [TEST_NODE_IDS.KAPOOR_CALIBRATION];
    
    // 2. Simulate progression check
    const repairsPerformed = await runProgressionChecks();
    
    // 3. Verify repairs were performed
    expect(repairsPerformed).toBe(true);
    
    // 4. Verify journal was initialized
    expect(mocks.journalStoreMock.initializeJournal).toHaveBeenCalled();
    
    // 5. Verify repair event was emitted
    expect(eventDebugger.checkSequence([
      GameEventType.PROGRESSION_REPAIR,
      GameEventType.JOURNAL_ACQUIRED
    ])).toBe(true);
  });
  
  test('Journal acquisition is idempotent', async () => {
    // 1. Setup initial state - player already has journal
    mocks.journalStoreMock.hasJournal = true;
    
    // 2. Try to acquire journal again
    await import('../app/core/events/CentralEventBus').then(module => {
      module.journalAcquired('base', 'kapoor', 'test');
    });
    
    // 3. Verify journal initialization was NOT called again
    expect(mocks.journalStoreMock.initializeJournal).not.toHaveBeenCalled();
    
    // 4. Journal acquisition event should still be emitted for logging
    expect(eventDebugger.checkSequence([
      GameEventType.JOURNAL_ACQUIRED
    ])).toBe(true);
  });
});