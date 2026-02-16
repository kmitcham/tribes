const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const savelib = require('./libs/save.js');
const util = require('./libs/util.js');
const pop = require('./libs/population.js');
const help = require('./libs/help.js');

const logger = require('./libs/logger.js');
const PORT = process.env.PORT || 8088;

let wss;
let allGames = {};
let usersDict = {};

// Load users data
try {
    usersDict = loadJson('./users.json');
} catch (error) {
    console.log('No existing users.json, starting fresh');
    usersDict = {};
}

// Load all commands dynamically from the commands folder
const commands = new Map();

function loadCommands() {
    const commandsPath = path.join(__dirname, 'commands');
    const commandFolders = fs.readdirSync(commandsPath);

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            try {
                const command = require(filePath);
                if ('data' in command && 'execute' in command) {
                    const commandName = command.data.name;
                    commands.set(commandName, {
                        ...command,
                        category: folder,
                        filepath: filePath
                    });
                    console.log(`Loaded command: ${commandName} (${folder})`);
                } else {
                    console.log(`[WARNING] The command at ${filePath} is missing "data" or "execute" property.`);
                }
            } catch (error) {
                console.error(`Error loading command ${filePath}:`, error);
            }
        }
    }

    console.log(`Loaded ${commands.size} commands total`);
}

// Create mock interaction object for websocket compatibility
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
            
            // Create a mock user object with the parameter value as display name
            return {
                displayName: paramValue,
                id: `user_${paramValue}`,
                send: (message) => {
                    // Mock send function - could log or handle differently if needed
                    console.log(`[MOCK] Message to ${paramValue}: ${message}`);
                }
            };
        },
        getMember: (name) => {
            const paramValue = data.parameters && data.parameters[name];
            if (!paramValue) return null;
            
            // Create a mock member object with the parameter value as display name
            return {
                displayName: paramValue,
                id: `member_${paramValue}`,
                user: {
                    displayName: paramValue,
                    id: `user_${paramValue}`
                }
            };
        }
    };

    return {
        member: mockMember,
        user: mockUser,
        options: mockOptions,
        reply: (response) => {
            let content = response.content || response;
            if (response.embeds && response.embeds.length > 0) {
                content = response.embeds[0].description || content;
            }

            ws.send(JSON.stringify({
                type: 'commandResponse',
                command: data.command,
                success: true,
                message: content,
                clientId: data.clientId
            }));
        },
        isRepliable: () => true,
        replied: false,
        channelId: `${gameState.name}_channel`,
        commandName: data.command,
        nickName: data.playerName || 'Unknown'
    };
}

function startServer() {
    try {
        // Create HTTP server for health checks and static file serving
        const httpServer = http.createServer((req, res) => {
            if (req.url === '/health') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: 'OK',
                    timestamp: new Date().toISOString(),
                    connections: wss ? wss.clients.size : 0,
                    commands: commands.size
                }));
            } else if (req.url === '/' || req.url === '/index.html') {
                // Serve the HTML interface
                fs.readFile(path.join(__dirname, 'tribes-interface.html'), (err, data) => {
                    if (err) {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('Interface not found');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(data);
                    }
                });
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Not found' }));
            }
        });

        // Create WebSocket server on the same port
        wss = new WebSocket.Server({ server: httpServer });

        httpServer.listen(PORT, '0.0.0.0', () => {
            console.log(`Tribes server (WebSocket + HTTP) started on port ${PORT}`);
            console.log(`Local access:`);
            console.log(`  Health check: http://localhost:${PORT}/health`);
            console.log(`  Game interface: http://localhost:${PORT}/`);
            console.log(`Network access:`);
            console.log(`  Health check: http://192.168.1.20:${PORT}/health`);
            console.log(`  Game interface: http://192.168.1.20:${PORT}/`);
            console.log(`Share the network URL with others on your local network!`);
        });

        wss.on('connection', ws => {
            console.log('New client connected');

            ws.on('message', async (message) => {
                try {
                    const data = JSON.parse(message.toString());
                    console.log('Received:', data);

                    await handleWebSocketMessage(ws, data);
                } catch (error) {
                    console.error('Error processing message:', error);
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Error processing command: ' + error.message,
                        clientId: data.clientId
                    }));
                }
            });

            ws.on('close', () => {
                console.log('Client disconnected');
            });
        });

    } catch (error) {
        console.error('Error setting up webserver:', error);
        process.exit(1);
    }
}

