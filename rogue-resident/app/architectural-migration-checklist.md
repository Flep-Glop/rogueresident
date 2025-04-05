# Rogue Resident Architecture Migration Checklist

## 🟢 Completed Tasks

### Foundation
- [x] Created `EventTypes.ts` with centralized event definitions
- [x] Refactored `CentralEventBus.ts` to focus purely on event dispatching
- [x] Created `ProgressionService.ts` to handle progression guarantees
- [x] Implemented compatibility layer for legacy event usage
- [x] Created `init.ts` for proper system initialization sequence

### State Machine
- [x] Updated `GameStateMachine.ts` to use new event system
- [x] Refactored `GameStateBridge.ts` for unidirectional state flow
- [x] Improved state transition validation patterns
- [x] Removed circular dependencies in state systems

### Components
- [x] Updated `NodeComponent.tsx` to use event dispatching
- [x] Updated `page.tsx` to use centralized system initialization
- [x] Updated `PhaseTransition.tsx` to work with the state machine

## 🟡 In Progress Tasks

### Continue Component Migration
- [ ] Update `DialogueSystem.tsx` to use new event architecture
  - Make sure dialogue state is managed solely by dialogue state machine
  - Use events for indirect state requests
  - Eliminate event dispatches in useEffect cleanup functions

- [ ] Refactor `SimplifiedMap` and `EnhancedMap` components
  - Remove direct store mutations
  - Use event-based node selection

- [ ] Update `HillHomeScene.tsx` for night phase
  - Integrate with state machine for transitions
  - Use event system for constellation interactions

### Add Domain Controllers
- [ ] Create `KnowledgeController.ts` for constellation system
  - Subscribe to knowledge-related events
  - Implement domain logic for knowledge connections
  - Export domain-specific helper functions

- [ ] Create `DialogueController.ts` for dialogue interactions
  - Handle dialogue progression checks
  - Connect DialogueStateMachine with CentralEventBus
  - Resolve dialogue/progression loops

## 🔴 Remaining Tasks

### Component Migration
- [ ] Migrate challenge components to new architecture
  - `CalibrationChallenge.tsx`
  - `PatientCaseChallenge.tsx`
  - `QAProcedureChallenge.tsx`
  - `EquipmentQAChallenge.tsx`

- [ ] Update game effect systems
  - `SoundManager.tsx`
  - `GameEffects.tsx`
  - Create a unified effect controller

### State Machine Enhancements
- [ ] Create `SaveLoadService.ts` for save/load features
  - Integration with state machine
  - Clean persistence with proper state boundaries

- [ ] Create `TelemetryService.ts` for analytics
  - Subscribe to key events without side effects
  - Track progression analytics

### Testing & Debugging
- [ ] Create test harness for state machine
- [ ] Add event recording and replay capabilities
- [ ] Create standalone test cases for critical flows:
  - Day/night transitions
  - Boss encounters
  - Dialogue progression
  - Knowledge star linking

## ⚙️ Implementation Guidelines

### Event System Usage
```typescript
// DON'T: Use legacy events
gameEvents.dispatch(GameEventType.NODE_COMPLETED, { nodeId: 'node-123' });

// DO: Use the new event system
import { GameEventType } from '../core/events/EventTypes';
import { dispatchNodeCompleted } from '../core/events/CentralEventBus';

// With helper function
dispatchNodeCompleted('node-123');

// Or direct dispatch
useEventBus.getState().dispatch(
  GameEventType.NODE_COMPLETED,
  { nodeId: 'node-123' }
);
```

### State Transitions
```typescript
// DON'T: Directly modify state in components
useGameStore.setState({ gamePhase: 'night' });

// DO: Request state changes through state machine
import { useGameStateMachine } from '../core/statemachine/GameStateMachine';

// Request the transition
useGameStateMachine.getState().transitionToPhase('transition_to_night', 'day_complete');
```

### Component Patterns
```tsx
// DON'T: Mix business logic with presentation
function DialogueComponent() {
  // Process dialogue state here
  // Update stores directly
  // Dispatch events in cleanup
}

// DO: Separate concerns
function DialogueComponent() {
  // Use hooks for state access
  const { dialogue, options } = useDialogueState();
  
  // Request changes via events
  const handleOptionSelect = (optionId) => {
    dispatchUIEvent('dialogue', 'option-selected', { optionId });
  };
  
  // Focus on presentation
  return (
    <div>
      {/* Presentation logic only */}
    </div>
  );
}
```

## 🧠 Architecture Philosophy

1. **One-Way Data Flow**: State machine → store → components
2. **Events as Signals**: Request changes, don't command them
3. **Domain Boundaries**: Each system owns its domain completely
4. **Progressive Adoption**: Migrate components during feature work

Remember: This architecture mirrors the same approach that makes the knowledge constellation system in our game so compelling - clear connections between concepts, visible progression, and a coherent mental model that scales with complexity.

## 🚀 Next Steps

The most impactful next task is migrating the DialogueSystem, as this will immediately resolve the cascade effects causing dialogue resets. After that, focus on the HillHomeScene and knowledge constellation components to ensure the day/night cycle functions reliably.

---

*"The goal isn't theoretical architectural purity - it's creating systems that express the narrative flexibility our knowledge constellation demands, just as Hades' relationship system required clear boundaries to support its branching paths."*