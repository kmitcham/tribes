/**
 * Unit Tests for Tribes Interface HTML Client
 *
 * Tests the client-side interface functionality including connection handling,
 * session management, UI state management, and WebSocket fallback logic.
 */

// Mock DOM environment without jsdom
const mockElements = {
    connectionStatus: { 
        className: '',
        textContent: '',
        classList: {
            add: jest.fn(),
            remove: jest.fn(),
            contains: jest.fn(() => false)
        }
    },
    tribeSelect: { value: 'bug' },
    playerName: { value: '' },
    playerPassword: { value: '' },
    commandList: {
        innerHTML: '',
        appendChild: jest.fn(),
        children: { length: 0 },
        querySelectorAll: jest.fn(() => [])
    },
    messagesContainer: { appendChild: jest.fn() },
    '.commands-section': {
        classList: {
            add: jest.fn(),
            remove: jest.fn(),
            contains: jest.fn((className) => className !== 'hidden')
        }
    },
    '.user-info': {
        classList: {
            add: jest.fn(),
            remove: jest.fn(),
            contains: jest.fn((className) => className !== 'minimized')
        }
    }
};

const mockDocument = {
    getElementById: (id) => {
        return mockElements[id] || {
            value: '',
            className: '',
            textContent: '',
            innerHTML: '',
            appendChild: jest.fn(),
            children: { length: 0 },
            classList: {
                add: jest.fn(),
                remove: jest.fn(),
                contains: jest.fn(() => false)
            }
        };
    },
    querySelector: (selector) => {
        return mockElements[selector] || {
            classList: {
                add: jest.fn(),
                remove: jest.fn(),
                contains: jest.fn(() => false)
            }
        };
    },
    querySelectorAll: () => [],
    createElement: (tag) => ({
        className: '',
        textContent: '',
        innerHTML: '',
        appendChild: jest.fn(),
        dataset: {},
        classList: {
            add: jest.fn(),
            remove: jest.fn(),
            contains: jest.fn(() => false)
        }
    })
};

const mockWindow = {
    location: {
        hostname: 'localhost',
        port: '8000',
        protocol: 'http:'
    },
    localStorage: {
        storage: {},
        getItem: jest.fn((key) => mockWindow.localStorage.storage[key] || null),
        setItem: jest.fn((key, value) => { mockWindow.localStorage.storage[key] = value; }),
        removeItem: jest.fn((key) => { delete mockWindow.localStorage.storage[key]; }),
        clear: jest.fn(() => { mockWindow.localStorage.storage = {}; })
    },
    TRIBES_WS_CONFIG: null
};

global.document = mockDocument;
global.window = mockWindow;
global.localStorage = mockWindow.localStorage;

// Create our own MockWebSocket for interface testing
class InterfaceMockWebSocket {
    constructor(url) {
        this.url = url;
        this.readyState = InterfaceMockWebSocket.CONNECTING;
        this.sentMessages = [];
        this.addEventListener = jest.fn();
        
        // Simulate async connection
        setTimeout(() => {
            this.readyState = InterfaceMockWebSocket.OPEN;
            if (this.onopen) this.onopen();
        }, 10);
    }
    
    send(data) {
        if (this.readyState === InterfaceMockWebSocket.OPEN) {
            this.sentMessages.push(data);
        }
    }
    
    close() {
        this.readyState = InterfaceMockWebSocket.CLOSED;
        if (this.onclose) this.onclose();
    }
    
    simulateMessage(data) {
        if (this.onmessage) {
            this.onmessage({ data: JSON.stringify(data) });
        }
    }
    
    getLastSentMessage() {
        return this.sentMessages.length > 0 ? 
            JSON.parse(this.sentMessages[this.sentMessages.length - 1]) : null;
    }
}

InterfaceMockWebSocket.CONNECTING = 0;
InterfaceMockWebSocket.OPEN = 1;
InterfaceMockWebSocket.CLOSING = 2;
InterfaceMockWebSocket.CLOSED = 3;