async function handleWebSocketMessage(ws, data) {
    let tribe = data.tribe || 'bug';
    let gameState = await getGameState(tribe);

    switch (data.type) {
        case 'infoRequest':
            handleInfoRequest(ws, data, gameState);
            break;

        case 'registerRequest':
            await handleRegisterRequest(ws, data, gameState);
            break;

        case 'command':
            await handleCommandRequest(ws, data, gameState);
            break;

        case 'romanceRequest':
            handleRomanceRequest(ws, data, gameState);
            break;

        case 'listCommands':
            handleListCommands(ws, data, gameState);
            break;

        case 'helpRequest':
            handleHelpRequest(ws, data);
            break;

        default:
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Unknown request type: ' + data.type,
                clientId: data.clientId
            }));
    }
}

async function getGameState(tribeName) {
    if (allGames[tribeName]) {
        return allGames[tribeName];
    }

    let gameState = savelib.loadTribe(tribeName);
    if (!gameState) {
        gameState = savelib.initGame(tribeName);
    }
    
    // Ensure autoRefresh flag exists (for backward compatibility)
    if (typeof gameState.autoRefresh === 'undefined') {
        gameState.autoRefresh = true;
    }
    
    allGames[tribeName] = gameState;
    return gameState;
}

function handleInfoRequest(ws, data, gameState) {
    const selection = data.selection;
    let messageData = null;

    switch (selection) {
        case 'population':
            const cleanPop = removeClunkyKeys(gameState.population);
            messageData = {
                type: 'infoRequest',
                label: 'population',
                content: cleanPop
            };
            break;

        case 'children':
            messageData = {
                type: 'infoRequest',
                label: 'children',
                content: gameState.children
            };
            break;

        case 'status':
            const statusMessage = util.gameStateMessage(gameState);
            messageData = {
                type: 'infoRequest',
                label: 'status',
                content: statusMessage
            };
            break;

        case 'settings':
            messageData = {
                type: 'infoRequest',
                label: 'settings',
                content: {
                    autoRefresh: gameState.autoRefresh || true
                }
            };
            break;

        default:
            messageData = {
                type: 'infoRequest',
                label: 'error',
                content: 'Invalid infoRequest: ' + selection
            };
    }

    ws.send(JSON.stringify(messageData));
}

