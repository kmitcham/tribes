async function handleRegisterRequest(ws, data, gameState, deps) {
  const { registerUser, connectedClients, replayPendingMessages, sendSecrets } =
    deps;

  try {
    // Add client IP for session creation
    data.clientIP = ws.clientIP;

    const result = await registerUser(data);

    // If registration/login successful, associate WebSocket with session
    if (result.label === 'success' && result.sessionToken) {
      data.playerName = result.playerName;
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
      replayPendingMessages(
        ws,
        result.playerName,
        ws.currentTribe || data.tribe || 'bug',
        data.clientId
      );
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

async function handleRomanceRequest(ws, data, gameState, deps) {
  const {
    validateUser,
    processRomance,
    savelib,
    gameStateStore,
    connectionStore,
    sendGameMessages,
    refreshTribeGameData,
    reproLib,
  } = deps;
  const tribeName = data.tribe || gameState?.name || 'bug';

  try {
    if (!(await validateUser(data))) {
      ws.send(
        JSON.stringify({
          type: 'error',
          message: 'Invalid user credentials for romance request',
          clientId: data.clientId,
        })
      );
      return;
    }

    if (data.playerName) {
      ws.playerName = data.playerName;
      if (
        connectionStore &&
        typeof connectionStore.trackPlayerConnection === 'function'
      ) {
        connectionStore.trackPlayerConnection(ws, data.playerName);
      }
    }

    const runLocked =
      gameStateStore && typeof gameStateStore.runExclusive === 'function'
        ? (fn) => gameStateStore.runExclusive(tribeName, fn)
        : (fn) => fn();

    await runLocked(async () => {
      let lockedState = gameState;
      if (gameStateStore && typeof gameStateStore.getGameState === 'function' && savelib) {
        lockedState = gameStateStore.getGameState(tribeName, savelib);
      }

      // Match command flow: collect messages from this request only.
      lockedState.messages = {};

      const romanceUpdate = processRomance(data, lockedState);
      lockedState.saveRequired = true;

      // #186: romance modal consent/invite must resolve mating like consent/invite commands.
      if (
        lockedState.reproductionRound &&
        reproLib &&
        typeof reproLib.globalMatingCheck === 'function'
      ) {
        const wasComplete = !!lockedState.matingComplete;
        const matingResult = reproLib.globalMatingCheck(lockedState);
        // Mirror checkmating: private status for the actor (waiting / already done).
        // Completion tribe banners are written inside globalMatingCheck itself.
        if (matingResult && typeof matingResult === 'string') {
          const text = require('../../libs/textprocess.js');
          const actor = data.playerName || (ws && ws.playerName) || '';
          if (actor) {
            text.addMessage(lockedState, actor, matingResult);
          }
        }
        if (!wasComplete && lockedState.matingComplete) {
          lockedState.saveRequired = true;
        }
      }

      if (typeof sendGameMessages === 'function') {
        await sendGameMessages(ws, lockedState, data);
      }

      if (savelib && typeof savelib.saveTribe === 'function') {
        savelib.saveTribe(lockedState);
        lockedState.saveRequired = false;
      }

      // Push population/status so other clients see pregnancy without reload (#186).
      if (typeof refreshTribeGameData === 'function') {
        await refreshTribeGameData(lockedState, tribeName);
      }

      ws.send(JSON.stringify(romanceUpdate));
    });
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

module.exports = {
  handleRegisterRequest,
  handleRomanceRequest,
};