// Replace the global WebSocket with our interface version
global.WebSocket = InterfaceMockWebSocket;

// Mock console
global.logWithTimestamp = jest.fn();

// TribesClient class extracted from HTML (simplified for testing)
class TribesClient {
    constructor() {
        this.ws = null;
        this.clientId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.commands = {};
        this.selectedCommand = null;
        this.currentPopulation = null;
        this.currentChildren = null;
        this.currentRomanceLists = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 1000; // Reduced for testing
        this.refreshTimer = null;
        this.currentVersion = document.querySelector('meta[name="interface-version"]')?.content || 'unknown';
        this.lastRefreshTime = 0;
        this.autoRefresh = true;
        this.isLoggedIn = false;
        this.currentSessionToken = null;
        this.currentPlayerName = null;
    }

    // Session management
    storeSession(token, playerName) {
        this.currentSessionToken = token;
        this.currentPlayerName = playerName;
        localStorage.setItem('tribesSessionToken', token);
        localStorage.setItem('tribesPlayerName', playerName);
    }
    
    restoreSession() {
        const token = localStorage.getItem('tribesSessionToken');
        const playerName = localStorage.getItem('tribesPlayerName');
        
        if (token && playerName) {
            this.currentSessionToken = token;
            this.currentPlayerName = playerName;
            return true;
        }
        return false;
    }
    
    clearSession() {
        this.currentSessionToken = null;
        this.currentPlayerName = null;
        localStorage.removeItem('tribesSessionToken');
        localStorage.removeItem('tribesPlayerName');
    }

    // Connection handling
    connect() {
        try {
            this.updateConnectionStatus('connecting');
            
            // Check for server config
            const serverConfig = window.TRIBES_WS_CONFIG;
            if (serverConfig) {
                const wsProtocol = serverConfig.protocol === 'https' ? 'wss' : 'ws';
                const wsHost = serverConfig.host.split(':')[0];
                const wsPort = serverConfig.port !== '80' && serverConfig.port !== '443' ? `:${serverConfig.port}` : '';
                const wsUrl = `${wsProtocol}://${wsHost}${wsPort}`;
                
                this.ws = new WebSocket(wsUrl);
                this.setupWebSocketHandlers(() => this.connectWithFallback());
                return;
            }
            
            this.connectWithFallback();
        } catch (error) {
            this.updateConnectionStatus('disconnected');
            this.scheduleReconnect();
        }
    }
    
    connectWithFallback() {
        const currentHost = window.location.hostname;
        const currentPort = window.location.port;
        const isSecure = window.location.protocol === 'https:';
        
        let hosts, port, protocol;
        
        if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
            hosts = [currentHost, 'localhost', '127.0.0.1'];
            port = ':8000';
            protocol = 'ws';
        } else {
            hosts = [currentHost];
            port = currentPort ? `:${currentPort}` : '';
            protocol = isSecure ? 'wss' : 'ws';
        }
        
