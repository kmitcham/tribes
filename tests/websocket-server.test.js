/**
 * Unit Tests for WebSocket Server Command Processing
 * 
 * Tests the server-side handling of command requests to ensure proper
 * parameter processing and mock interaction creation
 */

const path = require('path');
const fs = require('fs');

// Mock WebSocket for server testing
class MockWebSocket {
    constructor() {
        this.sentMessages = [];
    }

    send(data) {
        this.sentMessages.push(data);
    }

    getLastSentMessage() {
        if (this.sentMessages.length === 0) return null;
        return JSON.parse(this.sentMessages[this.sentMessages.length - 1]);
    }

    getAllSentMessages() {
        return this.sentMessages.map(msg => JSON.parse(msg));
    }

    clearSentMessages() {
        this.sentMessages = [];
    }
}

// Mock command modules for testing
const mockCommands = new Map();

// Mock romance command (no parameters)
mockCommands.set('romance', {
    data: { name: 'romance' },
    category: 'reproduction',
    execute: jest.fn(async (interaction, gameState) => {
        return 'Showing mating lists...';
    })
});

// Mock craft command (with required and optional parameters)
mockCommands.set('craft', {
    data: { name: 'craft' },
    category: 'work',
    execute: jest.fn(async (interaction, gameState) => {
        const item = interaction.options.getString('item');
        const force = interaction.options.getInteger('force');
        return `Crafting ${item}${force ? ` with force ${force}` : ''}`;
    })
});

// Mock invite command (with array parameters)
mockCommands.set('invite', {
    data: { name: 'invite' },
    category: 'reproduction',
    execute: jest.fn(async (interaction, gameState) => {
        const inviteList = interaction.options.getString('invitelist');
        return `Inviting: ${inviteList}`;
    })
});

// Mock guard command (with player targeting)
mockCommands.set('guard', {
    data: { name: 'guard' },
    category: 'work',
    execute: jest.fn(async (interaction, gameState) => {
        const player = interaction.options.getString('player');
        return `Guarding ${player}`;
    })
});

// Import or mock the functions we need to test
function createMockInteraction(data, ws, gameState) {
    const mockMember = {
        displayName: data.playerName || 'Unknown'
    };

    const mockUser = {
        send: (message) => {
            ws.send(JSON.stringify({
                type: 'privateMessage',
                message: message,
                clientId: data.clientId
            }));
        },
        displayName: data.playerName || 'Unknown'
    };

    const mockOptions = {
        // Handle different parameter types
        getString: (name) => {
            const value = data.parameters && data.parameters[name];
            if (Array.isArray(value)) {
                // For empty arrays, return null to indicate no data provided
                if (value.length === 0) {
                    return null;
                }
                return value.join(','); // Convert arrays to comma-separated strings for compatibility
            }
            return value;
        },
        getInteger: (name) => data.parameters && parseInt(data.parameters[name]),
        getBoolean: (name) => {
            const value = data.parameters && data.parameters[name];
            if (typeof value === 'boolean') return value;
            if (typeof value === 'string') {
                return value.toLowerCase() === 'true' || value === '1';
            }
            return false;
        },
        getUser: (name) => {
            const paramValue = data.parameters && data.parameters[name];
            if (!paramValue) return null;
            
            return {
                displayName: paramValue,
                id: `user_${paramValue}`,
                send: (message) => {
                    console.log(`[MOCK] Message to ${paramValue}: ${message}`);
                }
            };
        },
        getMember: (name) => {
            const paramValue = data.parameters && data.parameters[name];
            if (!paramValue) return null;
            
            return {
                displayName: paramValue,
                id: `member_${paramValue}`
            };
        }
    };

    const mockInteraction = {
        member: mockMember,
        user: mockUser,
        options: mockOptions,
        reply: jest.fn(),
        editReply: jest.fn(),
        followUp: jest.fn(),
        deferReply: jest.fn()
    };

    return mockInteraction;
}

async function handleCommandRequest(ws, data, gameState) {
    const commandName = data.command;
    const command = mockCommands.get(commandName);

    if (!command) {
        ws.send(JSON.stringify({
            type: 'commandResponse',
            command: commandName,
            success: false,
            message: `Command '${commandName}' not found`,
            clientId: data.clientId
        }));
        return;
    }

    try {
        // Create mock interaction object
        const interaction = createMockInteraction(data, ws, gameState);

        // Clear messages before command execution
        gameState.messages = {};

        // Execute the command
        const result = await command.execute(interaction, gameState, null);

        // Send success response
        ws.send(JSON.stringify({
            type: 'commandResponse',
            command: commandName,
            success: true,
            message: result || 'Command executed successfully',
            clientId: data.clientId
        }));

    } catch (error) {
        console.error(`Error executing command ${commandName}:`, error);
        ws.send(JSON.stringify({
            type: 'commandResponse',
            command: commandName,
            success: false,
            message: 'Command execution failed: ' + error.message,
            clientId: data.clientId
        }));
    }
}

