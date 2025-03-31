# Rogue Resident: Medical Physics Roguelike Game

## Overview

Rogue Resident is an educational roguelike game where you play as a medical physics resident navigating through your training program. Complete challenges, acquire items, improve your skills, and ultimately confront the mysterious Ionix anomaly.

## Core Features

- **Day/Night Cycle**: Experience a dynamic gameplay loop between hospital challenges (day) and skill development (night)
- **Node-Based Navigation**: Navigate through a procedurally generated map of clinical challenges
- **Medical Physics Challenges**: Test your knowledge through various medical physics scenarios
- **Hill Home Integration**: Personalize your hillside dwelling that evolves as you progress
- **Item Collection**: Find and use tools that enhance your abilities
- **Skill System**: Upgrade your capabilities between runs to become stronger

## Getting Started

First, install dependencies:

```bash
npm install
# or
yarn install
```

Then run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Game Flow

1. **Start Screen**: Begin your residency journey
2. **Day Phase**:
   - Navigate through the hospital map
   - Select nodes to complete challenges
   - Collect items from storage closets
   - Eventually confront the Ionix boss
3. **Night Phase**:
   - Return to your hillside home
   - Upgrade skills using insight points
   - View collected items
   - Rest before returning to the hospital
4. **Progression**:
   - Each day, new challenges await
   - Your home and abilities evolve
   - Work toward completing your residency

## Implementation Notes

### Latest Updates

The recent development has focused on:

1. **Hill Home Integration**: Connected the Hill Home scene to the main game flow as the night phase
2. **Day/Night Cycle**: Implemented smooth transitions between day and night phases
3. **Game Flow Completion**: Added proper state transitions for game progression
4. **Victory and Game Over**: Created dedicated screens for these states
5. **Visual Polish**: Added transition effects between game states

### Structure

- **Game State Management**: Uses Zustand for state management
- **Component-Based Architecture**: React components for UI elements
- **Pixel Art Styling**: Custom CSS for a consistent retro aesthetic

### For Developers

- The main state is managed in `app/store/gameStore.ts`
- Challenge logic is handled in `app/store/challengeStore.ts`
- The main game loop is orchestrated in `app/components/GameContainer.tsx`
- The night phase occurs in `app/components/HillHomeScene.tsx`

## Next Steps

- Add more challenge types (QA, Educational)
- Enhance item effects and synergies
- Implement character relationship system
- Add more visual effects and animations
- Expand skill tree and meta-progression

## Learn More

This project is built with Next.js. To learn more about Next.js:

- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)