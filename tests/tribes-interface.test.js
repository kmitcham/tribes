const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createClassList() {
  const classes = new Set();
  return {
    add: (...names) => names.forEach((name) => classes.add(name)),
    remove: (...names) => names.forEach((name) => classes.delete(name)),
    toggle: (name, force) => {
      if (force === true) {
        classes.add(name);
        return true;
      }
      if (force === false) {
        classes.delete(name);
        return false;
      }
      if (classes.has(name)) {
        classes.delete(name);
        return false;
      }
      classes.add(name);
      return true;
    },
    contains: (name) => classes.has(name),
    toString: () => Array.from(classes).join(' '),
  };
}

function createElement(tagName = 'div') {
  const attributes = {};
  const element = {
    tagName: String(tagName).toUpperCase(),
    id: '',
    value: '',
    type: 'text',
    className: '',
    style: {},
    dataset: {},
    children: [],
    parentNode: null,
    scrollTop: 0,
    scrollHeight: 0,
    onclick: null,
    onchange: null,
    oninput: null,
    textContent: '',
    innerText: '',
    _innerHTML: '',
    classList: createClassList(),
    setAttribute(name, value) {
      attributes[String(name)] = String(value);
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attributes, String(name))
        ? attributes[String(name)]
        : null;
    },
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      this.scrollHeight = this.children.length;
      return child;
    },
    insertBefore(child, refChild) {
      child.parentNode = this;
      if (!refChild) {
        this.children.push(child);
      } else {
        const idx = this.children.indexOf(refChild);
        if (idx === -1) {
          this.children.push(child);
        } else {
          this.children.splice(idx, 0, child);
        }
      }
      this.scrollHeight = this.children.length;
      return child;
    },
    removeChild(child) {
      const idx = this.children.indexOf(child);
      if (idx >= 0) {
        this.children.splice(idx, 1);
      }
      this.scrollHeight = this.children.length;
      return child;
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    querySelectorAll(selector) {
      if (selector === '.command-item') {
        return this.children.filter(
          (child) =>
            child.className === 'command-item' ||
            (child.classList && child.classList.contains('command-item'))
        );
      }
      return [];
    },
    querySelector() {
      return null;
    },
    set innerHTML(value) {
      this._innerHTML = value;
      if (value === '') {
        this.children = [];
      }
    },
    get innerHTML() {
      return this._innerHTML;
    },
    get firstChild() {
      return this.children[0] || null;
    },
    get lastChild() {
      return this.children[this.children.length - 1] || null;
    },
  };
  return element;
}

function createMockEnvironment() {
  const elements = {
    tribeSelect: createElement('select'),
    playerName: createElement('input'),
    playerPassword: createElement('input'),
    connectionStatus: createElement('div'),
    commandList: createElement('div'),
    messagesContainer: createElement('div'),
    tribeRemembered: createElement('span'),
    nameRemembered: createElement('span'),
    statusText: createElement('div'),
  };

  elements.tribeSelect.value = 'bug';
  elements.playerName.value = 'TestPlayer';
  elements.playerPassword.value = 'TestPass';

  const commandsSection = createElement('section');
  const userInfo = createElement('section');

  const documentMock = {
    cookie: '',
    getElementById: (id) => {
      if (!elements[id]) {
        elements[id] = createElement('div');
        elements[id].id = id;
      }
      return elements[id];
    },
    querySelector: (selector) => {
      if (selector === '.commands-section') return commandsSection;
      if (selector === '.user-info') return userInfo;
      if (selector === 'meta[name="interface-version"]') {
        return { content: 'test-version' };
      }
      return null;
    },
    querySelectorAll: () => [],
    createElement: (tag) => createElement(tag),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    body: createElement('body'),
  };

  const storage = {};
  const localStorageMock = {
    getItem: jest.fn((key) => (key in storage ? storage[key] : null)),
    setItem: jest.fn((key, value) => {
      storage[key] = String(value);
    }),
    removeItem: jest.fn((key) => {
      delete storage[key];
    }),
    clear: jest.fn(() => {
      Object.keys(storage).forEach((key) => delete storage[key]);
    }),
  };

  class InterfaceMockWebSocket {
    constructor(url) {
      this.url = url;
      this.readyState = InterfaceMockWebSocket.OPEN;
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
      this.readyState = InterfaceMockWebSocket.CLOSED;
      if (this.onclose) this.onclose();
    }

    getLastSentMessage() {
      return this.sentMessages.length > 0
        ? JSON.parse(this.sentMessages[this.sentMessages.length - 1])
        : null;
    }
  }

  InterfaceMockWebSocket.CONNECTING = 0;
  InterfaceMockWebSocket.OPEN = 1;
  InterfaceMockWebSocket.CLOSING = 2;
  InterfaceMockWebSocket.CLOSED = 3;

  const windowMock = {
    location: {
      hostname: 'localhost',
      port: '8000',
      protocol: 'http:',
    },
    localStorage: localStorageMock,
    TRIBES_WS_CONFIG: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    matchMedia: jest.fn(() => ({ matches: false, addListener: jest.fn() })),
    navigator: { userAgent: 'jest' },
  };

  return {
    elements,
    documentMock,
    localStorageMock,
    windowMock,
    InterfaceMockWebSocket,
  };
}

