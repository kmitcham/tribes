const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Global error handlers to prevent container crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
  console.error('Promise:', promise);
  logger ? logger.errorLog.error(`Unhandled rejection: ${reason}`) : null;
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  logger ? logger.errorLog.error(`Uncaught exception: ${error.message}`) : null;
  process.exit(1);
});
const savelib = require('./libs/save.js');
const tribesRegistry = require('./libs/tribesRegistry.js');
const util = require('./libs/util.js');
const pop = require('./libs/population.js');
const help = require('./libs/help.js');
const guardlib = require('./libs/guardCode.js');
const jsonUtils = require('./libs/jsonUtils.js');
const logger = require('./libs/logger.js');
const {
  createMockInteraction: createMockInteractionImpl,
} = require('./src/server/interaction-factory.js');
const gameStateStore = require('./src/server/game-state-store.js');
const connectionStore = require('./src/server/connection-store.js');
const sessionStore = require('./src/server/session-store.js');
const pendingMessageStore = require('./src/server/pending-message-store.js');
const authRateLimitStore = require('./src/server/auth-rate-limit-store.js');
const userAuthService = require('./src/server/user-auth-service.js');
const messageDeliveryService = require('./src/server/message-delivery-service.js');
const adminRefereeService = require('./src/server/admin-referee-service.js');
const requestRateLimiter = require('./src/server/request-rate-limiter.js');
const playerRequestHandlers = require('./src/server/player-request-handlers.js');
const gameDataShapers = require('./src/server/game-data-shapers.js');
const tribeRefreshService = require('./src/server/tribe-refresh-service.js');
const requestFlowService = require('./src/server/request-flow-service.js');
const sessionRequestService = require('./src/server/session-request-service.js');
const commandFlowService = require('./src/server/command-flow-service.js');
const websocketMessageRouterService = require('./src/server/websocket-message-router-service.js');
const PORT = process.env.PORT || 8000;
const referees = require('./libs/referees.json');

function getLastCommitInfo() {
  const lastCommitDate =
    process.env.TRIBES_LAST_COMMIT_DATE ||
    process.env.SOURCE_COMMIT_DATE ||
    null;

  return {
    lastCommitDate,
    lastCommitDateShort: process.env.TRIBES_LAST_COMMIT_DATE_SHORT || null,
    lastCommitHash:
      process.env.TRIBES_LAST_COMMIT_HASH || process.env.SOURCE_COMMIT || null,
  };
}

const LAST_COMMIT_INFO = getLastCommitInfo();

// Timestamped logging function
function logWithTimestamp(message, ...args) {
  const timestamp = new Date().toLocaleString();
  const renderedArgs = args
    .map((arg) => {
      if (typeof arg === 'string') {
        return arg;
      }
      try {
        return JSON.stringify(arg);
      } catch (_err) {
        return String(arg);
      }
    })
    .join(' ');
  const logMessage = `[${timestamp}] ${message}${renderedArgs ? ' ' + renderedArgs : ''}`;
  logger.accessLog.info(logMessage);
}

let wss;
let usersDict = {};

// Track connected clients and their player names
const connectedClients = connectionStore.getConnectedClients(); // Map of playerName -> Set of WebSocket connections
const tribeConnections = connectionStore.getTribeConnections(); // Map of tribeName -> Set of WebSocket connections

// Rate limiting for authentication attempts
const loginAttempts = authRateLimitStore.getLoginAttempts(); // Map of identifier -> { count, lastAttempt, lockoutUntil }

// Session management
const activeSessions = sessionStore.getActiveSessions(); // token -> { playerName, createdAt, lastActivity, ipAddress }
const playerSessions = sessionStore.getPlayerSessions(); // playerName -> Set of tokens
const { SESSION_TIMEOUT } = sessionStore;

// Load users data
try {
  // Ensure tribe-data directory exists
  if (!fs.existsSync('./tribe-data')) {
    fs.mkdirSync('./tribe-data', { recursive: true });
    logWithTimestamp('Created tribe-data directory');
  }

  usersDict = loadJson('./tribe-data/users.json');
} catch (_error) {
  logWithTimestamp('No existing users.json, starting fresh');
  usersDict = {};
}

// Load all commands dynamically from the commands folder
const commands = new Map();

// Session management functions
function generateSessionToken() {
  return sessionStore.generateSessionToken(crypto);
}