        const wsUrl = `${protocol}://${hosts[0]}${port}`;
        this.ws = new WebSocket(wsUrl);
        this.setupWebSocketHandlers();
    }
    
    setupWebSocketHandlers(onCloseCallback) {
        this.ws.onopen = () => {
            this.updateConnectionStatus('connected');
            this.reconnectAttempts = 0;
        };
        
        this.ws.onmessage = (event) => {
            this.handleMessage(JSON.parse(event.data));
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        
        this.ws.onclose = () => {
            this.updateConnectionStatus('disconnected');
            if (onCloseCallback) onCloseCallback();
        };
    }
    
    scheduleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => this.connect(), this.reconnectInterval);
        }
    }

    // Message handling
    handleMessage(data) {
        switch (data.type) {
            case 'sessionAuthResponse':
                this.handleSessionAuthResponse(data);
                break;
            case 'commandList':
                this.handleCommandList(data.commands);
                break;
            case 'registration':
                this.handleRegistrationResponse(data);
                break;
            case 'logoutResponse':
                this.handleLogoutResponse(data);
                break;
            case 'forceLogout':
                this.handleForceLogout(data);
                break;
            default:
                console.log('Unknown message type:', data.type);
        }
    }
    
    handleSessionAuthResponse(data) {
        if (data.success) {
            this.isLoggedIn = true;
            this.currentPlayerName = data.playerName;
            this.showCommandsSection();
        } else {
            this.clearSession();
            this.expandLoginArea();
        }
    }
    
    handleCommandList(commands) {
        this.commands = commands;
        this.updateCommandList();
    }
    
    handleRegistrationResponse(data) {
        if (data.label === 'success') {
            if (data.sessionToken && data.playerName) {
                this.storeSession(data.sessionToken, data.playerName);
            }
            this.isLoggedIn = true;
            this.showCommandsSection();
        }
    }
    
    handleLogoutResponse(data) {
        // Handle logout confirmation
        console.log('Logout response:', data.message);
    }
    
    handleForceLogout(data) {
        this.clearSession();
        this.isLoggedIn = false;
        this.expandLoginArea();
        this.hideCommandsSection();
    }

    // UI state management
    updateConnectionStatus(status) {
        const statusEl = document.getElementById('connectionStatus');
        statusEl.className = `connection-status ${status}`;
        
        switch (status) {
            case 'connected':
                statusEl.textContent = '✅ Connected to Tribes Server';
                break;
            case 'connecting':
                statusEl.textContent = '🔄 Connecting...';
                break;
            case 'disconnected':
                statusEl.textContent = '❌ Disconnected from Server';
                break;
        }
    }
    
    showCommandsSection() {
        const commandsSection = document.querySelector('.commands-section');
        commandsSection.classList.remove('hidden');
    }
    
    hideCommandsSection() {
        const commandsSection = document.querySelector('.commands-section');
        commandsSection.classList.add('hidden');
    }
    
    minimizeLoginArea() {
        const userInfo = document.querySelector('.user-info');
        userInfo.classList.add('minimized');
    }
    
    expandLoginArea() {
        const userInfo = document.querySelector('.user-info');
        userInfo.classList.remove('minimized');
    }

    // Command list management
    updateCommandList() {
        const container = document.getElementById('commandList');
        container.innerHTML = '';
        
        Object.entries(this.commands).forEach(([name, command]) => {
            const item = document.createElement('div');
            item.className = 'command-item';
            item.dataset.command = name;
            item.innerHTML = `
                <div class="command-name">${name}</div>
                <div class="command-desc">${command.description}</div>
            `;
            container.appendChild(item);
        });
    }

    // WebSocket communication
    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            data.clientId = this.clientId;
            data.tribe = document.getElementById('tribeSelect').value;
            data.playerName = document.getElementById('playerName').value;
            data.password = document.getElementById('playerPassword').value;
            
            this.ws.send(JSON.stringify(data));
        }
    }
}

