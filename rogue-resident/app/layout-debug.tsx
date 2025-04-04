// app/layout-debug.tsx
/**
 * Debug Layout
 * 
 * A wrapper that can be conditionally imported in layout.tsx during development
 * to enable the test harness and event recorder.
 */

import type { ReactNode } from "react";
import TestHarness from "./components/debug/TestHarness";
import { EventRecorder } from "./core/debug/EventRecorder";

interface DebugWrapperProps {
  children: ReactNode;
}

export default function DebugWrapper({ children }: DebugWrapperProps) {
  // Initialize event recorder if needed
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    // Make event recorder globally available for console debugging
    (window as any).EventRecorder = EventRecorder;
    
    console.log('🐞 Debug tools initialized');
    console.log('ℹ️ Event recorder available at window.EventRecorder');
  }
  
  return (
    <>
      {children}
      {process.env.NODE_ENV !== 'production' && <TestHarness />}
    </>
  );
}