function createSession(playerName, ipAddress = 'unknown') {
  return sessionStore.createSession(
    playerName,
    ipAddress,
    crypto,
    logWithTimestamp
  );
}

function validateSession(token) {
  return sessionStore.validateSession(token, logWithTimestamp);
}

function destroySession(token) {
  sessionStore.destroySession(token, logWithTimestamp);
}

function destroyAllPlayerSessions(playerName) {
  sessionStore.destroyAllPlayerSessions(playerName, logWithTimestamp);
}

function cleanupExpiredSessions() {
  sessionStore.cleanupExpiredSessions(logWithTimestamp);
}

function getClientIP(ws, req) {
  return (
    req?.socket?.remoteAddress ||
    req?.headers['x-forwarded-for']?.split(',')[0] ||
    'unknown'
  );
}

function normalizePlayerName(name) {
  if (typeof name !== 'string') return '';
  return name.trim();
}

function findStoredUserName(name) {
  const normalized = normalizePlayerName(name);
  if (!normalized) return null;
  if (usersDict[normalized]) return normalized;

  const lowered = normalized.toLowerCase();
  return (
    Object.keys(usersDict).find(
      (existingName) => existingName.toLowerCase() === lowered
    ) || null
  );
}

function samePlayerName(a, b) {
  return (
    normalizePlayerName(a).toLowerCase() ===
    normalizePlayerName(b).toLowerCase()
  );
}

function hasOpenConnectionInTribe(playerName, tribeName) {
  return connectionStore.hasOpenConnectionInTribe(
    playerName,
    tribeName,
    normalizePlayerName,
    samePlayerName,
    WebSocket.OPEN
  );
}

function getPlayerConnectedTribes(playerName) {
  return connectionStore.getPlayerConnectedTribes(
    playerName,
    normalizePlayerName,
    samePlayerName,
    WebSocket.OPEN
  );
}

function queuePendingMessage(playerName, tribeName, payload) {
  pendingMessageStore.queuePendingMessage(
    playerName,
    tribeName,
    payload,
    normalizePlayerName,
    logWithTimestamp
  );
}

function replayPendingMessages(ws, playerName, tribeName, clientId) {
  pendingMessageStore.replayPendingMessages(
    ws,
    playerName,
    tribeName,
    clientId,
    normalizePlayerName,
    logWithTimestamp,
    WebSocket.OPEN
  );
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

  logWithTimestamp(`Loaded ${commands.size} commands total`);
}

