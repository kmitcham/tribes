// Set test environment before Jest loads modules for coverage instrumentation
process.env.NODE_ENV = 'test';

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Force exit to handle any async operations
  forceExit: true,
  
  // Use single worker to prevent conflicts with module imports
  maxWorkers: 1,

  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js',
  ],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'tribes-interface.html',
    'websocket-server.js',
    'libs/**/*.js',
    '!node_modules/**',
    '!tests/**',
    '!coverage/**',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 45,
      functions: 55,
      lines: 55,
      statements: 55,
    },
  },

  // Setup files - setEnv runs first (before modules load)
  setupFiles: ['<rootDir>/tests/setEnv.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Module paths
  moduleDirectories: ['node_modules', '<rootDir>'],

  // Transform configuration
  transform: {
    '^.+\\.js$': 'babel-jest',
  },

  // Test timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks between tests
  restoreMocks: true,
};