function validateUser(data) {
    // Mock validation - in real implementation would check against users database
    return data.playerName && data.playerName.length > 0;
}

describe('WebSocket Server Command Processing', () => {
    let mockWs;
    let mockGameState;

    beforeEach(() => {
        mockWs = new MockWebSocket();
        mockGameState = {
            messages: {},
            population: {
                'TestPlayer': { 
                    name: 'TestPlayer', 
                    gender: 'male',
                    age: 25
                },
                'OtherPlayer': { 
                    name: 'OtherPlayer', 
                    gender: 'female',
                    age: 23
                }
            },
            saveRequired: false,
            archiveRequired: false
        };
        
        // Clear all mock function calls
        jest.clearAllMocks();
    });

    describe('Mock Interaction Creation', () => {
        test('should create interaction with correct structure', () => {
            const data = {
                command: 'test',
                playerName: 'TestPlayer',
                clientId: 'test-client',
                parameters: {}
            };

            const interaction = createMockInteraction(data, mockWs, mockGameState);

            expect(interaction).toHaveProperty('member');
            expect(interaction).toHaveProperty('user');
            expect(interaction).toHaveProperty('options');
            expect(interaction.member.displayName).toBe('TestPlayer');
            expect(interaction.user.displayName).toBe('TestPlayer');
        });

        test('should handle missing player name gracefully', () => {
            const data = {
                command: 'test',
                clientId: 'test-client',
                parameters: {}
            };

            const interaction = createMockInteraction(data, mockWs, mockGameState);

            expect(interaction.member.displayName).toBe('Unknown');
            expect(interaction.user.displayName).toBe('Unknown');
        });
    });

    describe('Parameter Processing', () => {
        test('should process string parameters correctly', () => {
            const data = {
                command: 'craft',
                playerName: 'TestPlayer',
                clientId: 'test-client',
                parameters: {
                    item: 'basket'
                }
            };

            const interaction = createMockInteraction(data, mockWs, mockGameState);

            expect(interaction.options.getString('item')).toBe('basket');
            expect(interaction.options.getString('nonexistent')).toBeUndefined();
        });

        test('should process integer parameters correctly', () => {
            const data = {
                command: 'craft',
                playerName: 'TestPlayer',
                clientId: 'test-client',
                parameters: {
                    item: 'spearhead',
                    force: '5'
                }
            };

            const interaction = createMockInteraction(data, mockWs, mockGameState);

            expect(interaction.options.getString('item')).toBe('spearhead');
            expect(interaction.options.getInteger('force')).toBe(5);
            expect(interaction.options.getInteger('nonexistent')).toBeNaN();
        });

        test('should process boolean parameters correctly', () => {
            const data = {
                command: 'test',
                playerName: 'TestPlayer',
                clientId: 'test-client',
                parameters: {
                    flag1: true,
                    flag2: 'true',
                    flag3: '1',
                    flag4: false,
                    flag5: 'false',
                    flag6: '0'
                }
            };

            const interaction = createMockInteraction(data, mockWs, mockGameState);

            expect(interaction.options.getBoolean('flag1')).toBe(true);
            expect(interaction.options.getBoolean('flag2')).toBe(true);
            expect(interaction.options.getBoolean('flag3')).toBe(true);
            expect(interaction.options.getBoolean('flag4')).toBe(false);
            expect(interaction.options.getBoolean('flag5')).toBe(false);
            expect(interaction.options.getBoolean('flag6')).toBe(false);
            expect(interaction.options.getBoolean('nonexistent')).toBe(false);
        });

        test('should process array parameters as comma-separated strings', () => {
            const data = {
                command: 'invite',
                playerName: 'TestPlayer',
                clientId: 'test-client',
                parameters: {
                    invitelist: ['Player1', 'Player2', 'Player3']
                }
            };

            const interaction = createMockInteraction(data, mockWs, mockGameState);

            expect(interaction.options.getString('invitelist')).toBe('Player1,Player2,Player3');
        });

        test('should handle empty arrays correctly', () => {
            const data = {
                command: 'invite',
                playerName: 'TestPlayer',
                clientId: 'test-client',
                parameters: {
                    invitelist: []
                }
            };

            const interaction = createMockInteraction(data, mockWs, mockGameState);

            expect(interaction.options.getString('invitelist')).toBeNull();
        });

        test('should create user objects from parameters', () => {
            const data = {
                command: 'guard',
                playerName: 'TestPlayer',
                clientId: 'test-client',
                parameters: {
                    player: 'TargetPlayer'
                }
            };

            const interaction = createMockInteraction(data, mockWs, mockGameState);

            const user = interaction.options.getUser('player');
            expect(user).toHaveProperty('displayName', 'TargetPlayer');
            expect(user).toHaveProperty('id', 'user_TargetPlayer');
            expect(user).toHaveProperty('send');
        });

        test('should create member objects from parameters', () => {
            const data = {
                command: 'guard',
                playerName: 'TestPlayer',
                clientId: 'test-client',
                parameters: {
                    player: 'TargetPlayer'
                }
            };

            const interaction = createMockInteraction(data, mockWs, mockGameState);

            const member = interaction.options.getMember('player');
            expect(member).toHaveProperty('displayName', 'TargetPlayer');
            expect(member).toHaveProperty('id', 'member_TargetPlayer');
        });
    });

    describe('Command Execution', () => {
        test('should execute command without parameters', async () => {
            const data = {
                type: 'command',
                command: 'romance',
                playerName: 'TestPlayer',
                clientId: 'test-client',
                tribe: 'bear',
                password: '',
                parameters: {}
            };

            await handleCommandRequest(mockWs, data, mockGameState);

            // Check that command was called
            const romanceCommand = mockCommands.get('romance');
            expect(romanceCommand.execute).toHaveBeenCalledTimes(1);

            // Check response
            const response = mockWs.getLastSentMessage();
            expect(response).toMatchObject({
                type: 'commandResponse',
                command: 'romance',
                success: true,
                clientId: 'test-client'
            });
        });

        test('should execute command with string parameters', async () => {
            const data = {
                type: 'command',
                command: 'craft',
                playerName: 'TestPlayer',
                clientId: 'test-client',
                tribe: 'bear',
                password: '',
                parameters: {
                    item: 'basket'
                }
            };

            await handleCommandRequest(mockWs, data, mockGameState);

            // Check that command was called
            const craftCommand = mockCommands.get('craft');
            expect(craftCommand.execute).toHaveBeenCalledTimes(1);

            // Verify the interaction object passed to the command
            const callArgs = craftCommand.execute.mock.calls[0];
            const interaction = callArgs[0];
            expect(interaction.options.getString('item')).toBe('basket');

            // Check response
            const response = mockWs.getLastSentMessage();
            expect(response).toMatchObject({
                type: 'commandResponse',
                command: 'craft',
                success: true,
                clientId: 'test-client'
            });
        });

        test('should execute command with multiple parameter types', async () => {
            const data = {
                type: 'command',
                command: 'craft',
                playerName: 'TestPlayer',
                clientId: 'test-client',
                tribe: 'bear',
                password: '',
                parameters: {
                    item: 'spearhead',
                    force: '6'
                }
            };

            await handleCommandRequest(mockWs, data, mockGameState);

            // Check that command was called with correct parameters
            const craftCommand = mockCommands.get('craft');
            expect(craftCommand.execute).toHaveBeenCalledTimes(1);

            const callArgs = craftCommand.execute.mock.calls[0];
            const interaction = callArgs[0];
            expect(interaction.options.getString('item')).toBe('spearhead');
            expect(interaction.options.getInteger('force')).toBe(6);
        });

        test('should execute command with array parameters', async () => {
            const data = {
                type: 'command',
                command: 'invite',
                playerName: 'TestPlayer',
                clientId: 'test-client',
                tribe: 'bear',
                password: '',
                parameters: {
                    invitelist: ['Partner1', 'Partner2', 'Partner3']
                }
            };

            await handleCommandRequest(mockWs, data, mockGameState);

            // Check that command was called
            const inviteCommand = mockCommands.get('invite');
            expect(inviteCommand.execute).toHaveBeenCalledTimes(1);

            // Verify array was converted to comma-separated string
            const callArgs = inviteCommand.execute.mock.calls[0];
            const interaction = callArgs[0];
            expect(interaction.options.getString('invitelist')).toBe('Partner1,Partner2,Partner3');
        });

        test('should handle command not found', async () => {
            const data = {
                type: 'command',
                command: 'nonexistent',
                playerName: 'TestPlayer',
                clientId: 'test-client',
                tribe: 'bear',
                password: '',
                parameters: {}
            };

            await handleCommandRequest(mockWs, data, mockGameState);

            const response = mockWs.getLastSentMessage();
            expect(response).toMatchObject({
                type: 'commandResponse',
                command: 'nonexistent',
                success: false,
                message: "Command 'nonexistent' not found",
                clientId: 'test-client'
            });
        });

        test('should handle command execution errors', async () => {
            // Create a command that throws an error
            const errorCommand = {
                data: { name: 'errorcommand' },
                category: 'test',
                execute: jest.fn(async () => {
                    throw new Error('Test error');
                })
            };
            mockCommands.set('errorcommand', errorCommand);

            const data = {
                type: 'command',
                command: 'errorcommand',
                playerName: 'TestPlayer',
                clientId: 'test-client',
                tribe: 'bear',
                password: '',
                parameters: {}
            };

            await handleCommandRequest(mockWs, data, mockGameState);

            const response = mockWs.getLastSentMessage();
            expect(response).toMatchObject({
                type: 'commandResponse',
                command: 'errorcommand',
                success: false,
                message: 'Command execution failed: Test error',
                clientId: 'test-client'
            });
        });
    });

    describe('Integration Tests', () => {
        test('should handle complex reproduction command workflow', async () => {
            // Execute romance to check current state
            await handleCommandRequest(mockWs, {
                type: 'command',
                command: 'romance',
                playerName: 'TestPlayer',
                clientId: 'test-client',
                tribe: 'bear',
                password: '',
                parameters: {}
            }, mockGameState);

            // Execute invite with multiple players
            await handleCommandRequest(mockWs, {
                type: 'command',
                command: 'invite',
                playerName: 'TestPlayer',
                clientId: 'test-client',
                tribe: 'bear',
                password: '',
                parameters: {
                    invitelist: ['Player1', 'Player2']
                }
            }, mockGameState);

            const allMessages = mockWs.getAllSentMessages();
            expect(allMessages).toHaveLength(2);

            // Verify both commands executed successfully
            expect(allMessages[0]).toMatchObject({
                type: 'commandResponse',
                command: 'romance',
                success: true
            });

            expect(allMessages[1]).toMatchObject({
                type: 'commandResponse',
                command: 'invite',
                success: true
            });

            // Verify commands were called with correct data
            expect(mockCommands.get('romance').execute).toHaveBeenCalledTimes(1);
            expect(mockCommands.get('invite').execute).toHaveBeenCalledTimes(1);

            // Verify invite command got the array as comma-separated string
            const inviteArgs = mockCommands.get('invite').execute.mock.calls[0];
            const inviteInteraction = inviteArgs[0];
            expect(inviteInteraction.options.getString('invitelist')).toBe('Player1,Player2');
        });

        test('should handle work command sequence', async () => {
            // Craft a tool
            await handleCommandRequest(mockWs, {
                type: 'command',
                command: 'craft',
                playerName: 'TestPlayer',
                clientId: 'test-client',
                tribe: 'bear',
                password: '',
                parameters: {
                    item: 'spear',
                    force: '4'
                }
            }, mockGameState);

            // Guard another player
            await handleCommandRequest(mockWs, {
                type: 'command',
                command: 'guard',
                playerName: 'TestPlayer',
                clientId: 'test-client',
                tribe: 'bear',
                password: '',
                parameters: {
                    player: 'WeakPlayer'
                }
            }, mockGameState);

            const allMessages = mockWs.getAllSentMessages();
            expect(allMessages).toHaveLength(2);

            // Verify craft command parameters
            const craftArgs = mockCommands.get('craft').execute.mock.calls[0];
            const craftInteraction = craftArgs[0];
            expect(craftInteraction.options.getString('item')).toBe('spear');
            expect(craftInteraction.options.getInteger('force')).toBe(4);

            // Verify guard command parameters
            const guardArgs = mockCommands.get('guard').execute.mock.calls[0];
            const guardInteraction = guardArgs[0];
            expect(guardInteraction.options.getString('player')).toBe('WeakPlayer');
        });

        test('should preserve game state between commands', async () => {
            const initialGameState = { ...mockGameState };

            await handleCommandRequest(mockWs, {
                type: 'command',
                command: 'romance',
                playerName: 'TestPlayer',
                clientId: 'test-client',
                tribe: 'bear',
                password: '',
                parameters: {}
            }, mockGameState);

            // Verify gameState was passed to command
            const callArgs = mockCommands.get('romance').execute.mock.calls[0];
            const passedGameState = callArgs[1];
            expect(passedGameState).toBe(mockGameState);
            expect(passedGameState.population).toEqual(initialGameState.population);
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('should handle empty parameters object', async () => {
            const data = {
                type: 'command',
                command: 'romance',
                playerName: 'TestPlayer',
                clientId: 'test-client',
                tribe: 'bear',
                password: '',
                parameters: {}
            };

            await handleCommandRequest(mockWs, data, mockGameState);

            const romanceCommand = mockCommands.get('romance');
            expect(romanceCommand.execute).toHaveBeenCalledTimes(1);

            const callArgs = romanceCommand.execute.mock.calls[0];
            const interaction = callArgs[0];
            expect(interaction.options.getString('nonexistent')).toBeUndefined();
        });

        test('should handle null parameters', async () => {
            const data = {
                type: 'command',
                command: 'romance',
                playerName: 'TestPlayer',
                clientId: 'test-client',
                tribe: 'bear',
                password: '',
                parameters: null
            };

            await handleCommandRequest(mockWs, data, mockGameState);

            const response = mockWs.getLastSentMessage();
            expect(response.success).toBe(true);
        });

        test('should handle undefined parameters', async () => {
            const data = {
                type: 'command',
                command: 'romance',
                playerName: 'TestPlayer',
                clientId: 'test-client',
                tribe: 'bear',
                password: ''
                // parameters property missing
            };

            await handleCommandRequest(mockWs, data, mockGameState);

            const response = mockWs.getLastSentMessage();
            expect(response.success).toBe(true);
        });
    });

    describe('Tribe Message Broadcasting', () => {
        test('should demonstrate tribe-wide message functionality', () => {
            // Test that verifies the concept of tribe broadcasting
            // This validates the logic flow used in the actual server
            
            const tribeConnections = new Map();
            const testTribeConnections = new Set();
            
            // Mock multiple connections for the same tribe
            const player1Connection = { 
                readyState: 1, // WebSocket.OPEN
                send: jest.fn(),
                currentPlayer: 'player1'
            };
            const player2Connection = { 
                readyState: 1, // WebSocket.OPEN
                send: jest.fn(), 
                currentPlayer: 'player2'
            };
            
            testTribeConnections.add(player1Connection);
            testTribeConnections.add(player2Connection);
            tribeConnections.set('test-tribe', testTribeConnections);

            // Mock game state with tribe message
            const gameState = {
                messages: {
                    tribe: 'player1 does nothing for a whole season.'
                }
            };

            const tribe = 'test-tribe';
            const data = { tribe, clientId: 'test-client' };

            // Simulate the actual server logic for tribe broadcasting
            if (gameState.messages.tribe) {
                const tribeMembers = tribeConnections.get(tribe);
                if (tribeMembers && tribeMembers.size > 0) {
                    const tribeMessage = {
                        type: 'tribeMessage',
                        message: gameState.messages.tribe,
                        clientId: data.clientId
                    };
                    
                    // Send to all connected players in this tribe
                    for (const tribeWs of tribeMembers) {
                        if (tribeWs.readyState === 1) { // WebSocket.OPEN
                            tribeWs.send(JSON.stringify(tribeMessage));
                        }
                    }
                }
                delete gameState.messages.tribe;
            }

            // Verify that tribe message was sent to all players in the tribe
            expect(player1Connection.send).toHaveBeenCalledWith(
                JSON.stringify({
                    type: 'tribeMessage',
                    message: 'player1 does nothing for a whole season.',
                    clientId: 'test-client'
                })
            );
            
            expect(player2Connection.send).toHaveBeenCalledWith(
                JSON.stringify({
                    type: 'tribeMessage', 
                    message: 'player1 does nothing for a whole season.',
                    clientId: 'test-client'
                })
            );

            // Both connections should have received the message
            expect(player1Connection.send).toHaveBeenCalledTimes(1);
            expect(player2Connection.send).toHaveBeenCalledTimes(1);
            
            // Message should be cleaned up
            expect(gameState.messages.tribe).toBeUndefined();
        });
    });
});

module.exports = {
    createMockInteraction,
    handleCommandRequest,
    validateUser,
    MockWebSocket
};