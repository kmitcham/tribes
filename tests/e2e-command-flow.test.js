/**
 * End-to-End Tests for Complete Command Workflow
 *
 * Tests the full command flow from client to server and back,
 * ensuring proper integration between WebSocket client and server
 */

// Import our mock classes and functions
const { MockWebSocket } = require('./websocket-server.test.js');

// Mock the DOM environment for client-side testing
const mockDocument = {
  getElementById: (id) => {
    const elements = {
      tribeSelect: { value: 'bear' },
      playerName: { value: 'TestPlayer' },
      playerPassword: { value: 'TestPassword' },
      messagesContainer: {
        appendChild: jest.fn(),
        scrollTop: 0,
        scrollHeight: 100,
        children: { length: 0 },
        removeChild: jest.fn(),
      },
      commandModal: {
        classList: {
          add: jest.fn(),
          remove: jest.fn(),
          contains: () => false,
        },
      },
      modalTitle: { textContent: '' },
      modalDescription: { textContent: '' },
      modalCommandParameters: {
        innerHTML: '',
        querySelectorAll: () => [],
      },
    };
    return (
      elements[id] || {
        value: '',
        appendChild: jest.fn(),
        children: { length: 0 },
        removeChild: jest.fn(),
        classList: { add: jest.fn(), remove: jest.fn() },
      }
    );
  },
  createElement: () => ({
    className: '',
    textContent: '',
    appendChild: jest.fn(),
    children: { length: 0 },
    id: '',
    value: '',
    type: 'text',
  }),
  querySelectorAll: () => [],
};

global.document = mockDocument;

// Simple TribesClient for E2E testing
class TribesClientE2E {
  constructor() {
    this.ws = null;
    this.clientId = 'e2e-client-id';
    this.commands = {};
    this.selectedCommand = null;
    this.receivedMessages = [];
  }

  connect() {
    return new Promise((resolve) => {
      this.ws = new MockWebSocket();
      this.ws.readyState = 1; // WebSocket.OPEN
      this.ws.onopen = () => {
        resolve();
      };
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      };
      // Add receiveMessage method to mock WebSocket
      this.ws.receiveMessage = (message) => {
        if (this.ws.onmessage) {
          this.ws.onmessage({ data: JSON.stringify(message) });
        }
      };
      // Simulate connection
      setTimeout(() => this.ws.onopen(), 10);
    });
  }

  send(data) {
    if (this.ws && this.ws.readyState === 1) {
      data.clientId = this.clientId;
      data.tribe = document.getElementById('tribeSelect').value;
      data.playerName = document.getElementById('playerName').value;
      data.password = document.getElementById('playerPassword').value;

      this.ws.send(JSON.stringify(data));
    }
  }

  handleMessage(data) {
    // Store received messages for testing
    this.receivedMessages.push(data);
  }

  executeCommand(commandName, parameters = {}) {
    this.send({
      type: 'command',
      command: commandName,
      parameters: parameters,
    });
  }
}

// Mock server-side command processing
function mockServerProcessCommand(clientMessage) {
  return new Promise((resolve) => {
    const { type, command, parameters } = JSON.parse(clientMessage);

    let response = {
      type: 'commandResponse',
      command: command,
      clientId: 'e2e-client-id',
    };

    // Simulate command processing based on command type
    switch (command) {
      case 'romance':
        response.success = true;
        response.message = 'Current mating lists: (empty)';
        break;

      case 'craft':
        if (parameters.item) {
          response.success = true;
          response.message = `Successfully crafted ${parameters.item}`;
        } else {
          response.success = false;
          response.message = 'Missing required parameter: item';
        }
        break;

      case 'invite':
        if (parameters.invitelist && Array.isArray(parameters.invitelist)) {
          response.success = true;
          response.message = `Invited players: ${parameters.invitelist.join(', ')}`;
        } else {
          response.success = false;
          response.message = 'Invalid invite list';
        }
        break;

      case 'guard':
        if (parameters.player) {
          response.success = true;
          response.message = `Now guarding ${parameters.player}`;
        } else {
          response.success = false;
          response.message = 'Missing required parameter: player';
        }
        break;

      default:
        response.success = false;
        response.message = `Unknown command: ${command}`;
    }

    // Simulate network delay
    setTimeout(() => resolve(response), 5);
  });
}

