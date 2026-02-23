/**
 * Unit Tests for Tribes Interface Client Command System
 *
 * Tests the TribesClient class to ensure commands send correct arguments to the server
 * Covers WebSocket communication, parameter handling, and message structure validation
 */

// Mock WebSocket for testing
class MockWebSocket {
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

  // Simulate receiving a message
  receiveMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }

  // Helper to get last sent message as parsed JSON
  getLastSentMessage() {
    if (this.sentMessages.length === 0) return null;
    return JSON.parse(this.sentMessages[this.sentMessages.length - 1]);
  }

  // Helper to get all sent messages as parsed JSON
  getAllSentMessages() {
    return this.sentMessages.map((msg) => JSON.parse(msg));
  }

  // Clear sent messages array
  clearSentMessages() {
    this.sentMessages = [];
  }
}

// Mock DOM elements
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
    };
    return (
      elements[id] || {
        value: '',
        appendChild: jest.fn(),
        children: { length: 0 },
        removeChild: jest.fn(),
      }
    );
  },
  createElement: (tag) => ({
    className: '',
    textContent: '',
    appendChild: jest.fn(),
    children: { length: 0 },
  }),
  querySelectorAll: () => [],
};

// Mock global objects
global.WebSocket = MockWebSocket;
global.document = mockDocument;
global.console = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };

// Simple TribesClient implementation for testing (extracted from HTML file)
class TribesClient {
  constructor() {
    this.ws = null;
    this.clientId = 'test-client-id';
    this.commands = {};
    this.selectedCommand = null;
    this.currentPopulation = null;
  }

  connect() {
    this.ws = new MockWebSocket();
    this.ws.onopen = () => {
      console.log('Connected to test server');
    };
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };
  }

  send(data) {
    if (this.ws && this.ws.readyState === 1) {
      // WebSocket.OPEN
      data.clientId = this.clientId;
      data.tribe = document.getElementById('tribeSelect').value;
      data.playerName = document.getElementById('playerName').value;
      data.password = document.getElementById('playerPassword').value;

      this.ws.send(JSON.stringify(data));
    } else {
      this.addMessage('Not connected to server', 'error');
    }
  }

  handleMessage(data) {
    // Mock message handling
    console.log('Received mock message:', data);
  }

  addMessage(text, type = 'info') {
    console.log(`[${type}] ${text}`);
  }

  selectCommand(commandName) {
    const command = this.commands[commandName];
    this.selectedCommand = { name: commandName, ...command };

    // If command has no parameters, execute it immediately
    if (!command.options || command.options.length === 0) {
      this.send({
        type: 'command',
        command: commandName,
        parameters: {},
      });
    }
  }

  executeModalCommand(parameters) {
    if (!this.selectedCommand) return;

    this.send({
      type: 'command',
      command: this.selectedCommand.name,
      parameters: parameters,
    });
  }

  registerPlayer() {
    const name = document.getElementById('playerName').value;
    const password = document.getElementById('playerPassword').value;

    this.send({
      type: 'registerRequest',
      playerName: name,
      password: password,
      email: `${name}@tribes.local`,
    });
  }

  collectParametersFromContainer(inputs) {
    const parameters = {};

    inputs.forEach((input) => {
      if (input.id && input.id.startsWith('param_')) {
        const paramName = input.id.replace('param_', '');

        // Handle ordering parameters (comma-separated lists)
        if (input.type === 'hidden' && this.isOrderingOption(paramName)) {
          // Send as array for ordering parameters
          const orderList = input.value ? input.value.split(',') : [];
          parameters[paramName] = orderList;
        } else {
          parameters[paramName] = input.value;
        }
      }
    });

    return parameters;
  }

  isOrderingOption(optionName) {
    const orderingNames = [
      'invite',
      'consent',
      'decline',
      'list',
      'order',
      'priority',
      'sequence',
      'queue',
      'rank',
    ];

    return orderingNames.some((name) =>
      optionName.toLowerCase().includes(name.toLowerCase())
    );
  }

  isPlayerTargetingOption(optionName) {
    if (this.isOrderingOption(optionName)) {
      return false;
    }

    const playerTargetingNames = [
      'target',
      'player',
      'member',
      'user',
      'who',
      'person',
      'candidate',
      'guardian',
      'child',
      'mate',
      'partner',
    ];

    return playerTargetingNames.some((name) =>
      optionName.toLowerCase().includes(name.toLowerCase())
    );
  }
}

