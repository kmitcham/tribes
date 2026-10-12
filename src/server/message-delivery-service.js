'use strict';

function sendGameMessages(ws, gameState, data, deps) {
  const {
    connectedClients,
    tribeConnections,
    pop,
    normalizePlayerName,
    queuePendingMessage,
    logWithTimestamp,
    openState,
  } = deps;

  if (!gameState.messages) {
    return;
  }

  const tribe = data.tribe || 'bug';
  const tribeMessageContent = gameState.messages.tribe;
  if (tribeMessageContent) {
    delete gameState.messages.tribe;
  }

  // Send private messages to request sender first.
  const playerName = data.playerName;
  const playerPopulationKey =
    pop.getPopulationKey && pop.getPopulationKey(playerName, gameState);
  let playerMessageKey = null;
  let playerMessage =
    gameState.messages[playerName] ||
    (playerPopulationKey && gameState.messages[playerPopulationKey]);
  if (gameState.messages[playerName]) {
    playerMessageKey = playerName;
  } else if (playerPopulationKey && gameState.messages[playerPopulationKey]) {
    playerMessageKey = playerPopulationKey;
  } else if (playerName && gameState.messages) {
    // Non-members are not in population; match private keys case-insensitively.
    const lower = String(playerName).toLowerCase();
    for (const key of Object.keys(gameState.messages)) {
      if (key === 'tribe') {
        continue;
      }
      if (String(key).toLowerCase() === lower) {
        playerMessage = gameState.messages[key];
        playerMessageKey = key;
        break;
      }
    }
  }

  if (playerMessage) {
    const timestamp = Date.now();
    const payload = {
      type: 'privateMessage',
      message: playerMessage,
      timestamp,
      clientId: data.clientId,
    };
    // Live to the commanding socket.
    ws.send(JSON.stringify(payload));
    // Also fan out to this player's other open same-tribe connections (multi-device).
    const selfConnections = connectedClients.get(playerName);
    if (selfConnections && selfConnections.size > 0) {
      for (const otherWs of selfConnections) {
        if (otherWs === ws) {
          continue;
        }
        const sameTribe =
          normalizePlayerName(otherWs.currentTribe || 'bug') ===
          normalizePlayerName(tribe || 'bug');
        if (otherWs.readyState === openState && sameTribe) {
          try {
            otherWs.send(JSON.stringify(payload));
          } catch (error) {
            console.error(
              `Error fan-out private message to ${playerName}:`,
              error
            );
          }
        }
      }
    }
    // Always record for catch-up on devices that were offline.
    queuePendingMessage(playerName, tribe, {
      type: 'privateMessage',
      message: playerMessage,
      timestamp,
    });
    if (playerMessageKey) {
      delete gameState.messages[playerMessageKey];
    }
    delete gameState.messages[playerName];
    if (playerPopulationKey) {
      delete gameState.messages[playerPopulationKey];
    }
  }

  // Send messages to other connected players.
  for (const [recipient, message] of Object.entries(gameState.messages)) {
    let recipientConnections = connectedClients.get(recipient);
    if (!recipientConnections || recipientConnections.size === 0) {
      const populationKey =
        pop.getPopulationKey && pop.getPopulationKey(recipient, gameState);
      if (populationKey) {
        recipientConnections = connectedClients.get(populationKey);
      }
    }

    if (!recipientConnections || recipientConnections.size === 0) {
      const member = pop.memberByName(recipient, gameState);
      if (member && member.name !== recipient) {
        recipientConnections = connectedClients.get(member.name);
      }
    }

    const timestamp = Date.now();
    const payload = {
      type: 'privateMessage',
      message: message,
      timestamp,
      clientId: data.clientId,
    };

    let deliveredToAnyConnection = false;
    if (recipientConnections && recipientConnections.size > 0) {
      for (const recipientWs of recipientConnections) {
        const sameTribeConnection =
          normalizePlayerName(recipientWs.currentTribe || 'bug') ===
          normalizePlayerName(tribe || 'bug');

        if (recipientWs.readyState === openState && sameTribeConnection) {
          try {
            recipientWs.send(JSON.stringify(payload));
            deliveredToAnyConnection = true;
          } catch (error) {
            console.error(`Error sending message to ${recipient}:`, error);
          }
        }
      }
    } else {
      logWithTimestamp(`Message for offline player ${recipient}: ${message}`);
    }

    // Always record — even when live-delivered — so other devices can catch up.
    queuePendingMessage(recipient, tribe, {
      type: 'privateMessage',
      message,
      timestamp,
    });

    if (!deliveredToAnyConnection) {
      // Already recorded above; keep log line for visibility.
    }
  }

  // Send tribe-wide messages to all players in this tribe after private messages.
  if (tribeMessageContent) {
    const timestamp = Date.now();
    const tribeMembers = tribeConnections.get(tribe);
    const deliveredPlayers = new Set();
    const tribeMessage = {
      type: 'tribeMessage',
      message: tribeMessageContent,
      timestamp,
      clientId: data.clientId,
    };

    if (tribeMembers && tribeMembers.size > 0) {
      for (const tribeWs of tribeMembers) {
        if (tribeWs.readyState === openState) {
          try {
            tribeWs.send(JSON.stringify(tribeMessage));
            if (tribeWs.currentPlayer) {
              deliveredPlayers.add(
                normalizePlayerName(tribeWs.currentPlayer)
              );
            }
          } catch (error) {
            console.error('Error sending tribe message:', error);
          }
        }
      }
    }

    // Record for every tribe member so offline/other devices catch up by timestamp.
    if (gameState.population) {
      for (const tribePlayer of Object.keys(gameState.population)) {
        queuePendingMessage(tribePlayer, tribe, {
          type: 'tribeMessage',
          message: tribeMessageContent,
          timestamp,
        });
      }
    }
  }

  gameState.messages = {};
}

module.exports = {
  sendGameMessages,
};
