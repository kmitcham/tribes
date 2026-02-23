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
const PORT = process.env.PORT || 8000;
const referees = require('./libs/referees.json');

// Timestamped logging function
function logWithTimestamp(message, ...args) {
  const timestamp = new Date().toLocaleString();
  console.log(`[${timestamp}]`, message, ...args);
}

let wss;
let allGames = {};
let usersDict = {};

// Track connected clients and their player names
let connectedClients = new Map(); // Map of playerName -> Set of WebSocket connections
let tribeConnections = new Map(); // Map of tribeName -> Set of WebSocket connections

// Load users data
try {
  usersDict = loadJson('./users.json');
} catch (error) {
  logWithTimestamp('No existing users.json, starting fresh');
  usersDict = {};
}

// Load all commands dynamically from the commands folder
const commands = new Map();

function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  const commandFolders = fs.readdirSync(commandsPath);

  for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs
      .readdirSync(folderPath)
      .filter((file) => file.endsWith('.js'));

    for (const file of commandFiles) {
      const filePath = path.join(folderPath, file);
      try {
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
          const commandName = command.data.name;
          commands.set(commandName, {
            ...command,
            category: folder,
            filepath: filePath,
          });
          logWithTimestamp(`Loaded command: ${commandName} (${folder})`);
        } else {
          logWithTimestamp(
            `[WARNING] The command at ${filePath} is missing "data" or "execute" property.`
          );
        }
      } catch (error) {
        console.error(`Error loading command ${filePath}:`, error);
      }
    }
  }

  console.log(`Loaded ${commands.size} commands total`);
  console.log('Tribes WebSocket Server starting...');
}

// Create mock interaction object for websocket compatibility
function createMockInteraction(data, ws, gameState) {
  const mockMember = {
    displayName: data.playerName || 'Unknown',
  };

  const mockUser = {
    send: (message) => {
      ws.send(
        JSON.stringify({
          type: 'privateMessage',
          message: message,
          clientId: data.clientId,
        })
      );
    },
    displayName: data.playerName || 'Unknown',
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
        },
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
          id: `user_${paramValue}`,
        },
      };
    },
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

      ws.send(
        JSON.stringify({
          type: 'commandResponse',
          command: data.command,
          success: true,
          message: content,
          clientId: data.clientId,
        })
      );
    },
    isRepliable: () => true,
    replied: false,
    channelId: `${gameState.name}_channel`,
    commandName: data.command,
    nickName: data.playerName || 'Unknown',
  };
}

