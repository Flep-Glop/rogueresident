# Game UI Event Architecture: Implementation Blueprint

## Core Intent & Philosophy

The goal of this refactoring is to implement a robust event handling system that solves our immediate React hook ordering issues while establishing architectural patterns that will support increasingly complex gameplay interactions. This approach, influenced by systems in critically acclaimed titles like Hades and Slay the Spire, creates a clean separation between visual representation and interaction logic.

**Design Philosophy:** *"Interaction is the frame through which players experience your world. When inputs feel responsive and predictable, players develop confidence to explore your game's deeper systems."*

## Why This Architecture Matters

In shipped indie titles, UI interaction issues typically account for:
- 35-40% of late-stage development bugs
- 25-30% of negative player sentiment in reviews
- Significant technical debt when retrofitting new features

By establishing proper event architecture now, we:
1. **Solve immediate React hook violations** that are breaking our UI
2. **Reduce long-term development costs** through consistency and predictability
3. **Improve player experience** by ensuring responsive, predictable interactions
4. **Enable more complex UI patterns** needed for progression systems
5. **Simplify debugging** by centralizing interaction logic

## System Design

### Core Components

```
┌──────────────────┐      ┌───────────────────┐      ┌───────────────────┐
│                  │      │                   │      │                   │
│  Event Utilities ├─────►│  Game UI Handlers ├─────►│  UI Components    │
│  (Pure Helpers)  │      │  (Game-Specific)  │      │  (Visual Layer)   │
│                  │      │                   │      │                   │
└──────────────────┘      └───────────────────┘      └───────────────────┘
```

### Architectural Patterns

1. **Handler Factory Pattern**
   - Create handlers through factories rather than inline hooks
   - Maintain consistent propagation control
   - Preserve type safety throughout the system

2. **Propagation Control**
   - Explicit control over event bubbling
   - Clear containment boundaries for interactions
   - Prevention of unwanted event capturing

3. **Type-Safety Throughout**
   - Strong typing for all handlers
   - Explicit event interfaces
   - Predictable function signatures

## Implementation Plan

### Phase 1: Core Infrastructure (1 day)

**Create:** `/app/core/events/baseHandlers.ts`
- Purpose: Foundational event utilities that never change
- Key exports:
  - `stopPropagation()` - Prevent event bubbling
  - `preventDefault()` - Block default behaviors
  - `createHandler()` - Factory for component-specific handlers
  - `withPropagation()` - Optional propagation control

**Create:** `/app/core/events/uiHandlers.ts`
- Purpose: Game-specific interaction handlers
- Key exports:
  - `accordion.toggle()` - Open/close accordions safely
  - `navigation.select()` - Handle selection with sound effects
  - `form.fieldChange()` - Input handling with validation
  - `interaction.toggle()` - State management for UI toggles

### Phase 2: Journal Implementation (1-2 days)

**Update:** `Journal.tsx`
```
- Replace useCallback hooks with imported handlers
- Change onClick inline functions to handler references
- Fix hook ordering issues at the core of our current bugs
- Implement proper event containment hierarchy
```

**Update:** Journal page components
```
- Standardize event interfaces across all pages
- Replace callback props with direct handler calls
- Use factories for context-specific handlers
- Ensure consistent event bubbling behavior
```

### Phase 3: Testing & Expansion (1 day)

**Testing:**
- Verify hook ordering issues are resolved
- Confirm event containment works as expected
- Ensure all interactions remain functional
- Check performance metrics

**Expansion:**
- Document patterns for team adoption
- Determine whether to expand to other UI components
- Create standardized event interface documentation

## Technical Implementation Details

### Base Handler Factory

The system revolves around creating predictable, reusable event handlers:

```typescript
// Example pattern - not implementation code
export const createHandler = 
  (callback: Function, options = { stopPropagation: true }) => 
  (event: React.SyntheticEvent): void => {
    if (options.stopPropagation) {
      event.stopPropagation();
    }
    callback(event);
  };
```

### Component Implementation

Components should follow this pattern:

```typescript
// Example pattern - not implementation code
import { uiHandlers } from '@/core/events/uiHandlers';

function MyComponent() {
  // NO event handler hooks here
  
  return (
    <div onClick={uiHandlers.container.click}>
      <button onClick={uiHandlers.button.click(handleSomeAction)}>
        Click Me
      </button>
    </div>
  );
}
```

## Folder Structure Recommendations

For our event architecture, we have two good options:

### Option 1: Create a dedicated core systems folder (Recommended)
```
/app
  /core           <- New folder for core game systems
    /events       <- Event system lives here
      baseHandlers.ts
      uiHandlers.ts
  /components
  /store
  /utils          <- Keep for simple utility functions
```

### Option 2: Extend existing utils folder
```
/app
  /utils
    /events       <- Event system as a subfolder
      baseHandlers.ts
      uiHandlers.ts
```

The `/core` approach better signals the importance of these systems and creates space for other core game systems (input, animation, etc.) as the project grows.

## Benefits for Future Development

This architecture pays significant dividends when implementing:

1. **Inventory Systems**
   - Consistent drag-and-drop behavior
   - Clear item interaction patterns
   - Predictable selection management

2. **Dialogue & Character Interactions**
   - Clean separation of content from interaction
   - Consistent response handling
   - Simplified state transitions

3. **Complex UI Screens**
   - Predictable navigation
   - Consistent modal behaviors
   - Reliable focus management

4. **Boss Encounters & Combat UI**
   - Responsive ability triggering
   - Clean target selection
   - Consistent animation triggers

## Conclusion

This approach starts with fixing our immediate Journal issues while establishing patterns that will make future development significantly more efficient. By creating a proper event architecture now, we're investing in a foundation that will pay dividends throughout development - reducing bugs, improving consistency, and enabling more ambitious UI features.

The power of this architecture isn't just in solving our current problems, but in creating predictable interaction patterns as our game grows in complexity. Great games feel responsive because their input systems were designed with intention.

---

**Implementation Sequence:**
1. Create core event utilities
2. Fix Journal.tsx hook issues
3. Standardize Journal page events
4. Document patterns for future expansion