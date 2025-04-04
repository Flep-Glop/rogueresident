// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  // Ignore node_modules
  transformIgnorePatterns: [
    '/node_modules/',
  ],
  // Handle module aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/app/$1',
  },
  // Collect coverage from specific directories
  collectCoverageFrom: [
    'app/core/**/*.{ts,tsx}',
    'app/store/**/*.{ts,tsx}',
    '!**/node_modules/**',
  ],
  // Custom setup file for tests
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js',
  ],
  // Ensure tests with similar names don't override each other
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
  ],
  // Allow importing non-JS files in tests
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Global mock implementations
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
};