// Create mock interaction object for websocket compatibility
function createMockInteraction(data, ws, gameState) {
  return createMockInteractionImpl(data, ws, gameState, logWithTimestamp);
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
          'utf8', // Read as text to allow modifications
          (err, data) => {
            if (err) {
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('Interface not found');
            } else {
              // Inject WebSocket configuration into the HTML
              const wsConfig = {
                port: PORT,
                protocol:
                  req.headers['x-forwarded-proto'] ||
                  (req.connection.encrypted ? 'https' : 'http'),
                host: req.headers.host || req.headers['x-forwarded-host'],
              };

              // Insert WebSocket config right after the <head> tag
              const configScript = `<script>window.TRIBES_WS_CONFIG = ${JSON.stringify(wsConfig)};</script>`;
              const buildInfoScript = `<script>window.TRIBES_BUILD_INFO = ${JSON.stringify(LAST_COMMIT_INFO)};</script>`;
              const modifiedData = data.replace(
                '<head>',
                '<head>\n    ' + configScript + '\n    ' + buildInfoScript
              );

              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(modifiedData);
            }
          }
        );
      } else if (
        req.url &&
        (req.url.split('?')[0].endsWith('.png') ||
          req.url.split('?')[0].endsWith('.jpg') ||
          req.url.split('?')[0].endsWith('.gif') ||
          req.url.split('?')[0].endsWith('.jpeg'))
      ) {
        // Serve static images from app root / png/ only (no path traversal).
        const pathSafety = require('./libs/pathSafety.js');
        const filePath = pathSafety.resolveSafeImagePath(__dirname, req.url);
        if (!filePath) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Image not found');
        } else {
          fs.readFile(filePath, (err, data) => {
            if (err) {
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('Image not found');
            } else {
              const ext = path.extname(filePath).toLowerCase();
              let contentType = 'image/png';
              if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
              else if (ext === '.gif') contentType = 'image/gif';

              res.writeHead(200, { 'Content-Type': contentType });
              res.end(data);
            }
          });
        }
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

      for (const [_name, addresses] of Object.entries(networkInterfaces)) {
        for (const address of addresses) {
          if (
            address.family === 'IPv4' &&
            !address.internal &&
            (address.address.startsWith('192.168.') ||
              address.address.startsWith('10.') ||
              address.address.startsWith('172.'))
          ) {
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
        logWithTimestamp(
          `Cloud deployment detected - access via your cloud service URL`
        );
      }
    });

    wss.on('connection', (ws, req) => {
      const clientIP = getClientIP(ws, req);
      logWithTimestamp(`New client connected from ${clientIP}`);

      // Handle WebSocket errors to prevent unhandled errors
      ws.on('error', (error) => {
        console.error(`WebSocket error from ${clientIP}:`, error);
        logger.errorLog.error(`WebSocket error from ${clientIP}: ${error.message}`);
      });

      ws.on('message', async (message) => {
        let data;
        try {
          // Store client IP for session management and request-rate limiting.
          if (!ws.clientIP) {
            ws.clientIP = clientIP;
          }

          const rateLimitResult = requestRateLimiter.checkRequestRateLimit(
            ws.clientIP
          );
          if (!rateLimitResult.allowed) {
            logWithTimestamp(
              '[RATE_LIMIT] Dropped websocket message due to request limit',
              `ip=${ws.clientIP}`,
              `retryAfterMs=${rateLimitResult.retryAfterMs}`
            );
            ws.send(
              JSON.stringify({
                type: 'error',
                message: 'Rate limit exceeded. Please slow down.',
                code: 'RATE_LIMITED',
                retryAfterMs: rateLimitResult.retryAfterMs,
              })
            );
            return;
          }

          data = JSON.parse(message.toString());
          logWithTimestamp(
            'Received:',
            data.type,
            data.command || '',
            `from ${data.playerName || ws.playerName || 'unknown'}`,
            `tribe ${data.tribe || 'bug'}`
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

      ws.on('error', (error) => {
        logWithTimestamp('WebSocket error:', error.message);
        // Cleanup connections on error
        connectionStore.cleanupSocketConnections(ws);
      });

      ws.on('close', () => {
        logWithTimestamp(`Client disconnected: ${ws.playerName || 'unknown'}`);
        connectionStore.cleanupSocketConnections(ws);
        // Debounce rate limiter cleanup to prevent OOM on high-churn scenarios
        // Only cleanup every 10 disconnects to reduce frequency
        if (Math.random() < 0.1) {
          requestRateLimiter.cleanupRateLimitWindows();
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
  await websocketMessageRouterService.handleWebSocketMessage(ws, data, {
    getGameState,
    findStoredUserName,
    connectionStore,
    logWithTimestamp,
    handlers: WEBSOCKET_MESSAGE_HANDLERS,
  });
}

const WEBSOCKET_MESSAGE_HANDLERS = {
  authenticateSession: async ({ ws, data }) =>
    handleSessionAuthentication(ws, data),
  manageTribe: async ({ ws, data }) => handleManageTribe(ws, data),
  manageUsers: async ({ ws, data }) => handleManageUsers(ws, data),
  logout: async ({ ws, data }) => handleLogout(ws, data),
  infoRequest: async ({ ws, data, gameState }) =>
    handleInfoRequest(ws, data, gameState),
  registerRequest: async ({ ws, data, gameState }) =>
    handleRegisterRequest(ws, data, gameState),
  command: async ({ ws, data, gameState }) =>
    handleCommandRequest(ws, data, gameState),
  romanceRequest: async ({ ws, data, gameState }) =>
    handleRomanceRequest(ws, data, gameState),
  listCommands: async ({ ws, data, gameState }) =>
    handleListCommands(ws, data, gameState),
  helpRequest: async ({ ws, data }) => handleHelpRequest(ws, data),
  exportGame: async ({ ws, data }) => handleExportGame(ws, data),
  importGame: async ({ ws, data, gameState }) =>
    handleImportGame(ws, data, gameState),
};

async function getGameState(tribeName) {
  return gameStateStore.getGameState(tribeName, savelib);
}

function handleSessionAuthentication(ws, data) {
  sessionRequestService.handleSessionAuthentication(ws, data, {
    validateSession,
    trackPlayerConnection: connectionStore.trackPlayerConnection,
    logWithTimestamp,
    replayPendingMessages,
  });
}

function handleLogout(ws, data) {
  sessionRequestService.handleLogout(ws, data, {
    destroySession,
    destroyAllPlayerSessions,
    connectedClients,
  });
}

function handleInfoRequest(ws, data, gameState) {
  playerRequestHandlers.handleInfoRequest(ws, data, gameState, {
    util,
    guardlib,
    getPlayerConnectedTribes,
    removeClunkyKeys,
    removeFatherReferences,
    refreshChildGuardians,
  });
}

async function handleCommandRequest(ws, data, gameState) {
  await commandFlowService.handleCommandRequest(ws, data, gameState, {
    commands,
    commandLog: logger.commandLog,
    validateUser,
    prepareGameStateForJoin,
    replayPendingMessages,
    createMockInteraction,
    sendGameMessages,
    savelib,
    refreshTribeGameData,
    refreshTribeCommandLists,
    gameStateStore,
    connectionStore,
  });
}

function prepareGameStateForJoin(commandName, data, gameState) {
  return gameStateStore.prepareGameStateForJoin(
    commandName,
    data,
    gameState,
    savelib,
    logWithTimestamp
  );
}

async function refreshTribeCommandLists(gameState, tribeName) {
  await tribeRefreshService.refreshTribeCommandLists(gameState, tribeName, {
    tribeConnections,
    logWithTimestamp,
    openState: WebSocket.OPEN,
    handleListCommands,
  });
}

async function refreshTribeGameData(gameState, tribeName) {
  await tribeRefreshService.refreshTribeGameData(gameState, tribeName, {
    tribeConnections,
    logWithTimestamp,
    removeClunkyKeys,
    removeFatherReferences,
    refreshChildGuardians,
    util,
    getPlayerConnectedTribes,
    openState: WebSocket.OPEN,
  });
}

async function sendGameMessages(ws, gameState, data) {
  await messageDeliveryService.sendGameMessages(ws, gameState, data, {
    connectedClients,
    tribeConnections,
    pop,
    normalizePlayerName,
    hasOpenConnectionInTribe,
    queuePendingMessage,
    logWithTimestamp,
    openState: WebSocket.OPEN,
  });
}
function handleHelpRequest(ws, data) {
  playerRequestHandlers.handleHelpRequest(ws, data, { help });
}
function handleListCommands(ws, data, gameState) {
  playerRequestHandlers.handleListCommands(ws, data, gameState, {
    commands,
    pop,
    referees,
    tribesRegistry,
  });
}

async function handleRegisterRequest(ws, data, gameState) {
  await requestFlowService.handleRegisterRequest(ws, data, gameState, {
    registerUser,
    connectedClients,
    replayPendingMessages,
    sendSecrets,
  });
}

async function handleRomanceRequest(ws, data, gameState) {
  await requestFlowService.handleRomanceRequest(ws, data, gameState, {
    validateUser,
    processRomance,
    savelib,
    gameStateStore,
    connectionStore,
  });
}

function sendSecrets(ws, data, gameState) {
  playerRequestHandlers.sendSecrets(ws, data, gameState, {
    processRomance,
  });
}

function processRomance(data, gameState) {
  return playerRequestHandlers.processRomance(data, gameState);
}

async function handleExportGame(ws, data) {
  await adminRefereeService.handleExportGame(ws, data, {
    validateUser,
    referees,
    getGameState,
    logWithTimestamp,
    serverVersion: process.env.npm_package_version || 'dev',
  });
}

async function handleImportGame(ws, data, currentGameState) {
  await adminRefereeService.handleImportGame(ws, data, currentGameState, {
    validateUser,
    referees,
    logWithTimestamp,
    path,
    fs,
    baseDir: __dirname,
    writeJson: actuallyWriteToDisk,
    gameStateStore,
    savelib,
    refreshTribeGameData,
    refreshTribeCommandLists,
    getGameState,
  });
}

async function validateUser(userData) {
  return userAuthService.validateUser(userData, {
    normalizePlayerName,
    findStoredUserName,
    validateSession,
    samePlayerName,
    usersDict,
    writeUsers: () => actuallyWriteToDisk('./tribe-data/users.json', usersDict),
    clearFailedAttempts,
    recordFailedAttempt,
    verifyPasswordFn: verifyPassword,
    loginAttempts,
  });
}

async function registerUser(userData) {
  return userAuthService.registerUser(userData, {
    normalizePlayerName,
    findStoredUserName,
    usersDict,
    validatePassword,
    hashPasswordFn: hashPassword,
    verifyPasswordFn: verifyPassword,
    writeUsers: () => actuallyWriteToDisk('./tribe-data/users.json', usersDict),
    createSession,
    fs,
    logWithTimestamp,
  });
}

async function hashPassword(password) {
  return userAuthService.hashPassword(password, bcrypt);
}

async function verifyPassword(input, hash) {
  return userAuthService.verifyPassword(input, hash, bcrypt);
}

function validatePassword(password) {
  return authRateLimitStore.validatePassword(password);
}

function recordFailedAttempt(identifier) {
  authRateLimitStore.recordFailedAttempt(identifier, logWithTimestamp);
}

function clearFailedAttempts(identifier) {
  authRateLimitStore.clearFailedAttempts(identifier);
}

function removeClunkyKeys(population) {
  return gameDataShapers.removeClunkyKeys(population);
}

function removeFatherReferences(children) {
  return gameDataShapers.removeFatherReferences(children);
}

function refreshChildGuardians(children, population) {
  return gameDataShapers.refreshChildGuardians(children, population);
}

function arrayMatch(array1, array2) {
  if (!array1 && !array2) return true;
  if (!array1 || !array2) return false;
  return array1.sort().join(',') === array2.sort().join(',');
}

const loadJson = jsonUtils.loadJson;

function actuallyWriteToDisk(fileName, jsonData) {
  try {
    jsonUtils.writeJson(fileName, jsonData);
    logWithTimestamp(fileName + ' saved!');
  } catch (err) {
    logger.errorLog.error('Save failed for ' + fileName + ': ' + err);
    throw err;
  }
}

// Keep career endgame writes on the live usersDict (not a stale disk load).
try {
  const career = require('./libs/career.js');
  career.configureUsersStore({
    getUsersDict: () => usersDict,
    writeUsers: () =>
      actuallyWriteToDisk('./tribe-data/users.json', usersDict),
  });
} catch (careerErr) {
  logWithTimestamp('Career store not configured: ' + careerErr.message);
}

async function handleManageTribe(ws, data) {
  await adminRefereeService.handleManageTribe(ws, data, {
    validateUser,
    referees,
    tribesRegistry,
    connectedClients,
    openState: WebSocket.OPEN,
    connectionStore,
  });
}

async function handleManageUsers(ws, data) {
  await adminRefereeService.handleManageUsers(ws, data, {
    validateUser,
    referees,
    usersDict,
    writeUsers: () => actuallyWriteToDisk('./tribe-data/users.json', usersDict),
    hashPasswordFn: hashPassword,
    connectionStore,
  });
}

// Initialize only when run directly (not when imported as a module or testing)
const isMainModule = require.main === module;
const isTesting =
  process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
if (isMainModule && !isTesting) {
  loadCommands();
  startServer();
  logWithTimestamp('Tribes WebSocket Server starting...');
  logWithTimestamp(
    `Available commands: ${Array.from(commands.keys()).join(', ')}`
  );
}

// Export functions for testing
module.exports = {
  // Session management
  generateSessionToken,
  createSession,
  validateSession,
  destroySession,
  destroyAllPlayerSessions,
  cleanupExpiredSessions,

  // Authentication helpers
  registerUser,
  validateUser,
  validatePassword,
  recordFailedAttempt,
  clearFailedAttempts,

  // Utility functions
  removeClunkyKeys,
  removeFatherReferences,
  arrayMatch,
  loadJson,

  // Request handlers
  handleInfoRequest,
  handleHelpRequest,
  handleLogout,
  handleSessionAuthentication,
  handleListCommands,
  prepareGameStateForJoin,

  // Core functions
  createMockInteraction,
  loadCommands,
  startServer,
  logWithTimestamp,
  getClientIP,
  sendSecrets,
  processRomance,

  // Expose state for testing
  get activeSessions() {
    return activeSessions;
  },
  get playerSessions() {
    return playerSessions;
  },
  get loginAttempts() {
    return loginAttempts;
  },
  get requestRateLimitWindows() {
    return requestRateLimiter.getRequestWindows();
  },
  get connectedClients() {
    return connectedClients;
  },
  get tribeConnections() {
    return tribeConnections;
  },
  get allGames() {
    return gameStateStore.getAllGames();
  },
  get usersDict() {
    return usersDict;
  },
  get commands() {
    return commands;
  },

  // Constants
  SESSION_TIMEOUT,
};