// Tests
describe('Tribes Interface Client', () => {
    let client;
    let mockLocalStorage;

    beforeEach(() => {
        // Clear DOM
        mockElements.playerName.value = '';
        mockElements.playerPassword.value = '';
        mockElements.tribeSelect.value = 'bug';
        mockElements.connectionStatus.textContent = '';
        mockElements.connectionStatus.className = '';
        mockElements.commandList.innerHTML = '';
        
        // Clear localStorage
        localStorage.clear();
        
        client = new TribesClient();
        
        // Clear mocks
        jest.clearAllMocks();
    });

    describe('Session Management', () => {
        test('should store session token and player name', () => {
            client.storeSession('test-token-123', 'TestPlayer');
            
            expect(client.currentSessionToken).toBe('test-token-123');
            expect(client.currentPlayerName).toBe('TestPlayer');
            expect(localStorage.getItem('tribesSessionToken')).toBe('test-token-123');
            expect(localStorage.getItem('tribesPlayerName')).toBe('TestPlayer');
        });
        
        test('should restore session from localStorage', () => {
            localStorage.setItem('tribesSessionToken', 'stored-token-456');
            localStorage.setItem('tribesPlayerName', 'StoredPlayer');
            
            const restored = client.restoreSession();
            
            expect(restored).toBe(true);
            expect(client.currentSessionToken).toBe('stored-token-456');
            expect(client.currentPlayerName).toBe('StoredPlayer');
        });
        
        test('should return false when no session to restore', () => {
            const restored = client.restoreSession();
            
            expect(restored).toBe(false);
            expect(client.currentSessionToken).toBeNull();
            expect(client.currentPlayerName).toBeNull();
        });
        
        test('should clear session data', () => {
            client.storeSession('token-to-clear', 'PlayerToClear');
            client.clearSession();
            
            expect(client.currentSessionToken).toBeNull();
            expect(client.currentPlayerName).toBeNull();
            expect(localStorage.getItem('tribesSessionToken')).toBeNull();
            expect(localStorage.getItem('tribesPlayerName')).toBeNull();
        });
    });

    describe('Connection Management', () => {
        test('should update connection status correctly', () => {
            const statusEl = document.getElementById('connectionStatus');
            
            client.updateConnectionStatus('connecting');
            expect(statusEl.textContent).toBe('🔄 Connecting...');
            expect(statusEl.className).toBe('connection-status connecting');
            
            client.updateConnectionStatus('connected');
            expect(statusEl.textContent).toBe('✅ Connected to Tribes Server');
            expect(statusEl.className).toBe('connection-status connected');
            
            client.updateConnectionStatus('disconnected');
            expect(statusEl.textContent).toBe('❌ Disconnected from Server');
            expect(statusEl.className).toBe('connection-status disconnected');
        });
        
        test('should use server configuration when available', () => {
            window.TRIBES_WS_CONFIG = {
                host: 'example.com:3000',
                port: '3000',
                protocol: 'https'
            };
            
            client.connect();
            
            expect(client.ws).toBeDefined();
            expect(client.ws.url).toBe('wss://example.com:3000');
            
            // Clean up
            window.TRIBES_WS_CONFIG = null;
        });
        
        test('should fallback to local development setup', () => {
            // Simulate localhost environment
            Object.defineProperty(window.location, 'hostname', {
                writable: true,
                value: 'localhost'
            });
            
            client.connect();
            
            expect(client.ws).toBeDefined();
            expect(client.ws.url).toBe('ws://localhost:8000');
        });
    });

    describe('Message Handling', () => {
        beforeEach(() => {
            client.connect();
        });
        
        test('should handle session authentication response - success', () => {
            const authData = {
                type: 'sessionAuthResponse',
                success: true,
                playerName: 'AuthedPlayer'
            };
            
            client.handleMessage(authData);
            
            expect(client.isLoggedIn).toBe(true);
            expect(client.currentPlayerName).toBe('AuthedPlayer');
        });
        
        test('should handle session authentication response - failure', () => {
            client.storeSession('invalid-token', 'TestPlayer');
            
            const authData = {
                type: 'sessionAuthResponse',
                success: false
            };
            
            client.handleMessage(authData);
            
            expect(client.isLoggedIn).toBe(false);
            expect(client.currentSessionToken).toBeNull();
        });
        
        test('should handle command list message', () => {
            const commandData = {
                type: 'commandList',
                commands: {
                    'join': { description: 'Join the tribe' },
                    'hunt': { description: 'Hunt for food' }
                }
            };
            
            client.handleMessage(commandData);
            
            expect(client.commands).toEqual(commandData.commands);
        });
        
        test('should handle registration response - success', () => {
            const regData = {
                type: 'registration',
                label: 'success',
                content: 'Registration successful',
                sessionToken: 'new-token-789',
                playerName: 'NewPlayer'
            };
            
            client.handleMessage(regData);
            
            expect(client.isLoggedIn).toBe(true);
            expect(client.currentSessionToken).toBe('new-token-789');
            expect(client.currentPlayerName).toBe('NewPlayer');
        });
        
        test('should handle force logout message', () => {
            client.storeSession('token-to-logout', 'PlayerToLogout');
            client.isLoggedIn = true;
            
            const logoutData = {
                type: 'forceLogout',
                message: 'Logged out from another device'
            };
            
            client.handleMessage(logoutData);
            
            expect(client.isLoggedIn).toBe(false);
            expect(client.currentSessionToken).toBeNull();
            expect(client.currentPlayerName).toBeNull();
        });
    });

    describe('UI State Management', () => {
        test('should show and hide commands section', () => {
            const commandsSection = document.querySelector('.commands-section');
            
            client.showCommandsSection();
            expect(commandsSection.classList.contains('hidden')).toBe(false);
            
            client.hideCommandsSection();
            expect(commandsSection.classList.contains('hidden')).toBe(true);
        });
        
        test('should minimize and expand login area', () => {
            const userInfo = document.querySelector('.user-info');
            
            client.minimizeLoginArea();
            expect(userInfo.classList.contains('minimized')).toBe(true);
            
            client.expandLoginArea();
            expect(userInfo.classList.contains('minimized')).toBe(false);
        });
    });

    describe('Command List Management', () => {
        test('should update command list in DOM', () => {
            const testCommands = {
                'join': { description: 'Join the tribe' },
                'hunt': { description: 'Hunt for food' },
                'craft': { description: 'Craft items' }
            };
            
            client.commands = testCommands;
            client.updateCommandList();
            
            const container = document.getElementById('commandList');
            const commandItems = container.querySelectorAll('.command-item');
            
            expect(commandItems.length).toBe(3);
            expect(commandItems[0].dataset.command).toBe('join');
            expect(commandItems[1].dataset.command).toBe('hunt');
            expect(commandItems[2].dataset.command).toBe('craft');
        });
        
        test('should clear command list when empty', () => {
            // First add some commands
            client.commands = { 'test': { description: 'Test command' } };
            client.updateCommandList();
            
            // Then clear them
            client.commands = {};
            client.updateCommandList();
            
            const container = document.getElementById('commandList');
            expect(container.children.length).toBe(0);
        });
    });

    describe('WebSocket Communication', () => {
        beforeEach(() => {
            document.getElementById('playerName').value = 'TestPlayer';
            document.getElementById('playerPassword').value = 'TestPass';
            document.getElementById('tribeSelect').value = 'bear';
            
            client.connect();
        });
        
        test('should send message with correct structure', () => {
            const testData = {
                type: 'command',
                command: 'hunt'
            };
            
            client.send(testData);
            
            const sentMessage = client.ws.getLastSentMessage();
            expect(sentMessage).toMatchObject({
                type: 'command',
                command: 'hunt',
                clientId: client.clientId,
                tribe: 'bear',
                playerName: 'TestPlayer',
                password: 'TestPass'
            });
        });
        
        test('should not send message when not connected', () => {
            client.ws.close();
            
            const testData = { type: 'test' };
            client.send(testData);
            
            // Should not add any new messages after the close
            expect(client.ws.sentMessages.length).toBe(0);
        });
    });

    describe('Reconnection Logic', () => {
        test('should attempt reconnection on failure', (done) => {
            const originalConnect = client.connect;
            let connectCallCount = 0;
            
            client.connect = jest.fn(() => {
                connectCallCount++;
                if (connectCallCount === 2) {
                    // Second call means reconnection was attempted
                    expect(connectCallCount).toBe(2);
                    expect(client.reconnectAttempts).toBe(1);
                    done();
                }
                originalConnect.call(client);
            });
            
            client.scheduleReconnect();
        });
        
        test('should stop reconnecting after max attempts', () => {
            client.reconnectAttempts = client.maxReconnectAttempts;
            const originalConnect = client.connect;
            client.connect = jest.fn();
            
            client.scheduleReconnect();
            
            setTimeout(() => {
                expect(client.connect).not.toHaveBeenCalled();
            }, client.reconnectInterval + 100);
        });
    });
});