function startServer() {
  try {
    // Create HTTP server for health checks and static file serving
    const httpServer = http.createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'OK',
            timestamp: new Date().toISOString(),
            connections: wss ? wss.clients.size : 0,
            commands: commands.size,
          })
        );
      } else if (req.url === '/' || req.url === '/index.html') {
        // Serve the HTML interface
        fs.readFile(
          path.join(__dirname, 'tribes-interface.html'),
          (err, data) => {
            if (err) {
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('Interface not found');
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(data);
            }
          }
        );
      } else if (
        req.url.endsWith('.png') ||
        req.url.endsWith('.jpg') ||
        req.url.endsWith('.gif') ||
        req.url.endsWith('.jpeg')
      ) {
        // Serve static image files
        const filePath = path.join(__dirname, req.url);
        fs.readFile(filePath, (err, data) => {
          if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Image not found');
          } else {
            const ext = path.extname(req.url).toLowerCase();
            let contentType = 'image/png';
            if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
            else if (ext === '.gif') contentType = 'image/gif';

            res.writeHead(200, { 'Content-Type': contentType });
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
      logWithTimestamp(
        `Tribes server (WebSocket + HTTP) started on port ${PORT}`
      );
      logWithTimestamp(`Local access:`);
      logWithTimestamp(`  Health check: http://localhost:${PORT}/health`);
      logWithTimestamp(`  Game interface: http://localhost:${PORT}/`);
      logWithTimestamp(`Network access:`);
      logWithTimestamp(`  Health check: http://192.168.1.20:${PORT}/health`);
      logWithTimestamp(`  Game interface: http://192.168.1.20:${PORT}/`);
      logWithTimestamp(
        `Share the network URL with others on your local network!`
      );
    });

    wss.on('connection', (ws) => {
      logWithTimestamp('New client connected');

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          logWithTimestamp(
            'Received:',
            data.type,
            data.command || '',
            `from ${data.playerName || 'unknown'}`
          );

          await handleWebSocketMessage(ws, data);
        } catch (error) {
          console.error('Error processing message:', error);
          ws.send(
            JSON.stringify({
              type: 'error',
              message: 'Error processing command: ' + error.message,
              clientId: data.clientId,
            })
          );
        }
      });

      ws.on('close', () => {
        logWithTimestamp('Client disconnected');
        // Remove from tribe connections
        if (ws.currentTribe && tribeConnections.has(ws.currentTribe)) {
          tribeConnections.get(ws.currentTribe).delete(ws);
          if (tribeConnections.get(ws.currentTribe).size === 0) {
            tribeConnections.delete(ws.currentTribe);
          }
        }
        // Remove from player connections
        if (ws.currentPlayer && connectedClients.has(ws.currentPlayer)) {
          connectedClients.get(ws.currentPlayer).delete(ws);
          if (connectedClients.get(ws.currentPlayer).size === 0) {
            connectedClients.delete(ws.currentPlayer);
          }
        }
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

  // Track this client's tribe connection
  if (!tribeConnections.has(tribe)) {
    tribeConnections.set(tribe, new Set());
  }
  tribeConnections.get(tribe).add(ws);
  ws.currentTribe = tribe; // Store tribe on the websocket for cleanup

  // Track this client's player name if provided
  if (data.playerName) {
    if (!connectedClients.has(data.playerName)) {
      connectedClients.set(data.playerName, new Set());
    }
    connectedClients.get(data.playerName).add(ws);
    ws.currentPlayer = data.playerName; // Store player name on websocket for cleanup
  }

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
      ws.send(
        JSON.stringify({
          type: 'error',
          message: 'Unknown request type: ' + data.type,
          clientId: data.clientId,
        })
      );
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
        content: cleanPop,
      };
      break;

    case 'children':
      messageData = {
        type: 'infoRequest',
        label: 'children',
        content: gameState.children,
      };
      break;

    case 'status':
      const statusMessage = util.gameStateMessage(gameState);
      messageData = {
        type: 'infoRequest',
        label: 'status',
        content: statusMessage,
      };
      break;

    case 'settings':
      messageData = {
        type: 'infoRequest',
        label: 'settings',
        content: {
          autoRefresh: gameState.autoRefresh || true,
        },
      };
      break;

    case 'romance':
      const playerName = data.playerName;
      const userData = gameState.population && gameState.population[playerName];
      let romanceLists = {
        inviteList: userData?.inviteList || [],
        consentList: userData?.consentList || [],
        declineList: userData?.declineList || [],
      };
      messageData = {
        type: 'infoRequest',
        label: 'romance',
        content: romanceLists,
      };
      break;

    default:
      messageData = {
        type: 'infoRequest',
        label: 'error',
        content: 'Invalid infoRequest: ' + selection,
      };
  }

  ws.send(JSON.stringify(messageData));
}

async function handleCommandRequest(ws, data, gameState) {
  const commandName = data.command;
  const command = commands.get(commandName);

  if (!command) {
    ws.send(
      JSON.stringify({
        type: 'commandResponse',
        command: commandName,
        success: false,
        message: `Command '${commandName}' not found`,
        clientId: data.clientId,
      })
    );
    return;
  }

  // Validate user if required
  if (!validateUser(data)) {
    ws.send(
      JSON.stringify({
        type: 'commandResponse',
        command: commandName,
        success: false,
        message: 'Invalid user credentials',
        clientId: data.clientId,
      })
    );
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

      // Refresh game data for all tribe members after state changes
      await refreshTribeGameData(gameState, data.tribe || 'bug');
    }

    if (gameState.archiveRequired) {
      savelib.archiveTribe(gameState);
      gameState.archiveRequired = false;
    }
  } catch (error) {
    console.error(`Error executing command ${commandName}:`, error);
    ws.send(
      JSON.stringify({
        type: 'commandResponse',
        command: commandName,
        success: false,
        message: 'Command execution failed: ' + error.message,
        clientId: data.clientId,
      })
    );
  }
}

async function refreshTribeGameData(gameState, tribeName) {
  const tribeMembers = tribeConnections.get(tribeName);
  if (!tribeMembers || tribeMembers.size === 0) {
    return; // No one online to refresh
  }

  logWithTimestamp(
    `Refreshing game data for ${tribeMembers.size} members of ${tribeName} tribe`
  );

  // Prepare data packages
  const populationData = {
    type: 'infoRequest',
    label: 'population',
    content: removeClunkyKeys(gameState.population),
    autoRefresh: true, // Flag to indicate this is an automatic refresh
  };

  const childrenData = {
    type: 'infoRequest',
    label: 'children',
    content: gameState.children,
    autoRefresh: true,
  };

  const statusData = {
    type: 'infoRequest',
    label: 'status',
    content: util.gameStateMessage(gameState),
    autoRefresh: true,
  };

  // Send to all tribe members
  for (const memberWs of tribeMembers) {
    if (memberWs.readyState === 1) {
      // WebSocket.OPEN
      try {
        memberWs.send(JSON.stringify(populationData));
        memberWs.send(JSON.stringify(childrenData));
        memberWs.send(JSON.stringify(statusData));
      } catch (error) {
        console.error('Error sending refresh data to tribe member:', error);
      }
    }
  }
}

