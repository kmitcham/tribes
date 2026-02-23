/**
 * Jest Setup File
 *
 * Global configuration and mocks for all test files
 */

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock WebSocket for all tests
global.WebSocket = class MockWebSocket {
  constructor() {
    this.readyState = 1; // OPEN
    this.sentMessages = [];
    this.onopen = null;
    this.onclose = null;
    this.onmessage = null;
    this.onerror = null;
  }

  send(data) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = 3; // CLOSED
  }

  // Helper methods for testing
  getLastSentMessage() {
    if (this.sentMessages.length === 0) return null;
    return JSON.parse(this.sentMessages[this.sentMessages.length - 1]);
  }

  getAllSentMessages() {
    return this.sentMessages.map((msg) => JSON.parse(msg));
  }

  clearSentMessages() {
    this.sentMessages = [];
  }

  receiveMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }
};

// Mock DOM elements used throughout tests
const createMockElement = (properties = {}) => ({
  value: '',
  textContent: '',
  innerHTML: '',
  className: '',
  id: '',
  type: 'text',
  appendChild: jest.fn(),
  removeChild: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    toggle: jest.fn(),
    contains: jest.fn(() => false),
  },
  style: {},
  children: { length: 0 },
  onclick: null,
  onchange: null,
  oninput: null,
  ...properties,
});

global.document = {
  getElementById: jest.fn((id) => {
    const elements = {
      tribeSelect: createMockElement({ value: 'bear' }),
      playerName: createMockElement({ value: 'TestPlayer' }),
      playerPassword: createMockElement({ value: 'TestPassword' }),
      messagesContainer: createMockElement({
        scrollTop: 0,
        scrollHeight: 100,
      }),
      commandModal: createMockElement(),
      modalTitle: createMockElement(),
      modalDescription: createMockElement(),
      modalCommandParameters: createMockElement(),
      commandForm: createMockElement({ style: { display: 'none' } }),
      commandParameters: createMockElement(),
      executeCommandBtn: createMockElement(),
      registerBtn: createMockElement(),
      refreshDataBtn: createMockElement(),
    };
    return elements[id] || createMockElement();
  }),
  createElement: jest.fn((tag) =>
    createMockElement({ tagName: tag.toUpperCase() })
  ),
  querySelectorAll: jest.fn(() => []),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// Mock window object
global.window = {
  tribesClient: null,
  WebSocket: global.WebSocket,
  location: {
    hostname: 'localhost',
    port: '8080',
  },
};

// Mock setTimeout and setInterval for faster tests
global.setTimeout = jest.fn((fn, delay) => {
  // Execute immediately in tests
  fn();
  return 1;
});

global.setInterval = jest.fn((fn, delay) => {
  // Don't execute in tests
  return 1;
});

global.clearTimeout = jest.fn();
global.clearInterval = jest.fn();

// Helper function to create mock command definitions
global.createMockCommand = (name, options = []) => ({
  name,
  category: 'test',
  description: `Test command: ${name}`,
  options,
  execute: jest.fn(),
});

// Helper function to create mock parameters
global.createMockParameters = (paramMap) => {
  const mockInputs = [];
  for (const [name, value] of Object.entries(paramMap)) {
    mockInputs.push({
      id: `param_${name}`,
      value: Array.isArray(value) ? value.join(',') : value.toString(),
      type: Array.isArray(value) ? 'hidden' : 'text',
    });
  }
  return mockInputs;
};

// Custom matchers for better test assertions
expect.extend({
  toHaveValidCommandStructure(received) {
    const requiredFields = ['type', 'clientId', 'tribe', 'playerName'];
    const missingFields = requiredFields.filter(
      (field) => !(field in received)
    );

    if (missingFields.length > 0) {
      return {
        message: () =>
          `Expected object to have all required command fields. Missing: ${missingFields.join(', ')}`,
        pass: false,
      };
    }

    if (received.type !== 'command' && received.type !== 'registerRequest') {
      return {
        message: () =>
          `Expected type to be 'command' or 'registerRequest', got '${received.type}'`,
        pass: false,
      };
    }

    return {
      message: () => 'Object has valid command structure',
      pass: true,
    };
  },

  toHaveValidParameterFormat(received, expectedParams) {
    const receivedParams = received.parameters || {};

    for (const [key, expectedValue] of Object.entries(expectedParams)) {
      const receivedValue = receivedParams[key];

      if (Array.isArray(expectedValue)) {
        if (!Array.isArray(receivedValue)) {
          return {
            message: () =>
              `Expected parameter '${key}' to be an array, got ${typeof receivedValue}`,
            pass: false,
          };
        }
        if (JSON.stringify(receivedValue) !== JSON.stringify(expectedValue)) {
          return {
            message: () =>
              `Expected parameter '${key}' to equal ${JSON.stringify(expectedValue)}, got ${JSON.stringify(receivedValue)}`,
            pass: false,
          };
        }
      } else {
        if (receivedValue !== expectedValue) {
          return {
            message: () =>
              `Expected parameter '${key}' to equal '${expectedValue}', got '${receivedValue}'`,
            pass: false,
          };
        }
      }
    }

    return {
      message: () => 'Parameters have valid format',
      pass: true,
    };
  },
});

// Global test configuration
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();

  // Reset DOM mock state
  if (document.getElementById.mockClear) document.getElementById.mockClear();
  if (document.createElement.mockClear) document.createElement.mockClear();
  if (document.querySelectorAll.mockClear)
    document.querySelectorAll.mockClear();

  // Reset console mocks
  if (console.log.mockClear) console.log.mockClear();
  if (console.error.mockClear) console.error.mockClear();
  if (console.warn.mockClear) console.warn.mockClear();
});

afterEach(() => {
  // Clean up any global state
  delete global.window.tribesClient;
});

// Suppress specific warnings in tests
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  const warningString = args.join(' ');

  // Suppress specific warnings that are expected in test environment
  if (
    warningString.includes('WebSocket') ||
    warningString.includes('DOM elements') ||
    warningString.includes('localStorage')
  ) {
    return;
  }

  originalConsoleWarn(...args);
};