describe('TribesClient Command System', () => {
  let tribesClient;
  let mockWs;

  beforeEach(() => {
    // Clear any existing mocks
    jest.clearAllMocks();

    tribesClient = new TribesClient();
    tribesClient.connect();
    mockWs = tribesClient.ws;
  });

  afterEach(() => {
    if (tribesClient && tribesClient.ws) {
      tribesClient.ws.close();
    }
  });

  describe('WebSocket Message Structure', () => {
    test('should send message with correct base structure', () => {
      const testData = { type: 'test', message: 'hello' };

      tribesClient.send(testData);

      const sentMessage = mockWs.getLastSentMessage();
      expect(sentMessage).toMatchObject({
        type: 'test',
        message: 'hello',
        clientId: 'test-client-id',
        tribe: 'bear',
        playerName: 'TestPlayer',
        password: 'TestPassword',
      });
    });

    test('should not send message when WebSocket is not connected', () => {
      tribesClient.ws.readyState = 0; // CONNECTING

      tribesClient.send({ type: 'test' });

      expect(mockWs.sentMessages).toHaveLength(0);
    });
  });

  describe('Player Registration', () => {
    test('should send correct registration request', () => {
      tribesClient.registerPlayer();

      const sentMessage = mockWs.getLastSentMessage();
      expect(sentMessage).toMatchObject({
        type: 'registerRequest',
        playerName: 'TestPlayer',
        password: 'TestPassword',
        email: 'TestPlayer@tribes.local',
        clientId: 'test-client-id',
        tribe: 'bear',
      });
    });
  });

  describe('Command Execution - No Parameters', () => {
    test('should execute command without parameters immediately', () => {
      // Mock a simple command with no options
      tribesClient.commands = {
        romance: {
          category: 'reproduction',
          description: 'Show your current reproduction lists',
          options: [],
        },
      };

      tribesClient.selectCommand('romance');

      const sentMessage = mockWs.getLastSentMessage();
      expect(sentMessage).toMatchObject({
        type: 'command',
        command: 'romance',
        parameters: {},
        clientId: 'test-client-id',
        tribe: 'bear',
        playerName: 'TestPlayer',
        password: 'TestPassword',
      });
    });

    test('should execute children command without parameters', () => {
      tribesClient.commands = {
        children: {
          category: 'reproduction',
          description: 'Show children information',
          options: [],
        },
      };

      tribesClient.selectCommand('children');

      const sentMessage = mockWs.getLastSentMessage();
      expect(sentMessage).toMatchObject({
        type: 'command',
        command: 'children',
        parameters: {},
      });
    });
  });

  describe('Command Execution - With Parameters', () => {
    test('should send craft command with required item parameter', () => {
      const mockCommand = {
        name: 'craft',
        category: 'work',
        description: 'Craft a basket or spearhead',
        options: [
          {
            name: 'item',
            required: true,
            choices: [
              { name: 'basket', value: 'basket' },
              { name: 'spearhead', value: 'spearhead' },
            ],
          },
        ],
      };

      tribesClient.selectedCommand = mockCommand;

      const parameters = { item: 'basket' };
      tribesClient.executeModalCommand(parameters);

      const sentMessage = mockWs.getLastSentMessage();
      expect(sentMessage).toMatchObject({
        type: 'command',
        command: 'craft',
        parameters: { item: 'basket' },
      });
    });

    test('should send craft command with optional force parameter', () => {
      const mockCommand = {
        name: 'craft',
        category: 'work',
        description: 'Craft a basket or spearhead',
        options: [
          { name: 'item', required: true },
          { name: 'force', required: false, type: 'number' },
        ],
      };

      tribesClient.selectedCommand = mockCommand;

      const parameters = { item: 'spearhead', force: '3' };
      tribesClient.executeModalCommand(parameters);

      const sentMessage = mockWs.getLastSentMessage();
      expect(sentMessage).toMatchObject({
        type: 'command',
        command: 'craft',
        parameters: { item: 'spearhead', force: '3' },
      });
    });

    test('should send hunt command with target parameter', () => {
      const mockCommand = {
        name: 'hunt',
        category: 'work',
        description: 'Hunt for food',
        options: [{ name: 'target', required: false, type: 'text' }],
      };

      tribesClient.selectedCommand = mockCommand;

      const parameters = { target: 'deer' };
      tribesClient.executeModalCommand(parameters);

      const sentMessage = mockWs.getLastSentMessage();
      expect(sentMessage).toMatchObject({
        type: 'command',
        command: 'hunt',
        parameters: { target: 'deer' },
      });
    });
  });

  describe('Ordering Parameters (Arrays)', () => {
    test('should handle invite command with ordered player list', () => {
      const mockInputs = [
        {
          id: 'param_invitelist',
          type: 'hidden',
          value: 'PlayerA,PlayerB,PlayerC',
        },
      ];

      const parameters =
        tribesClient.collectParametersFromContainer(mockInputs);

      expect(parameters).toEqual({
        invitelist: ['PlayerA', 'PlayerB', 'PlayerC'],
      });
    });

    test('should handle consent command with ordered player list', () => {
      const mockInputs = [
        {
          id: 'param_consentlist',
          type: 'hidden',
          value: 'Player1,Player2',
        },
      ];

      const parameters =
        tribesClient.collectParametersFromContainer(mockInputs);

      expect(parameters).toEqual({
        consentlist: ['Player1', 'Player2'],
      });
    });

    test('should handle decline command with ordered player list', () => {
      const mockInputs = [
        {
          id: 'param_declinelist',
          type: 'hidden',
          value: 'UnwantedPlayer1,UnwantedPlayer2',
        },
      ];

      const parameters =
        tribesClient.collectParametersFromContainer(mockInputs);

      expect(parameters).toEqual({
        declinelist: ['UnwantedPlayer1', 'UnwantedPlayer2'],
      });
    });

    test('should handle empty ordering parameter as empty array', () => {
      const mockInputs = [
        {
          id: 'param_invitelist',
          type: 'hidden',
          value: '',
        },
      ];

      const parameters =
        tribesClient.collectParametersFromContainer(mockInputs);

      expect(parameters).toEqual({
        invitelist: [],
      });
    });

    test('should send complete invite command with array parameter', () => {
      const mockCommand = {
        name: 'invite',
        category: 'reproduction',
        description: 'Invite players to mate',
        options: [{ name: 'invitelist', required: false }],
      };

      tribesClient.selectedCommand = mockCommand;

      const parameters = { invitelist: ['PlayerA', 'PlayerB'] };
      tribesClient.executeModalCommand(parameters);

      const sentMessage = mockWs.getLastSentMessage();
      expect(sentMessage).toMatchObject({
        type: 'command',
        command: 'invite',
        parameters: { invitelist: ['PlayerA', 'PlayerB'] },
      });
    });
  });

  describe('Player Targeting Parameters', () => {
    test('should identify player targeting options correctly', () => {
      expect(tribesClient.isPlayerTargetingOption('target')).toBe(true);
      expect(tribesClient.isPlayerTargetingOption('player')).toBe(true);
      expect(tribesClient.isPlayerTargetingOption('member')).toBe(true);
      expect(tribesClient.isPlayerTargetingOption('candidate')).toBe(true);
      expect(tribesClient.isPlayerTargetingOption('guardian')).toBe(true);
      expect(tribesClient.isPlayerTargetingOption('mate')).toBe(true);

      // Should not identify ordering options as player targeting
      expect(tribesClient.isPlayerTargetingOption('invitelist')).toBe(false);
      expect(tribesClient.isPlayerTargetingOption('consentlist')).toBe(false);

      // Should not identify random strings
      expect(tribesClient.isPlayerTargetingOption('item')).toBe(false);
      expect(tribesClient.isPlayerTargetingOption('force')).toBe(false);
    });

    test('should handle babysit command with target parameter', () => {
      const mockInputs = [
        {
          id: 'param_target',
          type: 'text',
          value: 'ChildPlayer',
        },
      ];

      const parameters =
        tribesClient.collectParametersFromContainer(mockInputs);

      expect(parameters).toEqual({
        target: 'ChildPlayer',
      });
    });

    test('should send guard command with player parameter', () => {
      const mockCommand = {
        name: 'guard',
        category: 'work',
        description: 'Guard another player',
        options: [{ name: 'player', required: true }],
      };

      tribesClient.selectedCommand = mockCommand;

      const parameters = { player: 'TargetPlayer' };
      tribesClient.executeModalCommand(parameters);

      const sentMessage = mockWs.getLastSentMessage();
      expect(sentMessage).toMatchObject({
        type: 'command',
        command: 'guard',
        parameters: { player: 'TargetPlayer' },
      });
    });
  });

  describe('Mixed Parameter Types', () => {
    test('should handle command with both regular and ordering parameters', () => {
      const mockInputs = [
        {
          id: 'param_item',
          type: 'text',
          value: 'spear',
        },
        {
          id: 'param_priority',
          type: 'hidden',
          value: 'Player1,Player2,Player3',
        },
        {
          id: 'param_force',
          type: 'number',
          value: '4',
        },
      ];

      const parameters =
        tribesClient.collectParametersFromContainer(mockInputs);

      expect(parameters).toEqual({
        item: 'spear',
        priority: ['Player1', 'Player2', 'Player3'],
        force: '4',
      });
    });

    test('should handle complex reproduction command', () => {
      const mockCommand = {
        name: 'invite',
        category: 'reproduction',
        description: 'Invite players with priority order',
        options: [
          { name: 'invitelist', required: true },
          { name: 'pass', required: false, type: 'boolean' },
        ],
      };

      tribesClient.selectedCommand = mockCommand;

      const parameters = {
        invitelist: ['PreferredMate', 'SecondChoice'],
        pass: 'true',
      };
      tribesClient.executeModalCommand(parameters);

      const sentMessage = mockWs.getLastSentMessage();
      expect(sentMessage).toMatchObject({
        type: 'command',
        command: 'invite',
        parameters: {
          invitelist: ['PreferredMate', 'SecondChoice'],
          pass: 'true',
        },
      });
    });
  });

  describe('Parameter Option Detection', () => {
    test('should identify ordering options correctly', () => {
      expect(tribesClient.isOrderingOption('invite')).toBe(true);
      expect(tribesClient.isOrderingOption('invitelist')).toBe(true);
      expect(tribesClient.isOrderingOption('consent')).toBe(true);
      expect(tribesClient.isOrderingOption('consentlist')).toBe(true);
      expect(tribesClient.isOrderingOption('decline')).toBe(true);
      expect(tribesClient.isOrderingOption('declinelist')).toBe(true);
      expect(tribesClient.isOrderingOption('priority')).toBe(true);
      expect(tribesClient.isOrderingOption('order')).toBe(true);
      expect(tribesClient.isOrderingOption('sequence')).toBe(true);
      expect(tribesClient.isOrderingOption('queue')).toBe(true);
      expect(tribesClient.isOrderingOption('rank')).toBe(true);

      // Should not identify regular parameters
      expect(tribesClient.isOrderingOption('item')).toBe(false);
      expect(tribesClient.isOrderingOption('target')).toBe(false);
      expect(tribesClient.isOrderingOption('force')).toBe(false);
    });
  });

  describe('Error Cases and Edge Cases', () => {
    test('should handle empty parameters object', () => {
      const mockCommand = {
        name: 'test',
        category: 'test',
        description: 'Test command',
      };

      tribesClient.selectedCommand = mockCommand;

      const parameters = {};
      tribesClient.executeModalCommand(parameters);

      const sentMessage = mockWs.getLastSentMessage();
      expect(sentMessage).toMatchObject({
        type: 'command',
        command: 'test',
        parameters: {},
      });
    });

    test('should handle undefined parameter values', () => {
      const mockInputs = [
        {
          id: 'param_optional',
          type: 'text',
          value: '',
        },
      ];

      const parameters =
        tribesClient.collectParametersFromContainer(mockInputs);

      expect(parameters).toEqual({
        optional: '',
      });
    });

    test('should skip inputs without param_ prefix', () => {
      const mockInputs = [
        {
          id: 'param_valid',
          type: 'text',
          value: 'validValue',
        },
        {
          id: 'invalid_input', // Missing param_ prefix
          type: 'text',
          value: 'shouldBeIgnored',
        },
      ];

      const parameters =
        tribesClient.collectParametersFromContainer(mockInputs);

      expect(parameters).toEqual({
        valid: 'validValue',
      });
      expect(parameters.invalid_input).toBeUndefined();
    });

    test('should handle single item in ordering parameter', () => {
      const mockInputs = [
        {
          id: 'param_invitelist',
          type: 'hidden',
          value: 'OnlyPlayer',
        },
      ];

      const parameters =
        tribesClient.collectParametersFromContainer(mockInputs);

      expect(parameters).toEqual({
        invitelist: ['OnlyPlayer'],
      });
    });
  });

  describe('Message History and Tracking', () => {
    test('should track multiple command executions', () => {
      // Execute romance command
      tribesClient.commands = {
        romance: { options: [] },
      };
      tribesClient.selectCommand('romance');

      // Execute craft command
      const craftCommand = {
        name: 'craft',
        options: [{ name: 'item', required: true }],
      };
      tribesClient.selectedCommand = craftCommand;
      tribesClient.executeModalCommand({ item: 'basket' });

      const allMessages = mockWs.getAllSentMessages();

      expect(allMessages).toHaveLength(2);
      expect(allMessages[0]).toMatchObject({
        type: 'command',
        command: 'romance',
        parameters: {},
      });
      expect(allMessages[1]).toMatchObject({
        type: 'command',
        command: 'craft',
        parameters: { item: 'basket' },
      });
    });

    test('should maintain consistent clientId across messages', () => {
      tribesClient.registerPlayer();

      tribesClient.commands = { romance: { options: [] } };
      tribesClient.selectCommand('romance');

      const allMessages = mockWs.getAllSentMessages();

      expect(allMessages).toHaveLength(2);
      expect(allMessages[0].clientId).toBe('test-client-id');
      expect(allMessages[1].clientId).toBe('test-client-id');
    });
  });

  describe('Integration Test Scenarios', () => {
    test('should handle complete reproduction workflow', () => {
      // 1. Register player
      tribesClient.registerPlayer();

      // 2. Execute romance command to see current lists
      tribesClient.commands = { romance: { options: [] } };
      tribesClient.selectCommand('romance');

      // 3. Invite players
      const inviteCommand = {
        name: 'invite',
        options: [{ name: 'invitelist', required: true }],
      };
      tribesClient.selectedCommand = inviteCommand;
      tribesClient.executeModalCommand({
        invitelist: ['PreferredMate', 'BackupChoice'],
      });

      // 4. Consent to other invitations
      const consentCommand = {
        name: 'consent',
        options: [{ name: 'consentlist', required: true }],
      };
      tribesClient.selectedCommand = consentCommand;
      tribesClient.executeModalCommand({
        consentlist: ['AcceptablePartner'],
      });

      const allMessages = mockWs.getAllSentMessages();

      expect(allMessages).toHaveLength(4);

      // Verify registration
      expect(allMessages[0]).toMatchObject({
        type: 'registerRequest',
        playerName: 'TestPlayer',
      });

      // Verify romance command
      expect(allMessages[1]).toMatchObject({
        type: 'command',
        command: 'romance',
        parameters: {},
      });

      // Verify invite command
      expect(allMessages[2]).toMatchObject({
        type: 'command',
        command: 'invite',
        parameters: { invitelist: ['PreferredMate', 'BackupChoice'] },
      });

      // Verify consent command
      expect(allMessages[3]).toMatchObject({
        type: 'command',
        command: 'consent',
        parameters: { consentlist: ['AcceptablePartner'] },
      });
    });

    test('should handle complete work workflow', () => {
      // 1. Register player
      tribesClient.registerPlayer();

      // 2. Craft items
      const craftCommand = {
        name: 'craft',
        options: [
          { name: 'item', required: true },
          { name: 'force', required: false },
        ],
      };
      tribesClient.selectedCommand = craftCommand;
      tribesClient.executeModalCommand({
        item: 'spearhead',
        force: '5',
      });

      // 3. Go hunting
      const huntCommand = {
        name: 'hunt',
        options: [{ name: 'target', required: false }],
      };
      tribesClient.selectedCommand = huntCommand;
      tribesClient.executeModalCommand({
        target: 'deer',
      });

      // 4. Guard another player
      const guardCommand = {
        name: 'guard',
        options: [{ name: 'player', required: true }],
      };
      tribesClient.selectedCommand = guardCommand;
      tribesClient.executeModalCommand({
        player: 'WeakPlayer',
      });

      const allMessages = mockWs.getAllSentMessages();

      expect(allMessages).toHaveLength(4);

      // Verify all commands sent correct parameters
      expect(allMessages[1]).toMatchObject({
        type: 'command',
        command: 'craft',
        parameters: { item: 'spearhead', force: '5' },
      });

      expect(allMessages[2]).toMatchObject({
        type: 'command',
        command: 'hunt',
        parameters: { target: 'deer' },
      });

      expect(allMessages[3]).toMatchObject({
        type: 'command',
        command: 'guard',
        parameters: { player: 'WeakPlayer' },
      });
    });
  });
});
