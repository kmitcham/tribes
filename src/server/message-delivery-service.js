function sendGameMessages(ws, gameState, data, deps) {
  const {
    connectedClients,
    tribeConnections,
    pop,
    normalizePlayerName,
    hasOpenConnectionInTribe,
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
    ws.send(
      JSON.stringify({
        type: 'privateMessage',
        message: playerMessage,
        clientId: data.clientId,
      })
    );
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

    let deliveredToAnyConnection = false;
    if (recipientConnections && recipientConnections.size > 0) {
      for (const recipientWs of recipientConnections) {
        const sameTribeConnection =
          normalizePlayerName(recipientWs.currentTribe || 'bug') ===
          normalizePlayerName(tribe || 'bug');

        if (recipientWs.readyState === openState && sameTribeConnection) {
          try {
            recipientWs.send(
              JSON.stringify({
                type: 'privateMessage',
                message: message,
                clientId: data.clientId,
              })
            );
            deliveredToAnyConnection = true;
          } catch (error) {
            console.error(`Error sending message to ${recipient}:`, error);
          }
        }
      }
    } else {
      logWithTimestamp(`Message for offline player ${recipient}: ${message}`);
    }

    if (!deliveredToAnyConnection) {
      queuePendingMessage(recipient, tribe, {
        type: 'privateMessage',
        message,
      });
    }
  }

  // Send tribe-wide messages to all players in this tribe after private messages.
  if (tribeMessageContent) {
    const tribeMembers = tribeConnections.get(tribe);
    if (tribeMembers && tribeMembers.size > 0) {
      const tribeMessage = {
        type: 'tribeMessage',
        message: tribeMessageContent,
        clientId: data.clientId,
      };

      for (const tribeWs of tribeMembers) {
        if (tribeWs.readyState === openState) {
          try {
            tribeWs.send(JSON.stringify(tribeMessage));
          } catch (error) {
            console.error('Error sending tribe message:', error);
          }
        }
      }
    }

    // Replay path: if a player is offline for this tribe, queue tribe-wide messages.
    if (gameState.population) {
      for (const tribePlayer of Object.keys(gameState.population)) {
        if (!hasOpenConnectionInTribe(tribePlayer, tribe)) {
          queuePendingMessage(tribePlayer, tribe, {
            type: 'tribeMessage',
            message: tribeMessageContent,
          });
        }
      }
    }
  }

  gameState.messages = {};
}

module.exports = {
  sendGameMessages,
};
