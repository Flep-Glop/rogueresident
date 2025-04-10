'use client';
// app/components/debug/ClientDashboardWrapper.tsx

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the PerformanceDashboard
const PerformanceDashboard = dynamic(
  () => import('./PerformanceDashboard'),
  { ssr: false }
);

/**
 * Client component wrapper for the PerformanceDashboard
 * This allows us to use dynamic imports in a client context
 */
export default function ClientDashboardWrapper() {
  // Only render in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  
  return <PerformanceDashboard />;
}