async function handleCommandRequest(ws, data, gameState) {
    const commandName = data.command;
    const command = commands.get(commandName);

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

    // Validate user if required
    if (!validateUser(data)) {
        ws.send(JSON.stringify({
            type: 'commandResponse',
            command: commandName,
            success: false,
            message: 'Invalid user credentials',
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
        await command.execute(interaction, gameState, null);

        // Send any game messages
        await sendGameMessages(ws, gameState, data);

        // Save game state if needed
        if (gameState.saveRequired) {
            savelib.saveTribe(gameState);
            gameState.saveRequired = false;
        }

        if (gameState.archiveRequired) {
            savelib.archiveTribe(gameState);
            gameState.archiveRequired = false;
        }

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

async function sendGameMessages(ws, gameState, data) {
    if (!gameState.messages) return;

    // Send tribe-wide messages
    if (gameState.messages.tribe) {
        ws.send(JSON.stringify({
            type: 'tribeMessage',
            message: gameState.messages.tribe,
            clientId: data.clientId
        }));
        delete gameState.messages.tribe;
    }

    // Send private messages
    const playerName = data.playerName;
    if (gameState.messages[playerName]) {
        ws.send(JSON.stringify({
            type: 'privateMessage',
            message: gameState.messages[playerName],
            clientId: data.clientId
        }));
        delete gameState.messages[playerName];
    }

    // Send messages to other players (for now, just log them)
    for (const [recipient, message] of Object.entries(gameState.messages)) {
        console.log(`Message for ${recipient}: ${message}`);
        // In a full implementation, you'd send this to the appropriate connected client
    }

    // Clear remaining messages
    gameState.messages = {};
}
function handleHelpRequest(ws, data) {
    const helpType = data.helpType || 'basic';
    let helpContent = '';

    switch (helpType) {
        case 'basic':
            helpContent = help.playerHelpBasic();
            break;
        case 'rounds':
            helpContent = help.playerHelpRounds();
            break;
        case 'conflict':
            helpContent = help.playerHelpConflict();
            break;
        case 'chief':
            helpContent = help.chiefHelp();
            break;
        case 'overview':
            helpContent = `Welcome to the Tribes Game!

Each player takes the role of a member of a Stone Age tribe trying to survive and multiply in the world. Tribe members can be hunters, gatherers, or crafters. They can travel among the veldt, marsh, hills and forest environments. They can try to reproduce, to guard children from dangers, and to keep everyone fed.

The four physical resources in the game are food, grain, baskets, and spearheads. Food and grain are consumed to prevent starvation; grain is harder to obtain, but is not vulnerable to destruction from bad luck. Baskets double the effectiveness of gathering. Spearheads give a substantial bonus to hunting.

Adult tribe members need to consume 4 food or grain each season to avoid starvation. Children, including those not yet born, need to be given 2 food or grain each season until they reach 12 years old. Mothers with two or more children under 2 years old need 6 food or grain each season.

Children are produced when a tribe member invites a tribe member of the opposite gender to mate, the invitee consents, and there is a successful dice roll. A player can invite multiple people until one of them consents. They can receive consent to only one invitation per season. Consenting to a mating does not change how many invitations a player can make that season.

All tribes commands begin with clicking them in the interface or typing them manually. To see a list of commands, with some explanations of what they do, you can check the Commands panel on the left.

Players can use this interface to send commands to the bot and receive messages about actions they can take.`;
            break;
        default:
            helpContent = help.playerHelpBasic();
            break;
    }

    ws.send(JSON.stringify({
        type: 'helpContent',
        helpType: helpType,
        content: helpContent
    }));
}
function handleListCommands(ws, data, gameState) {
    const commandList = {};
    const playerName = data.playerName;
    
    // Check if the current player is chief
    let isChief = false;
    console.log(`[CHIEF CHECK] Player: "${playerName}", HasGameState: ${!!gameState}, HasPopulation: ${!!(gameState && gameState.population)}`);
    
    if (playerName && gameState && gameState.population) {
        const pop = require('./libs/population.js');
        const player = pop.memberByName(playerName, gameState);
        console.log(`[CHIEF CHECK] Found player: ${!!player}, Chief status: ${player ? player.chief : 'N/A'}`);
        isChief = player && player.chief;
        
        if (player) {
            console.log(`[CHIEF CHECK] Player "${playerName}" properties:`, Object.keys(player));
        }
    }

    console.log(`[CHIEF CHECK] Final isChief status: ${isChief}`);

    // Sort commands alphabetically by name
    const sortedCommands = Array.from(commands.entries()).sort(([a], [b]) => a.localeCompare(b));
    
    let chiefCommandsFiltered = 0;
    for (const [name, command] of sortedCommands) {
        // Filter out chief commands if the player is not chief
        if (command.category === 'chief' && !isChief) {
            chiefCommandsFiltered++;
            continue;
        }
        
        commandList[name] = {
            name: name,
            description: command.data.description,
            category: command.category,
            options: command.data.options || []
        };
    }

    console.log(`[CHIEF CHECK] Filtered out ${chiefCommandsFiltered} chief commands, sending ${Object.keys(commandList).length} total commands`);

    ws.send(JSON.stringify({
        type: 'commandList',
        commands: commandList,
        clientId: data.clientId
    }));
}

async function handleRegisterRequest(ws, data, gameState) {
    try {
        const result = await registerUser(data);
        ws.send(JSON.stringify(result));

        // Send any secret/private data after successful registration
        if (result.label === 'success') {
            sendSecrets(ws, data, gameState);
        }
    } catch (error) {
        console.error("Failed to register user:", error);
        ws.send(JSON.stringify({
            type: 'registration',
            label: 'error',
            content: 'Registration failed: ' + error.message
        }));
    }
}

function handleRomanceRequest(ws, data, gameState) {
    if (validateUser(data)) {
        const romanceUpdate = processRomance(data, gameState);
        ws.send(JSON.stringify(romanceUpdate));
    } else {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid user credentials for romance request',
            clientId: data.clientId
        }));
    }
}

function sendSecrets(ws, data, gameState) {
    const romanceUpdate = processRomance(data, gameState);
    console.log("sending romance secret " + JSON.stringify(romanceUpdate));
    ws.send(JSON.stringify(romanceUpdate));
}

function processRomance(data, gameState) {
    const name = data.playerName || data.name;
    const inviteList = data.inviteList;
    const declineList = data.declineList;
    const consentList = data.consentList;

    const userData = gameState.population[name];
    if (userData) {
        if (inviteList && !arrayMatch(inviteList, userData.inviteList)) {
            userData.inviteList = inviteList;
        }
        if (declineList && !arrayMatch(declineList, userData.declineList)) {
            userData.declineList = declineList;
        }
        if (consentList && !arrayMatch(consentList, userData.consentList)) {
            userData.consentList = consentList;
        }

        return {
            type: 'infoRequest',
            label: 'romance',
            content: {
                inviteList: userData.inviteList || [],
                consentList: userData.consentList || [],
                declineList: userData.declineList || []
            }
        };
    } else {
        return {
            type: 'error',
            label: 'romance',
            content: 'No such user in tribe'
        };
    }
}

function validateUser(userData) {
    // For now, simplified validation
    // In production, you'd want proper password checking
    return userData.playerName && userData.playerName.length > 0;
}

async function registerUser(userData) {
    const name = userData.playerName || userData.name;
    const email = userData.email;
    let password = userData.password;

    if (usersDict[name]) {
        // User exists, validate password if provided
        if (password && !await verifyPassword(password, usersDict[name].password)) {
            throw new Error('Invalid password for existing player');
        }
    } else {
        // New user, hash password
        if (password) {
            password = await hashPassword(password);
        }

        usersDict[name] = {
            name: name,
            email: email,
            password: password
        };

        actuallyWriteToDisk('users.json', usersDict);
    }

    return {
        type: 'registration',
        label: 'success',
        content: 'success'
    };
}

async function hashPassword(password) {
    const saltRounds = 3;
    return await bcrypt.hash(password, saltRounds);
}

async function verifyPassword(input, hash) {
    return await bcrypt.compare(input, hash);
}

function removeClunkyKeys(population) {
    const cleanedPop = {};
    const clunkyKeys = ['handle', 'history', 'inviteIndex', 'inviteList', 'consentList', 'declineList', 'father'];

    for (const [name, personData] of Object.entries(population || {})) {
        const cleaned = {};
        for (const [key, value] of Object.entries(personData)) {
            if (clunkyKeys.indexOf(key) === -1) {
                cleaned[key] = value;
            }
        }
        cleanedPop[name] = cleaned;
    }
    return cleanedPop;
}

function arrayMatch(array1, array2) {
    if (!array1 && !array2) return true;
    if (!array1 || !array2) return false;
    return array1.sort().join(',') === array2.sort().join(',');
}

function loadJson(fileName) {
    try {
        const rawdata = fs.readFileSync(fileName);
        if (!rawdata || rawdata.byteLength === 0) {
            return {};
        }
        return JSON.parse(rawdata);
    } catch (err) {
        console.log('Error parsing file ' + fileName + ': ' + err);
        return {};
    }
}

function actuallyWriteToDisk(fileName, jsonData) {
    try {
        const jsonString = JSON.stringify(jsonData, null, 2);
        fs.writeFileSync(fileName, jsonString);
        console.log(fileName + ' saved!');
    } catch (err) {
        console.log('Save failed for ' + fileName + ': ' + err);
    }
}

// Initialize
loadCommands();
startServer();

console.log('Tribes WebSocket Server starting...');
console.log(`Available commands: ${Array.from(commands.keys()).join(', ')}`);