function loadRealTribesClient(env) {
  const htmlPath = path.resolve(__dirname, '..', 'tribes-interface.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!scriptMatch) {
    throw new Error('Unable to find script block in tribes-interface.html');
  }

  const rewritten = scriptMatch[1].replace(
    'class TribesClient {',
    'globalThis.TribesClient = class TribesClient {'
  );

  const sandbox = {
    window: env.windowMock,
    document: env.documentMock,
    localStorage: env.localStorageMock,
    WebSocket: env.InterfaceMockWebSocket,
    logWithTimestamp: jest.fn(),
    navigator: env.windowMock.navigator,
    console,
    setTimeout: () => 1,
    setInterval: () => 1,
    clearTimeout: () => {},
    clearInterval: () => {},
    Date,
    Math,
    JSON,
    Object,
    Array,
    Number,
    String,
    Boolean,
    RegExp,
    parseInt,
    parseFloat,
    isNaN,
  };
  sandbox.globalThis = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(rewritten, sandbox, {
    filename: 'tribes-interface.html',
  });

  if (typeof sandbox.TribesClient !== 'function') {
    throw new Error('TribesClient class was not loaded from tribes-interface.html');
  }

  return { TribesClient: sandbox.TribesClient, sandbox };
}

describe('Tribes Interface Client (real class)', () => {
  let env;
  let TribesClient;
  let sandbox;
  let client;

  beforeEach(() => {
    env = createMockEnvironment();
    ({ TribesClient, sandbox } = loadRealTribesClient(env));

    const connectSpy = jest
      .spyOn(TribesClient.prototype, 'connect')
      .mockImplementation(function () {
        this.ws = new env.InterfaceMockWebSocket('ws://localhost:8000');
      });

    client = new TribesClient();
    connectSpy.mockRestore();
  });

  test('stores and restores session through TribesStorage', () => {
    client.storeSession('test-token-123', 'StoredPlayer');

    expect(client.currentSessionToken).toBe('test-token-123');
    expect(client.currentPlayerName).toBe('StoredPlayer');

    client.currentSessionToken = null;
    client.currentPlayerName = null;

    const restored = client.restoreSession();
    expect(restored).toBe(true);
    expect(client.currentSessionToken).toBe('test-token-123');
    expect(client.currentPlayerName).toBe('StoredPlayer');
    expect(env.elements.playerName.value).toBe('StoredPlayer');
  });

  test('updates connection status text and classes', () => {
    const statusEl = env.elements.connectionStatus;

    client.updateConnectionStatus('connecting');
    expect(statusEl.innerHTML).toContain('Connecting...');
    expect(statusEl.className).toBe(
      'status-item connection-status-indicator connecting'
    );

    client.updateConnectionStatus('connected');
    expect(statusEl.innerHTML).toContain('Connected to server');
    expect(statusEl.className).toBe(
      'status-item connection-status-indicator connected'
    );

    client.updateConnectionStatus('disconnected');
    expect(statusEl.innerHTML).toContain('Disconnected from server');
    expect(statusEl.className).toBe(
      'status-item connection-status-indicator disconnected'
    );
  });

  test('send injects client and player metadata into websocket payload', () => {
    client.ws = new env.InterfaceMockWebSocket('ws://localhost:8000');
    client.ws.readyState = env.InterfaceMockWebSocket.OPEN;

    client.send({ type: 'command', command: 'hunt' });

    const sent = client.ws.getLastSentMessage();
    expect(sent).toMatchObject({
      type: 'command',
      command: 'hunt',
      clientId: client.clientId,
      tribe: 'bug',
      playerName: 'TestPlayer',
      password: 'TestPass',
    });
  });

  test('romance targets only include opposite-gender players and exclude self', () => {
    client.currentPopulation = {
      Alice: { name: 'Alice', gender: 'female' },
      Bob: { name: 'Bob', gender: 'male' },
      Carol: { name: 'Carol', gender: 'female' },
      Dan: { name: 'Dan', gender: 'male' },
    };

    const targetsForAlice = client.getValidTargetsForReproduction('Alice');
    expect(targetsForAlice).toEqual(['Bob', 'Dan']);

    const targetsForBob = client.getValidTargetsForReproduction('Bob');
    expect(targetsForBob).toEqual(['Alice', 'Carol']);
  });

  test('addMessage prepends newest message to top of container', () => {
    const container = env.elements.messagesContainer;

    client.addMessage('older message', 'info');
    client.addMessage('newer message', 'info');

    expect(container.children.length).toBe(2);
    expect(container.children[0].innerText).toContain('newer message');
    expect(container.children[1].innerText).toContain('older message');
  });

  test('command list rendering uses production updateCommandList implementation', () => {
    client.commands = {
      join: { description: 'Join the tribe' },
      hunt: { description: 'Hunt for food' },
    };

    client.updateCommandList();

    const items = env.elements.commandList.querySelectorAll('.command-item');
    expect(items.length).toBe(2);
    const names = items.map((item) => item.dataset.command);
    expect(names).toContain('join');
    expect(names).toContain('hunt');
  });

  test('feed child dropdown includes all feed special options and mother shortcuts', () => {
    client.selectedCommand = {
      name: 'feed',
      description: 'Feed children',
      options: [
        { name: 'child', required: true, type: 'string' },
        { name: 'amount', required: false, type: 'number' },
      ],
    };

    client.currentPopulation = {
      TestPlayer: { name: 'TestPlayer', gender: 'male' },
      momA: { name: 'momA', gender: 'female' },
      momB: { name: 'momB', gender: 'female' },
    };

    client.currentChildren = {
      KidA: { name: 'KidA', age: 2, food: 1, mother: 'momA' },
      KidB: { name: 'KidB', age: 3, food: 2, mother: 'momB' },
      AdultKid: { name: 'AdultKid', age: 24, food: 0, mother: 'momA' },
    };

    const container = createElement('div');
    client.renderParametersInContainer(container);

    expect(container.children.length).toBeGreaterThan(0);
    const childGroup = container.children[0];
    const childSelect = childGroup.children.find(
      (el) => el.tagName === 'SELECT'
    );
    expect(childSelect).toBeTruthy();

    const optionValues = childSelect.children.map((opt) => opt.value);
    const optionTexts = childSelect.children.map((opt) => opt.textContent);

    // Regular child options
    expect(optionValues).toContain('KidA');
    expect(optionValues).toContain('KidB');
    expect(optionValues).not.toContain('AdultKid');

    // Feed special options
    expect(optionValues).toContain('!all');
    expect(optionTexts).toContain('All hungry children');
    expect(optionValues).toContain('!under2');
    expect(optionTexts).toContain('Hungry children under age 2 (migration)');

    // Parent shortcut section/options
    expect(optionTexts).toContain('--- Mothers (feed all their children) ---');
    expect(optionValues).toContain('momA');
    expect(optionValues).toContain('momB');
  });
});
