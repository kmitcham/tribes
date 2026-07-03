const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

const activeSessions = new Map(); // token -> { playerName, createdAt, lastActivity, ipAddress }
const playerSessions = new Map(); // playerName -> Set of tokens

function generateSessionToken(cryptoLib) {
  return cryptoLib.randomBytes(32).toString('hex');
}

function createSession(playerName, ipAddress, cryptoLib, logFn) {
  const token = generateSessionToken(cryptoLib);
  const session = {
    playerName,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    ipAddress,
  };

  activeSessions.set(token, session);

  if (!playerSessions.has(playerName)) {
    playerSessions.set(playerName, new Set());
  }
  playerSessions.get(playerName).add(token);

  if (typeof logFn === 'function') {
    logFn(`[SESSION] Created session for ${playerName} from ${ipAddress}`);
  }

  return token;
}

function destroySession(token, logFn) {
  const session = activeSessions.get(token);
  if (!session) {
    return;
  }

  const playerName = session.playerName;
  activeSessions.delete(token);

  if (playerSessions.has(playerName)) {
    playerSessions.get(playerName).delete(token);
    if (playerSessions.get(playerName).size === 0) {
      playerSessions.delete(playerName);
    }
  }

  if (typeof logFn === 'function') {
    logFn(`[SESSION] Destroyed session for ${playerName}`);
  }
}

function validateSession(token, logFn) {
  const session = activeSessions.get(token);
  if (!session) {
    return null;
  }

  if (Date.now() - session.lastActivity > SESSION_TIMEOUT) {
    destroySession(token, logFn);
    return null;
  }

  session.lastActivity = Date.now();
  return session;
}

function destroyAllPlayerSessions(playerName, logFn) {
  const playerTokens = playerSessions.get(playerName);
  if (!playerTokens) {
    return;
  }

  for (const token of playerTokens) {
    activeSessions.delete(token);
  }

  playerSessions.delete(playerName);

  if (typeof logFn === 'function') {
    logFn(`[SESSION] Destroyed all sessions for ${playerName}`);
  }
}

function cleanupExpiredSessions(logFn) {
  const now = Date.now();
  const expiredTokens = [];

  for (const [token, session] of activeSessions) {
    if (now - session.lastActivity > SESSION_TIMEOUT) {
      expiredTokens.push(token);
    }
  }

  for (const token of expiredTokens) {
    destroySession(token, logFn);
  }

  if (expiredTokens.length > 0 && typeof logFn === 'function') {
    logFn(`[SESSION] Cleaned up ${expiredTokens.length} expired sessions`);
  }
}

function getActiveSessions() {
  return activeSessions;
}

function getPlayerSessions() {
  return playerSessions;
}

module.exports = {
  SESSION_TIMEOUT,
  generateSessionToken,
  createSession,
  validateSession,
  destroySession,
  destroyAllPlayerSessions,
  cleanupExpiredSessions,
  getActiveSessions,
  getPlayerSessions,
};
