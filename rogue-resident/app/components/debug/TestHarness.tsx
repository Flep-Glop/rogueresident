// app/components/debug/TestHarness.tsx
'use client';

/**
 * Test Harness Component
 * 
 * A development-only UI for running and visualizing game progression tests.
 * Allows testers to:
 * - Run specific progression validators
 * - View test results and event flows
 * - Export and share test results
 * - Identify progression issues
 * 
 * This component is only included in development builds.
 */

import React, { useState, useEffect } from 'react';
import { runValidator, runAllValidators } from '../../../tests/progressionValidators';
import TestResultsViewer from './TestResultsViewer';
import { useGameStore } from '../../store/gameStore';
import { EventRecorder } from '../../core/debug/EventRecorder';

interface TestResult {
  success: boolean;
  name: string;
  description: string;
  recordedData: any;
  steps: string[];
  failureReason: string | null;
  startTime: number;
  endTime: number;
  duration: number;
}

const TEST_VALIDATORS = [
  { id: 'journalAcquisition', name: 'Journal Acquisition' },
  { id: 'dayNightCycle', name: 'Day-Night Cycle' },
  { id: 'multiDayProgression', name: 'Multi-Day Progression' },
  { id: 'progressionProtection', name: 'Progression Protection' }
];

export default function TestHarness() {
  const [selectedValidator, setSelectedValidator] = useState('journalAcquisition');
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [activeResultIndex, setActiveResultIndex] = useState<number | null>(null);
  const resetGame = useGameStore(state => state.resetGame);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  
  // Function to run the selected validator
  const runTest = async () => {
    setIsRunning(true);
    
    try {
      const result = await runValidator(selectedValidator);
      setResults(prev => [...prev, result]);
      setActiveResultIndex(prev => (prev === null) ? 0 : prev);
    } catch (error) {
      console.error('Error running validator:', error);
    } finally {
      setIsRunning(false);
    }
  };
  
  // Function to run all validators
  const runAllTests = async () => {
    setIsRunning(true);
    setResults([]);
    
    try {
      const allResults = await runAllValidators();
      setResults(allResults);
      setActiveResultIndex(0);
    } catch (error) {
      console.error('Error running all validators:', error);
    } finally {
      setIsRunning(false);
    }
  };
  
  // Toggle whether the harness is open
  const toggleHarness = () => {
    setIsOpen(!isOpen);
    setIsPanelOpen(false);
  };
  
  // Reset game state
  const handleReset = () => {
    resetGame();
  };
  
  // Clear all results
  const clearResults = () => {
    setResults([]);
    setActiveResultIndex(null);
  };
  
  // Export results as JSON
  const exportResults = () => {
    if (results.length === 0) return;
    
    const dataStr = JSON.stringify(results, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportDate = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const fileName = `rogue-resident-tests-${exportDate}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', fileName);
    linkElement.click();
  };
  
  // Only show in development mode
  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Test Harness Toggle Button */}
      <button
        onClick={toggleHarness}
        className="bg-purple-600 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-purple-700 transition-colors"
      >
        {isOpen ? 'Close Test Harness' : '🧪 Test Harness'}
      </button>
      
      {/* Main Test Harness Panel */}
      {isOpen && (
        <div className="fixed bottom-16 right-4 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold">Progression Test Harness</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Run tests to validate critical game progression paths
            </p>
          </div>
          
          <div className="p-4 space-y-4">
            {/* Validator Selection */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Select Validator
              </label>
              <select
                value={selectedValidator}
                onChange={(e) => setSelectedValidator(e.target.value)}
                disabled={isRunning}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
              >
                {TEST_VALIDATORS.map((validator) => (
                  <option key={validator.id} value={validator.id}>
                    {validator.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Run Controls */}
            <div className="flex space-x-2">
              <button
                onClick={runTest}
                disabled={isRunning}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 flex-1"
              >
                {isRunning ? 'Running...' : 'Run Test'}
              </button>
              <button
                onClick={runAllTests}
                disabled={isRunning}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 flex-1"
              >
                Run All
              </button>
            </div>
            
            {/* Results Summary */}
            {results.length > 0 && (
              <div className="mt-4">
                <h3 className="text-md font-medium mb-2">Test Results</h3>
                <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded max-h-32 overflow-y-auto">
                  {results.map((result, index) => (
                    <div 
                      key={`${result.name}-${result.startTime}`}
                      onClick={() => setActiveResultIndex(index)}
                      className={`p-2 mb-1 rounded cursor-pointer ${
                        activeResultIndex === index 
                          ? 'bg-blue-100 dark:bg-blue-900' 
                          : 'hover:bg-gray-200 dark:hover:bg-gray-800'
                      } ${
                        result.success 
                          ? 'border-l-4 border-green-500' 
                          : 'border-l-4 border-red-500'
                      }`}
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">{result.name}</span>
                        <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                          {result.success ? '✓ Passed' : '✗ Failed'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Duration: {(result.duration / 1000).toFixed(2)}s
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex space-x-2">
              <button
                onClick={() => setIsPanelOpen(!isPanelOpen)}
                disabled={results.length === 0 || activeResultIndex === null}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50 flex-1"
              >
                {isPanelOpen ? 'Hide Details' : 'Show Details'}
              </button>
              <button
                onClick={clearResults}
                disabled={results.length === 0}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50 flex-1"
              >
                Clear Results
              </button>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handleReset}
                className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 flex-1"
              >
                Reset Game
              </button>
              <button
                onClick={exportResults}
                disabled={results.length === 0}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50 flex-1"
              >
                Export Results
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Detailed Results Panel */}
      {isPanelOpen && activeResultIndex !== null && results[activeResultIndex] && (
        <TestResultsViewer 
          result={results[activeResultIndex]} 
          onClose={() => setIsPanelOpen(false)}
        />
      )}
    </div>
  );
}