describe('End-to-End Command Workflow Tests', () => {
  let client;

  beforeEach(async () => {
    client = new TribesClientE2E();
    await client.connect();
    // Clear any previous state
    client.ws.sentMessages = [];
    client.receivedMessages = [];
    jest.clearAllMocks();
  });

  describe('Complete Command Flow', () => {
    test('should send and receive romance command (no parameters)', async () => {
      // Client sends command
      client.executeCommand('romance');

      // Get the sent message
      const sentMessage = client.ws.sentMessages[0];
      expect(sentMessage).toBeDefined();

      const parsedMessage = JSON.parse(sentMessage);
      expect(parsedMessage).toMatchObject({
        type: 'command',
        command: 'romance',
        parameters: {},
        clientId: 'e2e-client-id',
        tribe: 'bear',
        playerName: 'TestPlayer',
        password: 'TestPassword',
      });

      // Simulate server response
      const serverResponse = await mockServerProcessCommand(sentMessage);
      client.ws.receiveMessage(serverResponse);

      // Verify client received response
      expect(client.receivedMessages).toHaveLength(1);
      expect(client.receivedMessages[0]).toMatchObject({
        type: 'commandResponse',
        command: 'romance',
        success: true,
        message: 'Current mating lists: (empty)',
      });
    });

    test('should send and receive craft command with parameters', async () => {
      // Client sends craft command
      client.executeCommand('craft', {
        item: 'spearhead',
        force: '5',
      });

      const sentMessage = client.ws.sentMessages[0];
      const parsedMessage = JSON.parse(sentMessage);

      expect(parsedMessage).toMatchObject({
        type: 'command',
        command: 'craft',
        parameters: {
          item: 'spearhead',
          force: '5',
        },
      });

      // Simulate server response
      const serverResponse = await mockServerProcessCommand(sentMessage);
      client.ws.receiveMessage(serverResponse);

      expect(client.receivedMessages[0]).toMatchObject({
        type: 'commandResponse',
        command: 'craft',
        success: true,
        message: 'Successfully crafted spearhead',
      });
    });

    test('should handle invite command with array parameters', async () => {
      // Client sends invite command with array
      client.executeCommand('invite', {
        invitelist: ['Player1', 'Player2', 'Player3'],
      });

      const sentMessage = client.ws.sentMessages[0];
      const parsedMessage = JSON.parse(sentMessage);

      expect(parsedMessage).toMatchObject({
        type: 'command',
        command: 'invite',
        parameters: {
          invitelist: ['Player1', 'Player2', 'Player3'],
        },
      });

      // Simulate server response
      const serverResponse = await mockServerProcessCommand(sentMessage);
      client.ws.receiveMessage(serverResponse);

      expect(client.receivedMessages[0]).toMatchObject({
        type: 'commandResponse',
        command: 'invite',
        success: true,
        message: 'Invited players: Player1, Player2, Player3',
      });
    });

    test('should handle guard command with player targeting', async () => {
      // Client sends guard command
      client.executeCommand('guard', {
        player: 'WeakPlayer',
      });

      const sentMessage = client.ws.sentMessages[0];
      const parsedMessage = JSON.parse(sentMessage);

      expect(parsedMessage).toMatchObject({
        type: 'command',
        command: 'guard',
        parameters: {
          player: 'WeakPlayer',
        },
      });

      // Simulate server response
      const serverResponse = await mockServerProcessCommand(sentMessage);
      client.ws.receiveMessage(serverResponse);

      expect(client.receivedMessages[0]).toMatchObject({
        type: 'commandResponse',
        command: 'guard',
        success: true,
        message: 'Now guarding WeakPlayer',
      });
    });
  });

  describe('Error Handling Workflow', () => {
    test('should handle missing required parameters', async () => {
      // Client sends craft command without required item parameter
      client.executeCommand('craft', {});

      const sentMessage = client.ws.sentMessages[0];

      // Simulate server error response
      const serverResponse = await mockServerProcessCommand(sentMessage);
      client.ws.receiveMessage(serverResponse);

      expect(client.receivedMessages[0]).toMatchObject({
        type: 'commandResponse',
        command: 'craft',
        success: false,
        message: 'Missing required parameter: item',
      });
    });

    test('should handle unknown commands', async () => {
      // Client sends unknown command
      client.executeCommand('unknowncommand', {});

      const sentMessage = client.ws.sentMessages[0];

      // Simulate server error response
      const serverResponse = await mockServerProcessCommand(sentMessage);
      client.ws.receiveMessage(serverResponse);

      expect(client.receivedMessages[0]).toMatchObject({
        type: 'commandResponse',
        command: 'unknowncommand',
        success: false,
        message: 'Unknown command: unknowncommand',
      });
    });

    test('should handle invalid parameters', async () => {
      // Client sends invite with invalid parameter format
      client.executeCommand('invite', {
        invitelist: 'not-an-array',
      });

      const sentMessage = client.ws.sentMessages[0];

      // Simulate server error response
      const serverResponse = await mockServerProcessCommand(sentMessage);
      client.ws.receiveMessage(serverResponse);

      expect(client.receivedMessages[0]).toMatchObject({
        type: 'commandResponse',
        command: 'invite',
        success: false,
        message: 'Invalid invite list',
      });
    });
  });

  describe('Complex Workflow Scenarios', () => {
    test('should handle complete reproduction workflow', async () => {
      const commandSequence = [
        { command: 'romance', parameters: {} },
        {
          command: 'invite',
          parameters: { invitelist: ['PreferredMate', 'BackupChoice'] },
        },
        { command: 'romance', parameters: {} }, // Check results
      ];

      const responses = [];

      for (const { command, parameters } of commandSequence) {
        // Clear previous messages
        client.ws.clearSentMessages();
        client.receivedMessages = [];

        // Send command
        client.executeCommand(command, parameters);

        // Get and process response
        const sentMessage = client.ws.sentMessages[0];
        const serverResponse = await mockServerProcessCommand(sentMessage);
        client.ws.receiveMessage(serverResponse);

        responses.push({
          sent: JSON.parse(sentMessage),
          received: client.receivedMessages[0],
        });
      }

      // Verify all steps completed successfully
      expect(responses).toHaveLength(3);

      // First romance command
      expect(responses[0].sent.command).toBe('romance');
      expect(responses[0].received.success).toBe(true);

      // Invite command with array parameters
      expect(responses[1].sent.command).toBe('invite');
      expect(responses[1].sent.parameters.invitelist).toEqual([
        'PreferredMate',
        'BackupChoice',
      ]);
      expect(responses[1].received.success).toBe(true);
      expect(responses[1].received.message).toContain(
        'PreferredMate, BackupChoice'
      );

      // Final romance check
      expect(responses[2].sent.command).toBe('romance');
      expect(responses[2].received.success).toBe(true);
    });

    test('should handle complete work workflow', async () => {
      const commandSequence = [
        { command: 'craft', parameters: { item: 'spear', force: '3' } },
        { command: 'guard', parameters: { player: 'NewPlayer' } },
      ];

      const responses = [];

      for (const { command, parameters } of commandSequence) {
        client.ws.clearSentMessages();
        client.receivedMessages = [];

        client.executeCommand(command, parameters);

        const sentMessage = client.ws.sentMessages[0];
        const serverResponse = await mockServerProcessCommand(sentMessage);
        client.ws.receiveMessage(serverResponse);

        responses.push({
          sent: JSON.parse(sentMessage),
          received: client.receivedMessages[0],
        });
      }

      // Verify craft command completed
      expect(responses[0].sent.command).toBe('craft');
      expect(responses[0].sent.parameters).toEqual({
        item: 'spear',
        force: '3',
      });
      expect(responses[0].received.success).toBe(true);
      expect(responses[0].received.message).toContain('spear');

      // Verify guard command completed
      expect(responses[1].sent.command).toBe('guard');
      expect(responses[1].sent.parameters).toEqual({ player: 'NewPlayer' });
      expect(responses[1].received.success).toBe(true);
      expect(responses[1].received.message).toContain('NewPlayer');
    });

    test('should maintain client state during command sequence', async () => {
      const commands = ['romance', 'craft', 'guard'];
      const sentClientIds = [];

      for (const command of commands) {
        client.executeCommand(
          command,
          command === 'craft'
            ? { item: 'basket' }
            : command === 'guard'
              ? { player: 'TestTarget' }
              : {}
        );

        const sentMessage = JSON.parse(
          client.ws.sentMessages[client.ws.sentMessages.length - 1]
        );
        sentClientIds.push(sentMessage.clientId);
      }

      // All commands should have the same client ID
      expect(sentClientIds).toHaveLength(3);
      expect(sentClientIds.every((id) => id === 'e2e-client-id')).toBe(true);

      // All commands should have the same tribe and player info
      const allMessages = client.ws.sentMessages.map((msg) => JSON.parse(msg));
      expect(allMessages.every((msg) => msg.tribe === 'bear')).toBe(true);
      expect(allMessages.every((msg) => msg.playerName === 'TestPlayer')).toBe(
        true
      );
    });
  });

  describe('Parameter Format Validation', () => {
    test('should preserve parameter types in transmission', async () => {
      const testCases = [
        {
          command: 'craft',
          parameters: { item: 'basket', force: '6' },
          expectedTypes: { item: 'string', force: 'string' },
        },
        {
          command: 'invite',
          parameters: { invitelist: ['P1', 'P2'], pass: 'true' },
          expectedTypes: { invitelist: 'object', pass: 'string' },
        },
        {
          command: 'guard',
          parameters: { player: 'TargetPlayer' },
          expectedTypes: { player: 'string' },
        },
      ];

      for (const testCase of testCases) {
        client.ws.clearSentMessages();

        client.executeCommand(testCase.command, testCase.parameters);

        const sentMessage = JSON.parse(client.ws.sentMessages[0]);
        const sentParameters = sentMessage.parameters;

        // Verify parameter types are preserved
        for (const [key, expectedType] of Object.entries(
          testCase.expectedTypes
        )) {
          expect(typeof sentParameters[key]).toBe(expectedType);
          if (
            expectedType === 'object' &&
            Array.isArray(testCase.parameters[key])
          ) {
            expect(Array.isArray(sentParameters[key])).toBe(true);
          }
        }
      }
    });
  });
});
