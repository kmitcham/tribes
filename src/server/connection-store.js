const connectedClients = new Map();
const tribeConnections = new Map();

function detachSocketFromTribe(ws) {
  if (!ws.currentTribe || !tribeConnections.has(ws.currentTribe)) {
    return;
  }

  const tribeMembers = tribeConnections.get(ws.currentTribe);
  tribeMembers.delete(ws);
  if (tribeMembers.size === 0) {
    tribeConnections.delete(ws.currentTribe);
  }
}

function detachSocketFromPlayer(ws) {
  if (!ws.currentPlayer || !connectedClients.has(ws.currentPlayer)) {
    return;
  }

  const playerConnections = connectedClients.get(ws.currentPlayer);
  playerConnections.delete(ws);
  if (playerConnections.size === 0) {
    connectedClients.delete(ws.currentPlayer);
  }
}

function trackTribeConnection(ws, tribeName) {
  if (ws.currentTribe && ws.currentTribe !== tribeName) {
    detachSocketFromTribe(ws);
  }

  if (!tribeConnections.has(tribeName)) {
    tribeConnections.set(tribeName, new Set());
  }

  tribeConnections.get(tribeName).add(ws);
  ws.currentTribe = tribeName;
}

function trackPlayerConnection(ws, playerName) {
  if (ws.currentPlayer && ws.currentPlayer !== playerName) {
    detachSocketFromPlayer(ws);
  }

  if (!connectedClients.has(playerName)) {
    connectedClients.set(playerName, new Set());
  }

  connectedClients.get(playerName).add(ws);
  ws.currentPlayer = playerName;
}

function cleanupSocketConnections(ws) {
  detachSocketFromTribe(ws);
  detachSocketFromPlayer(ws);
}

function findPlayerConnections(playerName, samePlayerNameFn) {
  let connections = connectedClients.get(playerName);
  if (!connections) {
    const matchedName = Array.from(connectedClients.keys()).find((existing) =>
      samePlayerNameFn(existing, playerName)
    );
    if (matchedName) {
      connections = connectedClients.get(matchedName);
    }
  }

  return connections;
}

function hasOpenConnectionInTribe(
  playerName,
  tribeName,
  normalizePlayerNameFn,
  samePlayerNameFn,
  openState
) {
  if (!playerName) {
    return false;
  }

  const connections = findPlayerConnections(playerName, samePlayerNameFn);
  if (!connections || connections.size === 0) {
    return false;
  }

  for (const connection of connections) {
    if (
      connection.readyState === openState &&
      normalizePlayerNameFn(connection.currentTribe) ===
        normalizePlayerNameFn(tribeName || 'bug')
    ) {
      return true;
    }
  }

  return false;
}

function getPlayerConnectedTribes(
  playerName,
  normalizePlayerNameFn,
  samePlayerNameFn,
  openState
) {
  if (!playerName) {
    return [];
  }

  const connections = findPlayerConnections(playerName, samePlayerNameFn);
  if (!connections || connections.size === 0) {
    return [];
  }

  const tribes = new Set();
  for (const connection of connections) {
    if (connection.readyState !== openState) {
      continue;
    }
    const tribe = normalizePlayerNameFn(connection.currentTribe || 'bug');
    if (tribe) {
      tribes.add(tribe);
    }
  }

  return Array.from(tribes).sort((a, b) => a.localeCompare(b));
}

function getConnectedClients() {
  return connectedClients;
}

function getTribeConnections() {
  return tribeConnections;
}

module.exports = {
  trackTribeConnection,
  trackPlayerConnection,
  cleanupSocketConnections,
  hasOpenConnectionInTribe,
  getPlayerConnectedTribes,
  getConnectedClients,
  getTribeConnections,
};
