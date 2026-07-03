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
  const { validateUser, processRomance } = deps;

  try {
    if (await validateUser(data)) {
      const romanceUpdate = processRomance(data, gameState);
      gameState.saveRequired = true;
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

module.exports = {
  handleRegisterRequest,
  handleRomanceRequest,
};
