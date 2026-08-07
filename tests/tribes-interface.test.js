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

function matchesSelector(el, selector) {
  if (!el || !selector) return false;
  const parts = String(selector)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.some((part) => {
    if (part.startsWith('.')) {
      const className = part.slice(1);
      return (
        el.className === className ||
        (el.classList && el.classList.contains(className))
      );
    }
    if (part.startsWith('#')) {
      return el.id === part.slice(1);
    }
    // tag name, e.g. "input" or "select"
    return String(el.tagName || '').toLowerCase() === part.toLowerCase();
  });
}

function createElement(tagName = 'div') {
  const attributes = {};
  const element = {
    tagName: String(tagName).toUpperCase(),
    id: '',
    value: '',
    type: 'text',
    checked: false,
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
      const results = [];
      const walk = (node) => {
        if (!node || !node.children) return;
        for (const child of node.children) {
          if (matchesSelector(child, selector)) {
            results.push(child);
          }
          walk(child);
        }
      };
      walk(this);
      return results;
    },
    querySelector(selector) {
      const matches = this.querySelectorAll(selector);
      return matches[0] || null;
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
    joinPromptStatus: createElement('div'),
  };
  elements.joinPromptStatus.id = 'joinPromptStatus';
  elements.joinPromptStatus.style.display = 'none';

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

  test('join prompt status chip shows when logged in and not a tribe member', () => {
    const joinChip = env.elements.joinPromptStatus;
    joinChip.style.display = 'none';

    // Not logged in — hidden even if isMember is false
    client.isLoggedIn = false;
    client.isMember = false;
    client.updateJoinPromptStatusChip();
    expect(joinChip.style.display).toBe('none');

    // Logged in but membership unknown — still hidden
    client.isLoggedIn = true;
    client.isMember = null;
    client.updateJoinPromptStatusChip();
    expect(joinChip.style.display).toBe('none');

    // Logged in non-member — show prompt
    client.isMember = false;
    client.updateJoinPromptStatusChip();
    expect(joinChip.style.display).toBe('flex');
    expect(joinChip.innerHTML).toMatch(/Use.*join.*to start playing/i);
    expect(joinChip.innerHTML).toMatch(/<strong>join<\/strong>/i);
    expect(joinChip.classList.contains('join-prompt-attention')).toBe(true);

    // Logged in member — hide
    client.isMember = true;
    client.updateJoinPromptStatusChip();
    expect(joinChip.style.display).toBe('none');
    expect(joinChip.classList.contains('join-prompt-attention')).toBe(false);
  });

  test('handleCommandList updates join prompt from isMember', () => {
    const joinChip = env.elements.joinPromptStatus;
    joinChip.style.display = 'none';
    client.isLoggedIn = true;

    client.handleCommandList({
      commands: { join: { description: 'Join the tribe' } },
      isMember: false,
    });
    expect(client.isMember).toBe(false);
    expect(joinChip.style.display).toBe('flex');
    expect(joinChip.innerHTML).toMatch(/Use.*join.*to start playing/i);
    expect(joinChip.innerHTML).toMatch(/<strong>join<\/strong>/i);

    client.handleCommandList({
      commands: { hunt: { description: 'Hunt for food' } },
      isMember: true,
    });
    expect(client.isMember).toBe(true);
    expect(joinChip.style.display).toBe('none');
  });

  test('loadMessageHistory waits for tribe and player before reading storage', () => {
    const key = 'tribesMessages_bug_TestPlayer';
    env.localStorageMock.setItem(
      key,
      JSON.stringify([
        {
          text: 'Stored hunt result',
          type: 'info',
          typeLabel: '[HUNT]',
          timestamp: Date.now() - 1000,
        },
      ])
    );

    env.elements.tribeSelect.value = '';
    env.elements.playerName.value = 'TestPlayer';
    client._loadedHistoryKey = null;
    client.loadMessageHistory();
    expect(client._loadedHistoryKey).toBeFalsy();
    expect(env.elements.messagesContainer.children.length).toBe(0);

    env.elements.tribeSelect.value = 'bug';
    env.elements.playerName.value = '';
    client.loadMessageHistory();
    expect(client._loadedHistoryKey).toBeFalsy();
    expect(env.elements.messagesContainer.children.length).toBe(0);

    env.elements.playerName.value = 'TestPlayer';
    client.loadMessageHistory();
    expect(client._loadedHistoryKey).toBe(key);
    // Restored message + separator
    expect(env.elements.messagesContainer.children.length).toBeGreaterThanOrEqual(1);

    function collectText(node) {
      if (!node) return '';
      let text = String(node.innerText || node.textContent || '');
      if (node.children) {
        for (const child of node.children) {
          text += collectText(child);
        }
      }
      return text;
    }
    const restoredTexts = env.elements.messagesContainer.children.map(collectText);
    expect(restoredTexts.some((t) => String(t).includes('Stored hunt result'))).toBe(
      true
    );
  });

  test('replay messages are persisted for reload and restored messages are not re-stored', () => {
    env.elements.tribeSelect.value = 'bug';
    env.elements.playerName.value = 'TestPlayer';
    const key = client.getMessageHistoryKey();
    env.localStorageMock.removeItem(key);

    // addMessage(text, type, typeLabel, isRestored, insertAtTop, isReplay)
    client.addMessage('Offline catch-up line', 'info', '[TRIBE]', false, true, true);

    const stored = JSON.parse(env.localStorageMock.getItem(key) || '[]');
    expect(stored.some((m) => m.text === 'Offline catch-up line')).toBe(true);

    const countAfterReplay = stored.length;
    client.addMessage('Already in local history', 'info', null, true, false, false);
    const afterRestore = JSON.parse(env.localStorageMock.getItem(key) || '[]');
    expect(afterRestore.length).toBe(countAfterReplay);
  });

  test('updateTribeDropdown triggers history load for the selected tribe', () => {
    env.elements.tribeSelect.value = 'bug';
    env.elements.playerName.value = 'TestPlayer';
    client._loadedHistoryKey = null;
    client.isReferee = true;
    env.elements.messagesContainer.children = [];

    env.localStorageMock.setItem(
      'tribesMessages_bug_TestPlayer',
      JSON.stringify([
        {
          text: 'Bug tribe news',
          type: 'info',
          timestamp: Date.now() - 500,
        },
      ])
    );

    client.updateTribeDropdown({
      bear: { name: 'bear', hidden: false },
      bug: { name: 'bug', hidden: false },
    });

    expect(env.elements.tribeSelect.value).toBe('bug');
    expect(client._loadedHistoryKey).toBe('tribesMessages_bug_TestPlayer');
    function collectText(node) {
      if (!node) return '';
      let text = String(node.innerText || node.textContent || '');
      if (node.children) {
        for (const child of node.children) {
          text += collectText(child);
        }
      }
      return text;
    }
    const texts = env.elements.messagesContainer.children.map(collectText);
    expect(texts.some((t) => String(t).includes('Bug tribe news'))).toBe(true);
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
    // Content is in a .message-body child span
    const topText =
      container.children[0].children[0]?.textContent ||
      container.children[0].innerText ||
      '';
    const bottomText =
      container.children[1].children[0]?.textContent ||
      container.children[1].innerText ||
      '';
    expect(topText).toContain('newer message');
    expect(bottomText).toContain('older message');
  });

  test('addMessage and storeMessage preserve newlines in multi-line text', () => {
    env.elements.tribeSelect.value = 'bug';
    env.elements.playerName.value = 'TestPlayer';
    const key = client.getMessageHistoryKey();
    env.localStorageMock.removeItem(key);

    const multi =
      '### GAME OVER ###\n👶 The fate of the children:\n- KidA grows up\n- KidB dies young';
    client.addMessage(multi, 'tribe', '[TRIBE]');

    const msgEl = env.elements.messagesContainer.children[0];
    expect(msgEl).toBeTruthy();
    const body = msgEl.children.find(
      (el) => el.className === 'message-body'
    );
    expect(body).toBeTruthy();
    expect(body.textContent).toContain('\n');
    expect(body.textContent).toContain('GAME OVER');
    expect(body.textContent).toContain('KidA grows up');

    const stored = JSON.parse(env.localStorageMock.getItem(key) || '[]');
    expect(stored.length).toBeGreaterThan(0);
    expect(stored[stored.length - 1].text).toContain('\n');
    expect(stored[stored.length - 1].text).toContain(
      'The fate of the children:'
    );
    // Control chars stripped, newlines kept
    expect(stored[stored.length - 1].text).not.toMatch(/\u0000/);
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

  test('status bar shows current tribe name when a tribe is selected', () => {
    const tribeChip = env.documentMock.getElementById('currentTribeStatus');
    env.elements.tribeSelect.value = 'bug';
    env.elements.tribeSelect.selectedOptions = [
      { value: 'bug', textContent: 'Bug' },
    ];

    client.updateCurrentTribeStatusChip({});

    expect(tribeChip.style.display).toBe('flex');
    expect(tribeChip.innerHTML).toMatch(/Tribe:\s*Bug/i);
    expect(tribeChip.innerHTML).toMatch(/🏕️|🔀/);

    // Multi-tribe players get the switch icon
    client.updateCurrentTribeStatusChip({ playerTribeCount: 3 });
    expect(tribeChip.innerHTML).toContain('🔀');
    expect(tribeChip.title).toMatch(/bug/i);

    env.elements.tribeSelect.value = '';
    env.elements.tribeSelect.selectedOptions = [];
    client.updateCurrentTribeStatusChip({});
    expect(tribeChip.style.display).toBe('none');
  });

  test('join form lists all tribes with the current tribe selected', () => {
    env.elements.tribeSelect.value = 'bug';
    // Mock options list for fallback path
    env.elements.tribeSelect.options = [
      { value: 'bear', textContent: 'Bear' },
      { value: 'bug', textContent: 'Bug' },
      { value: 'wolf', textContent: 'Wolf' },
    ];
    client.currentTribes = {
      bear: { name: 'bear', hidden: false },
      bug: { name: 'bug', hidden: false },
      wolf: { name: 'wolf', hidden: false },
      secret: { name: 'secret', hidden: true },
    };
    client.isReferee = false;

    client.selectedCommand = {
      name: 'join',
      description: 'join a tribe with open enrollment',
      options: [
        {
          name: 'gender',
          required: true,
          type: 'string',
          choices: [
            { name: 'male', value: 'm' },
            { name: 'female', value: 'f' },
          ],
        },
        {
          name: 'profession',
          required: false,
          type: 'string',
          choices: [
            { name: 'hunter', value: 'hunter' },
            { name: 'gatherer', value: 'gatherer' },
          ],
        },
      ],
    };

    const container = createElement('div');
    client.renderParametersInContainer(container);

    function findById(root, id) {
      if (root.id === id) return root;
      if (!root.children) return null;
      for (const child of root.children) {
        const found = findById(child, id);
        if (found) return found;
      }
      return null;
    }

    const tribeSelect = findById(container, 'join_tribe_select');
    expect(tribeSelect).toBeTruthy();
    expect(tribeSelect.tagName).toBe('SELECT');
    expect(tribeSelect.value).toBe('bug');

    const values = tribeSelect.children.map((opt) => opt.value);
    expect(values).toContain('bear');
    expect(values).toContain('bug');
    expect(values).toContain('wolf');
    // Hidden tribes hidden from non-referees
    expect(values).not.toContain('secret');

    const selectedOpt = tribeSelect.children.find((o) => o.value === 'bug');
    expect(selectedOpt.textContent).toMatch(/selected/i);

    const note = container.children[0].children.find(
      (el) => el.className === 'helper-text'
    );
    expect(note).toBeTruthy();
    expect(note.textContent).toMatch(/You will join:\s*bug/i);

    // Changing join tribe updates the main tribe selector
    tribeSelect.value = 'wolf';
    if (typeof tribeSelect.onchange === 'function') {
      tribeSelect.onchange();
    }
    expect(env.elements.tribeSelect.value).toBe('wolf');
  });

  test('feed child dropdown includes all feed special options and mother shortcuts', () => {
    client.selectedCommand = {
      name: 'feed',
      description: 'Feed children',
      options: [
        { name: 'child', required: true, type: 'string' },
        { name: 'amount', required: false, type: 'number' },
        {
          name: 'use_grain',
          required: false,
          type: 'boolean',
          description: 'Use grain if needed',
        },
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

    // use_grain checkbox (default unchecked)
    function findById(root, id) {
      if (root.id === id) return root;
      if (!root.children) return null;
      for (const child of root.children) {
        const found = findById(child, id);
        if (found) return found;
      }
      return null;
    }
    function findByTag(root, tag, pred) {
      if (root.tagName === tag && (!pred || pred(root))) return root;
      if (!root.children) return null;
      for (const child of root.children) {
        const found = findByTag(child, tag, pred);
        if (found) return found;
      }
      return null;
    }

    const useGrainCheckbox = findById(container, 'param_use_grain');
    expect(useGrainCheckbox).toBeTruthy();
    expect(useGrainCheckbox.type).toBe('checkbox');
    expect(useGrainCheckbox.checked).toBe(false);
    const useGrainLabel = findByTag(
      container,
      'LABEL',
      (el) => el.getAttribute('for') === 'param_use_grain'
    );
    expect(useGrainLabel).toBeTruthy();
    expect(useGrainLabel.textContent).toMatch(/grain/i);
  });

  test('feed use_grain checkbox value is collected as boolean parameter', () => {
    client.selectedCommand = {
      name: 'feed',
      description: 'Feed children',
      options: [
        {
          name: 'use_grain',
          required: false,
          type: 'boolean',
          description: 'Use grain if needed',
        },
      ],
    };

    const paramsContainer = createElement('div');
    paramsContainer.id = 'modalCommandParameters';
    client.renderParametersInContainer(paramsContainer);

    function findById(root, id) {
      if (root.id === id) return root;
      if (!root.children) return null;
      for (const child of root.children) {
        const found = findById(child, id);
        if (found) return found;
      }
      return null;
    }

    const checkbox = findById(paramsContainer, 'param_use_grain');
    expect(checkbox).toBeTruthy();
    expect(checkbox.type).toBe('checkbox');
    expect(checkbox.checked).toBe(false);

    checkbox.checked = true;
    let params = client.collectParametersFromContainer(paramsContainer);
    expect(params).toEqual({ use_grain: true });

    checkbox.checked = false;
    params = client.collectParametersFromContainer(paramsContainer);
    expect(params).toEqual({ use_grain: false });
  });
});
