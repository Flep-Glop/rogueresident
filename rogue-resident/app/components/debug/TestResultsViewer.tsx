// app/components/debug/TestResultsViewer.tsx
'use client';

/**
 * Test Results Viewer Component
 * 
 * Displays detailed information about a progression test run:
 * - Test steps executed
 * - Event flow timeline
 * - State snapshots at key points
 * - Visualized event sequences
 * 
 * This component is only included in development builds.
 */

import React, { useState } from 'react';
import { GameEvent } from '../../core/events/CentralEventBus';

interface TestResult {
  success: boolean;
  name: string;
  description: string;
  recordedData: {
    events: any[];
    snapshots: any[];
    summary: any;
    metadata: any;
  };
  steps: string[];
  failureReason: string | null;
  startTime: number;
  endTime: number;
  duration: number;
}

interface TestResultsViewerProps {
  result: TestResult;
  onClose: () => void;
}

export default function TestResultsViewer({ result, onClose }: TestResultsViewerProps) {
  const [activeTab, setActiveTab] = useState('summary');
  
  // Formatting helper for timestamps
  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };
  
  // Relative time helper (for event timeline)
  const getRelativeTime = (timestamp: number): string => {
    const seconds = (timestamp - result.startTime) / 1000;
    return `+${seconds.toFixed(2)}s`;
  };
  
  // Format event type for display
  const formatEventType = (type: string): string => {
    // Convert camelCase to readable format and remove namespace
    return type.split(':').pop()?.replace(/([A-Z])/g, ' $1').trim() || type;
  };
  
  // Get event color based on type
  const getEventColor = (type: string): string => {
    if (type.includes('progression')) return 'text-purple-600 dark:text-purple-400';
    if (type.includes('dialogue')) return 'text-blue-600 dark:text-blue-400';
    if (type.includes('node')) return 'text-green-600 dark:text-green-400';
    if (type.includes('journal')) return 'text-yellow-600 dark:text-yellow-400';
    if (type.includes('repair')) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };
  
  return (
    <div className="fixed inset-4 overflow-hidden bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold flex items-center">
            <span className={result.success ? 'text-green-500 mr-2' : 'text-red-500 mr-2'}>
              {result.success ? '✓' : '✗'}
            </span>
            {result.name}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {result.description}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'summary' 
              ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' 
              : 'text-gray-600 dark:text-gray-400'
          }`}
          onClick={() => setActiveTab('summary')}
        >
          Summary
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'steps' 
              ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' 
              : 'text-gray-600 dark:text-gray-400'
          }`}
          onClick={() => setActiveTab('steps')}
        >
          Test Steps
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'events' 
              ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' 
              : 'text-gray-600 dark:text-gray-400'
          }`}
          onClick={() => setActiveTab('events')}
        >
          Events
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'snapshots' 
              ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' 
              : 'text-gray-600 dark:text-gray-400'
          }`}
          onClick={() => setActiveTab('snapshots')}
        >
          State Snapshots
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'flow' 
              ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' 
              : 'text-gray-600 dark:text-gray-400'
          }`}
          onClick={() => setActiveTab('flow')}
        >
          Event Flow
        </button>
      </div>
      
      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-100 dark:bg-gray-900 rounded p-4">
                <h3 className="text-lg font-medium mb-2">Test Metadata</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Status:</span>{' '}
                    <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                      {result.success ? 'Passed' : 'Failed'}
                    </span>
                  </div>
                  {!result.success && result.failureReason && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Failure Reason:</span>{' '}
                      <span className="text-red-600">{result.failureReason}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Start Time:</span>{' '}
                    {formatTime(result.startTime)}
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">End Time:</span>{' '}
                    {formatTime(result.endTime)}
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Duration:</span>{' '}
                    {(result.duration / 1000).toFixed(2)}s
                  </div>
                  {result.recordedData?.metadata?.seed && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Game Seed:</span>{' '}
                      {result.recordedData.metadata.seed} ({result.recordedData.metadata.seedName || 'Unknown'})
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-100 dark:bg-gray-900 rounded p-4">
                <h3 className="text-lg font-medium mb-2">Event Statistics</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Total Events:</span>{' '}
                    {result.recordedData?.events?.length || 0}
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">State Snapshots:</span>{' '}
                    {result.recordedData?.snapshots?.length || 0}
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Test Steps:</span>{' '}
                    {result.steps.length}
                  </div>
                  {result.recordedData?.summary?.completedNodes?.length > 0 && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Completed Nodes:</span>{' '}
                      {result.recordedData.summary.completedNodes.length}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Critical Progression */}
            <div className="bg-gray-100 dark:bg-gray-900 rounded p-4 mt-4">
              <h3 className="text-lg font-medium mb-2">Critical Progression</h3>
              
              {result.recordedData?.summary?.criticalPathsCompleted?.length > 0 ? (
                <div>
                  <h4 className="font-medium text-green-600 mb-2">
                    ✓ Critical Paths Completed
                  </h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {result.recordedData.summary.criticalPathsCompleted.map((path: string) => (
                      <li key={path} className="text-green-600">
                        {path.replace(/_/g, ' ')}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-yellow-600">
                  No critical paths were completed during this test.
                </div>
              )}
              
              {result.recordedData?.summary?.progressionBlocks?.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-red-600 mb-2">
                    ⚠ Progression Issues Detected
                  </h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {result.recordedData.summary.progressionBlocks.map((block: any, index: number) => (
                      <li key={index} className="text-red-600">
                        {block.description} ({block.blockType})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Steps Tab */}
        {activeTab === 'steps' && (
          <div className="bg-gray-100 dark:bg-gray-900 rounded p-4">
            <h3 className="text-lg font-medium mb-4">Test Steps</h3>
            <ol className="space-y-4">
              {result.steps.map((step, index) => (
                <li key={index} className="flex">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 dark:bg-blue-800 text-white rounded-full flex items-center justify-center mr-3">
                    {index + 1}
                  </div>
                  <div className="bg-white dark:bg-gray-800 shadow rounded p-3 flex-1">
                    {step}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
        
        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="bg-gray-100 dark:bg-gray-900 rounded p-4">
            <h3 className="text-lg font-medium mb-4">Event Log</h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Event Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Payload
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {result.recordedData?.events?.map((event, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {getRelativeTime(event.timestamp)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getEventColor(event.type)}`}>
                        {formatEventType(event.type)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-md truncate">
                        {event.payload ? JSON.stringify(event.payload).slice(0, 100) : ''}
                        {event.payload && JSON.stringify(event.payload).length > 100 ? '...' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Snapshots Tab */}
        {activeTab === 'snapshots' && (
          <div className="bg-gray-100 dark:bg-gray-900 rounded p-4">
            <h3 className="text-lg font-medium mb-4">State Snapshots</h3>
            
            <div className="space-y-4">
              {result.recordedData?.snapshots?.map((snapshot, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 shadow rounded p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">
                      {snapshot.label}
                    </h4>
                    <span className="text-sm text-gray-500">
                      {getRelativeTime(snapshot.timestamp)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-500 mb-1">Game State</h5>
                      <div className="text-sm">
                        <div>
                          <span className="text-gray-500">State:</span>{' '}
                          {snapshot.state.gameState}
                        </div>
                        <div>
                          <span className="text-gray-500">Phase:</span>{' '}
                          {snapshot.state.gamePhase}
                        </div>
                        <div>
                          <span className="text-gray-500">Day:</span>{' '}
                          {snapshot.state.currentDay}
                        </div>
                        <div>
                          <span className="text-gray-500">Current Node:</span>{' '}
                          {snapshot.state.currentNodeId || 'None'}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="text-sm font-medium text-gray-500 mb-1">Player State</h5>
                      <div className="text-sm">
                        <div>
                          <span className="text-gray-500">Health:</span>{' '}
                          {snapshot.state.player?.health || 0}
                        </div>
                        <div>
                          <span className="text-gray-500">Insight:</span>{' '}
                          {snapshot.state.player?.insight || 0}
                        </div>
                        <div>
                          <span className="text-gray-500">Journal:</span>{' '}
                          {snapshot.state.hasJournal ? 'Yes' : 'No'}
                        </div>
                        <div>
                          <span className="text-gray-500">Completed Nodes:</span>{' '}
                          {snapshot.state.completedNodeIds?.length || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Flow Tab */}
        {activeTab === 'flow' && (
          <div className="bg-gray-100 dark:bg-gray-900 rounded p-4">
            <h3 className="text-lg font-medium mb-4">Event Flow</h3>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded">
              <div className="space-y-1 font-mono text-sm">
                {result.recordedData?.events?.map((event, index) => {
                  // Create a tree-like visualization
                  const isFirst = index === 0;
                  const isLast = index === result.recordedData.events.length - 1;
                  const prefix = isFirst ? '┌' : isLast ? '└' : '├';
                  
                  return (
                    <div key={index} className="flex">
                      <div className="flex-shrink-0 text-gray-500 dark:text-gray-400 mr-2">
                        {prefix}─
                      </div>
                      <div className="flex-shrink-0 text-gray-500 dark:text-gray-400 w-16">
                        {getRelativeTime(event.timestamp)}
                      </div>
                      <div className={`flex-shrink-0 ${getEventColor(event.type)}`}>
                        {formatEventType(event.type)}
                      </div>
                      
                      {/* Event details */}
                      {event.payload && (
                        <div className="ml-4 text-gray-600 dark:text-gray-400 truncate">
                          {event.payload.nodeId && <span>node: {event.payload.nodeId}</span>}
                          {event.payload.character && <span>character: {event.payload.character}</span>}
                          {event.payload.tier && <span>tier: {event.payload.tier}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}