// tests/setup.js
/**
 * Global test setup file for Jest
 * 
 * This sets up the test environment with necessary mocks
 * and globals to enable testing of the progression system.
 */

// Mock window and localStorage
if (typeof window === 'undefined') {
    global.window = {
      localStorage: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      },
      fs: {
        readFile: jest.fn().mockImplementation((path, options) => {
          return Promise.resolve(Buffer.from('Mock file content'));
        })
      }
    };
  }
  
  // Mock requestAnimationFrame and cancelAnimationFrame
  if (typeof window === 'undefined' || !window.requestAnimationFrame) {
    global.requestAnimationFrame = (callback) => setTimeout(callback, 0);
    global.cancelAnimationFrame = (id) => clearTimeout(id);
  }
  
  // Mock console methods to reduce noise during tests
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  console.error = (...args) => {
    // Don't print React's act warnings
    if (args[0] && typeof args[0] === 'string' && args[0].includes('inside a test was not wrapped in act')) {
      return;
    }
    originalConsoleError(...args);
  };
  
  console.warn = (...args) => {
    // Suppress specific warnings
    if (args[0] && typeof args[0] === 'string' && 
        (args[0].includes('deprecated') || args[0].includes('is not valid'))) {
      return;
    }
    originalConsoleWarn(...args);
  };
  
  // Global cleanup after tests
  afterAll(() => {
    // Restore console methods
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });