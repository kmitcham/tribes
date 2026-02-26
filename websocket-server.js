const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
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
  const logMessage = `[${timestamp}] ${message} ${args.join(' ')}`;
  
  // Log to console
  console.log(`[${timestamp}]`, message, ...args);
  
  // Log to file
  try {
    // Ensure logs directory exists
    const logsDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Create daily log file name
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const logFile = path.join(logsDir, `tribes-${today}.log`);
    
    // Append to log file
    fs.appendFileSync(logFile, logMessage + '\n');
  } catch (error) {
    // If logging to file fails, at least log the error to console
    console.error('[LOG ERROR] Failed to write to log file:', error.message);
  }
}

let wss;
let allGames = {};
let usersDict = {};

// Track connected clients and their player names
let connectedClients = new Map(); // Map of playerName -> Set of WebSocket connections
let tribeConnections = new Map(); // Map of tribeName -> Set of WebSocket connections

// Rate limiting for authentication attempts
let loginAttempts = new Map(); // Map of identifier -> { count, lastAttempt, lockoutUntil }

// Session management
let activeSessions = new Map(); // token -> { playerName, createdAt, lastActivity, ipAddress }
let playerSessions = new Map(); // playerName -> Set of tokens
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_CLEANUP_INTERVAL = 5 * 60 * 1000; // Clean up every 5 minutes

// Load users data
try {
  // Ensure tribe-data directory exists
  if (!fs.existsSync('./tribe-data')) {
    fs.mkdirSync('./tribe-data', { recursive: true });
    logWithTimestamp('Created tribe-data directory');
  }
  
  usersDict = loadJson('./tribe-data/users.json');
} catch (error) {
  logWithTimestamp('No existing users.json, starting fresh');
  usersDict = {};
}

// Load all commands dynamically from the commands folder
const commands = new Map();

// Session management functions
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function createSession(playerName, ipAddress = 'unknown') {
  const token = generateSessionToken();
  const session = {
    playerName,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    ipAddress
  };
  
  activeSessions.set(token, session);
  
  if (!playerSessions.has(playerName)) {
    playerSessions.set(playerName, new Set());
  }
  playerSessions.get(playerName).add(token);
  
  logWithTimestamp(`[SESSION] Created session for ${playerName} from ${ipAddress}`);
  return token;
}

function validateSession(token) {
  const session = activeSessions.get(token);
  if (!session) {
    return null;
  }
  
  // Check if session has expired
  if (Date.now() - session.lastActivity > SESSION_TIMEOUT) {
    destroySession(token);
    return null;
  }
  
  // Update last activity
  session.lastActivity = Date.now();
  return session;
}

function destroySession(token) {
  const session = activeSessions.get(token);
  if (session) {
    const playerName = session.playerName;
    activeSessions.delete(token);
    
    if (playerSessions.has(playerName)) {
      playerSessions.get(playerName).delete(token);
      if (playerSessions.get(playerName).size === 0) {
        playerSessions.delete(playerName);
      }
    }
    
    logWithTimestamp(`[SESSION] Destroyed session for ${playerName}`);
  }
}

function destroyAllPlayerSessions(playerName) {
  const playerTokens = playerSessions.get(playerName);
  if (playerTokens) {
    for (const token of playerTokens) {
      activeSessions.delete(token);
    }
    playerSessions.delete(playerName);
    logWithTimestamp(`[SESSION] Destroyed all sessions for ${playerName}`);
  }
}

function cleanupExpiredSessions() {
  const now = Date.now();
  const expiredTokens = [];
  
  for (const [token, session] of activeSessions) {
    if (now - session.lastActivity > SESSION_TIMEOUT) {
      expiredTokens.push(token);
    }
  }
  
  for (const token of expiredTokens) {
    destroySession(token);
  }
  
  if (expiredTokens.length > 0) {
    logWithTimestamp(`[SESSION] Cleaned up ${expiredTokens.length} expired sessions`);
  }
}

// Start session cleanup timer
setInterval(cleanupExpiredSessions, SESSION_CLEANUP_INTERVAL);

function getClientIP(ws, req) {
  return req?.socket?.remoteAddress || 
         req?.headers['x-forwarded-for']?.split(',')[0] || 
         'unknown';
}

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
      // Add CORS headers for cloud deployments
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }
      
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
        // Serve the HTML interface with WebSocket configuration
        fs.readFile(
          path.join(__dirname, 'tribes-interface.html'),
          'utf8',  // Read as text to allow modifications
          (err, data) => {
            if (err) {
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('Interface not found');
            } else {
              // Inject WebSocket configuration into the HTML
              const wsConfig = {
                port: PORT,
                protocol: req.headers['x-forwarded-proto'] || (req.connection.encrypted ? 'https' : 'http'),
                host: req.headers.host || req.headers['x-forwarded-host']
              };
              
              // Insert WebSocket config right after the <head> tag
              const configScript = `<script>window.TRIBES_WS_CONFIG = ${JSON.stringify(wsConfig)};</script>`;
              const modifiedData = data.replace('<head>', '<head>\n    ' + configScript);
              
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(modifiedData);
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

    // Create WebSocket server on the same port with cloud-friendly options
    wss = new WebSocket.Server({ 
      server: httpServer,
      perMessageDeflate: false, // Disable compression for better compatibility
      maxPayload: 16 * 1024, // 16KB max message size
    });

    httpServer.listen(PORT, '0.0.0.0', () => {
      logWithTimestamp(
        `Tribes server (WebSocket + HTTP) started on port ${PORT}`
      );
      logWithTimestamp(`Local access:`);
      logWithTimestamp(`  Health check: http://localhost:${PORT}/health`);
      logWithTimestamp(`  Game interface: http://localhost:${PORT}/`);
      
      // Only show network access info if we can detect a local IP
      const os = require('os');
      const networkInterfaces = os.networkInterfaces();
      let localIP = null;
      
      for (const [name, addresses] of Object.entries(networkInterfaces)) {
        for (const address of addresses) {
          if (address.family === 'IPv4' && !address.internal && 
              (address.address.startsWith('192.168.') || address.address.startsWith('10.') || address.address.startsWith('172.'))) {
            localIP = address.address;
            break;
          }
        }
        if (localIP) break;
      }
      
      if (localIP) {
        logWithTimestamp(`Network access:`);
        logWithTimestamp(`  Health check: http://${localIP}:${PORT}/health`);
        logWithTimestamp(`  Game interface: http://${localIP}:${PORT}/`);
        logWithTimestamp(
          `Share the network URL with others on your local network!`
        );
      } else {
        logWithTimestamp(`Cloud deployment detected - access via your cloud service URL`);
      }
    });

    wss.on('connection', (ws, req) => {
      const clientIP = getClientIP(ws, req);
      logWithTimestamp(`New client connected from ${clientIP}`);

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          logWithTimestamp(
            'Received:',
            data.type,
            data.command || '',
            `from ${data.playerName || ws.playerName || 'unknown'}`
          );

          // Store client IP for session management
          if (!ws.clientIP) {
            ws.clientIP = clientIP;
          }

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

      ws.on('error', (error) => {
        logWithTimestamp('WebSocket error:', error.message);
        // Cleanup connections on error
        if (ws.currentTribe && tribeConnections.has(ws.currentTribe)) {
          tribeConnections.get(ws.currentTribe).delete(ws);
          if (tribeConnections.get(ws.currentTribe).size === 0) {
            tribeConnections.delete(ws.currentTribe);
          }
        }
        if (ws.currentPlayer && connectedClients.has(ws.currentPlayer)) {
          connectedClients.get(ws.currentPlayer).delete(ws);
          if (connectedClients.get(ws.currentPlayer).size === 0) {
            connectedClients.delete(ws.currentPlayer);
          }
        }
      });

      ws.on('close', () => {
        logWithTimestamp(`Client disconnected: ${ws.playerName || 'unknown'}`);
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
        // Note: We don't destroy sessions on disconnect - they persist for reconnection
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
  logWithTimestamp('got gamestate for', tribe);
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
  logWithTimestamp('added a client record  for', data.playerName);
  logWithTimestamp('data type', data.type);

  switch (data.type) {
    case 'authenticateSession':
      handleSessionAuthentication(ws, data);
      break;
      
    case 'logout':
      handleLogout(ws, data);
      break;
      
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
      logWithTimestamp('default case ', data.playerName);

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

  allGames[tribeName] = gameState;
  return gameState;
}

function handleSessionAuthentication(ws, data) {
  const { token } = data;
  
  if (!token) {
    ws.send(JSON.stringify({
      type: 'sessionAuthResponse',
      success: false,
      message: 'Session token required',
      clientId: data.clientId
    }));
    logWithTimestamp('sent sessionAuthResponse', data.clientId);

    return;
  }
  
  const session = validateSession(token);
  if (!session) {
    ws.send(JSON.stringify({
      type: 'sessionAuthResponse', 
      success: false,
      message: 'Invalid or expired session token',
      clientId: data.clientId
    }));
    return;
  }
  
  // Associate this WebSocket with the session
  ws.sessionToken = token;
  ws.playerName = session.playerName;
  ws.currentPlayer = session.playerName;
  
  // Track this client's player connections
  if (!connectedClients.has(session.playerName)) {
    connectedClients.set(session.playerName, new Set());
  }
  connectedClients.get(session.playerName).add(ws);
  
  logWithTimestamp(`[SESSION] ${session.playerName} authenticated with existing session`);
  
  ws.send(JSON.stringify({
    type: 'sessionAuthResponse',
    success: true,
    playerName: session.playerName,
    message: 'Session authenticated successfully',
    clientId: data.clientId
  }));
}

function handleLogout(ws, data) {
  const { logoutAll = false } = data;
  
  if (ws.sessionToken) {
    if (logoutAll && ws.playerName) {
      // Destroy all sessions for this player
      destroyAllPlayerSessions(ws.playerName);
      
      // Disconnect all WebSockets for this player
      const playerConnections = connectedClients.get(ws.playerName);
      if (playerConnections) {
        for (const connection of playerConnections) {
          if (connection !== ws) {
            connection.send(JSON.stringify({
              type: 'forceLogout',
              message: 'Logged out from another device'
            }));
            connection.close();
          }
        }
      }
    } else {
      // Destroy only this session
      destroySession(ws.sessionToken);
    }
    
    ws.sessionToken = null;
    ws.playerName = null;
    ws.currentPlayer = null;
  }
  
  ws.send(JSON.stringify({
    type: 'logoutResponse',
    success: true,
    message: logoutAll ? 'Logged out from all devices' : 'Logged out successfully',
    clientId: data.clientId
  }));
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
  try {
    if (!(await validateUser(data))) {
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
  } catch (error) {
    ws.send(
      JSON.stringify({
        type: 'commandResponse',
        command: commandName,
        success: false,
        message: error.message,
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
  };

  const childrenData = {
    type: 'infoRequest',
    label: 'children',
    content: gameState.children,
  };

  const statusData = {
    type: 'infoRequest',
    label: 'status',
    content: util.gameStateMessage(gameState),
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
    // Add client IP for session creation
    data.clientIP = ws.clientIP;
    
    const result = await registerUser(data);
    
    // If registration/login successful, associate WebSocket with session
    if (result.label === 'success' && result.sessionToken) {
      ws.sessionToken = result.sessionToken;
      ws.playerName = result.playerName;
      ws.currentPlayer = result.playerName;
      
      // Track this client's player connections
      if (!connectedClients.has(result.playerName)) {
        connectedClients.set(result.playerName, new Set());
      }
      connectedClients.get(result.playerName).add(ws);
    }
    
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

async function handleRomanceRequest(ws, data, gameState) {
  try {
    if (await validateUser(data)) {
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
  } catch (error) {
    ws.send(
      JSON.stringify({
        type: 'error',
        message: error.message,
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

async function validateUser(userData) {
  // Check if user has a valid session token
  if (userData.sessionToken) {
    const session = validateSession(userData.sessionToken);
    if (session && session.playerName === userData.playerName) {
      return true;
    }
    // If session is invalid, fall through to password authentication
  }

  if (!userData.playerName || userData.playerName.length === 0) {
    return false;
  }

  // Check rate limiting
  const identifier = userData.playerName;
  const attemptData = loginAttempts.get(identifier) || { count: 0, lastAttempt: 0, lockoutUntil: 0 };
  
  if (Date.now() < attemptData.lockoutUntil) {
    throw new Error(`Account locked. Try again later.`);
  }

  const user = usersDict[userData.playerName];
  if (!user) {
    return false; // User doesn't exist
  }

  // If user has no password set, they can login without password (legacy compatibility)
  if (!user.password || user.password === '') {
    return true;
  }

  // If user has password set, require password authentication
  if (!userData.password) {
    recordFailedAttempt(identifier);
    return false;
  }

  try {
    const isValid = await verifyPassword(userData.password, user.password);
    if (isValid) {
      clearFailedAttempts(identifier);
      return true;
    } else {
      recordFailedAttempt(identifier);
      return false;
    }
  } catch (error) {
    recordFailedAttempt(identifier);
    return false;
  }
}

async function registerUser(userData) {
  const name = userData.playerName || userData.name;
  const email = userData.email;
  let password = userData.password;
  const clientIP = userData.clientIP || 'unknown';

  if (!name || name.length === 0) {
    throw new Error('Player name is required');
  }

  if (usersDict[name]) {
    // User exists - this is a login attempt
    const user = usersDict[name];
    
    // If existing user has no password, they can login without password (legacy)
    if (!user.password || user.password === '') {
      const token = createSession(name, clientIP);
      return {
        type: 'registration',
        label: 'success',
        content: 'success',
        sessionToken: token,
        playerName: name
      };
    }
    
    // If existing user has password, require authentication
    if (!password) {
      throw new Error('Password required for existing player');
    }
    
    if (!(await verifyPassword(password, user.password))) {
      throw new Error('Invalid password for existing player');
    }
    
    const token = createSession(name, clientIP);
    return {
      type: 'registration',
      label: 'success',
      content: 'success',
      sessionToken: token,
      playerName: name
    };
  } else {
    // New user registration
    if (!password || password.trim() === '') {
      // Allow new users without password for now (legacy compatibility)
      // But log this for security awareness
      logWithTimestamp(`[SECURITY] New user '${name}' registered without password`);
      password = '';
    } else {
      // Validate password strength for new users who choose to set one
      validatePassword(password);
      password = await hashPassword(password);
    }

    usersDict[name] = {
      name: name,
      email: email || `${name}@tribes.local`,
      password: password,
      registeredAt: new Date().toISOString()
    };

    // Ensure tribe-data directory exists before saving
    if (!fs.existsSync('./tribe-data')) {
      fs.mkdirSync('./tribe-data', { recursive: true });
    }

    actuallyWriteToDisk('./tribe-data/users.json', usersDict);
    logWithTimestamp(`[SECURITY] New user registered: ${name}`);
    
    const token = createSession(name, clientIP);
    return {
      type: 'registration',
      label: 'success',
      content: 'success',
      sessionToken: token,
      playerName: name
    };
  }
}

async function hashPassword(password) {
  const saltRounds = 12; // Increased from 3 to 12 for better security
  return await bcrypt.hash(password, saltRounds);
}

async function verifyPassword(input, hash) {
  return await bcrypt.compare(input, hash);
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password is required');
  }
    
  return true;
}

function recordFailedAttempt(identifier) {
  const attemptData = loginAttempts.get(identifier) || { count: 0, lastAttempt: 0, lockoutUntil: 0 };
  attemptData.count++;
  attemptData.lastAttempt = Date.now();
  
  // Lockout after 5 failed attempts for 15 minutes
  if (attemptData.count >= 5) {
    attemptData.lockoutUntil = Date.now() + (15 * 60 * 1000); // 15 minutes
  }
  
  loginAttempts.set(identifier, attemptData);
  logWithTimestamp(`Failed login attempt for ${identifier}. Count: ${attemptData.count}`);
}

function clearFailedAttempts(identifier) {
  loginAttempts.delete(identifier);
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