async function sendGameMessages(ws, gameState, data) {
  if (!gameState.messages) return;

  const tribe = data.tribe || 'bug';

  // Send tribe-wide messages to ALL players in this tribe
  if (gameState.messages.tribe) {
    const tribeMembers = tribeConnections.get(tribe);
    if (tribeMembers && tribeMembers.size > 0) {
      const tribeMessage = {
        type: 'tribeMessage',
        message: gameState.messages.tribe,
        clientId: data.clientId,
      };

      // Send to all connected players in this tribe
      for (const tribeWs of tribeMembers) {
        if (tribeWs.readyState === 1) {
          // WebSocket.OPEN
          try {
            tribeWs.send(JSON.stringify(tribeMessage));
          } catch (error) {
            console.error('Error sending tribe message:', error);
          }
        }
      }
    }
    delete gameState.messages.tribe;
  }

  // Send private messages
  const playerName = data.playerName;
  if (gameState.messages[playerName]) {
    ws.send(
      JSON.stringify({
        type: 'privateMessage',
        message: gameState.messages[playerName],
        clientId: data.clientId,
      })
    );
    delete gameState.messages[playerName];
  }

  // Send messages to other connected players
  for (const [recipient, message] of Object.entries(gameState.messages)) {
    const recipientConnections = connectedClients.get(recipient);
    if (recipientConnections && recipientConnections.size > 0) {
      // Send to all connections for this player
      for (const recipientWs of recipientConnections) {
        if (recipientWs.readyState === 1) {
          // WebSocket.OPEN
          try {
            recipientWs.send(
              JSON.stringify({
                type: 'privateMessage',
                message: message,
                clientId: data.clientId,
              })
            );
          } catch (error) {
            console.error(`Error sending message to ${recipient}:`, error);
          }
        }
      }
    } else {
      logWithTimestamp(`Message for offline player ${recipient}: ${message}`);
    }
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

  ws.send(
    JSON.stringify({
      type: 'helpContent',
      helpType: helpType,
      content: helpContent,
    })
  );
}
function handleListCommands(ws, data, gameState) {
  const commandList = {};
  const playerName = data.playerName;

  // Check if the current player is chief
  let isChief = false;
  logWithTimestamp(
    `[CHIEF CHECK] Player: "${playerName}", HasGameState: ${!!gameState}, HasPopulation: ${!!(gameState && gameState.population)}`
  );

  if (playerName && gameState && gameState.population) {
    const pop = require('./libs/population.js');
    const player = pop.memberByName(playerName, gameState);
    logWithTimestamp(
      `[CHIEF CHECK] Found player: ${!!player}, Chief status: ${player ? player.chief : 'N/A'}`
    );
    isChief = player && player.chief;

    if (player) {
      logWithTimestamp(
        `[CHIEF CHECK] Player "${playerName}" properties:`,
        Object.keys(player)
      );
    }
  }

  // Check if the current player is a referee
  const isRef = playerName && referees.includes(playerName);
  logWithTimestamp(`[REF CHECK] Player "${playerName}" isRef: ${isRef}`);

  logWithTimestamp(`[CHIEF CHECK] Final isChief status: ${isChief}`);

  // Sort commands alphabetically by name
  const sortedCommands = Array.from(commands.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  let chiefCommandsFiltered = 0;
  let forceOptionsFiltered = 0;
  for (const [name, command] of sortedCommands) {
    // Filter out chief commands if the player is not chief
    if (command.category === 'chief' && !isChief) {
      chiefCommandsFiltered++;
      continue;
    }

    let commandOptions = command.data.options || [];

    // Filter out force options if the player is not a referee
    if (!isRef) {
      const originalLength = commandOptions.length;
      commandOptions = commandOptions.filter(
        (option) => option.name !== 'force'
      );
      if (commandOptions.length < originalLength) {
        forceOptionsFiltered++;
      }
    }

    commandList[name] = {
      name: name,
      description: command.data.description,
      category: command.category,
      options: commandOptions,
    };
  }

  logWithTimestamp(
    `[CHIEF CHECK] Filtered out ${chiefCommandsFiltered} chief commands, sending ${Object.keys(commandList).length} total commands`
  );
  logWithTimestamp(
    `[REF CHECK] Filtered out force options from ${forceOptionsFiltered} commands`
  );

  ws.send(
    JSON.stringify({
      type: 'commandList',
      commands: commandList,
      clientId: data.clientId,
    })
  );
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
    console.error('Failed to register user:', error);
    ws.send(
      JSON.stringify({
        type: 'registration',
        label: 'error',
        content: 'Registration failed: ' + error.message,
      })
    );
  }
}

function handleRomanceRequest(ws, data, gameState) {
  if (validateUser(data)) {
    const romanceUpdate = processRomance(data, gameState);
    ws.send(JSON.stringify(romanceUpdate));
  } else {
    ws.send(
      JSON.stringify({
        type: 'error',
        message: 'Invalid user credentials for romance request',
        clientId: data.clientId,
      })
    );
  }
}

function sendSecrets(ws, data, gameState) {
  const romanceUpdate = processRomance(data, gameState);
  console.log('sending romance secret ' + JSON.stringify(romanceUpdate));
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
        declineList: userData.declineList || [],
      },
    };
  } else {
    return {
      type: 'error',
      label: 'romance',
      content: 'No such user in tribe',
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
    if (
      password &&
      !(await verifyPassword(password, usersDict[name].password))
    ) {
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
      password: password,
    };

    actuallyWriteToDisk('users.json', usersDict);
  }

  return {
    type: 'registration',
    label: 'success',
    content: 'success',
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
  const clunkyKeys = [
    'handle',
    'history',
    'inviteIndex',
    'inviteList',
    'consentList',
    'declineList',
    'father',
  ];

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
