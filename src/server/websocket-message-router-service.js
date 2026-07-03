async function handleWebSocketMessage(ws, data, deps) {
  const {
    getGameState,
    findStoredUserName,
    connectionStore,
    logWithTimestamp,
    handlers,
  } = deps;

  let tribe = data.tribe || 'bug';
  let gameState = await getGameState(tribe);

  if (data.playerName) {
    const canonicalPlayerName = findStoredUserName(data.playerName);
    if (canonicalPlayerName) {
      data.playerName = canonicalPlayerName;
    }
  }

  connectionStore.trackTribeConnection(ws, tribe);

  if (data.playerName) {
    connectionStore.trackPlayerConnection(ws, data.playerName);
  }

  const handler = handlers[data.type];
  if (handler) {
    await handler({ ws, data, gameState });
    return;
  }

  logWithTimestamp(
    '[WARN] Unknown request type',
    data.type,
    `from ${data.playerName || ws.playerName || 'unknown'}`,
    `tribe ${data.tribe || ws.currentTribe || 'unknown'}`,
    `clientId ${data.clientId || 'none'}`
  );

  ws.send(
    JSON.stringify({
      type: 'error',
      message: 'Unknown request type: ' + data.type,
      clientId: data.clientId,
    })
  );
}

module.exports = {
  handleWebSocketMessage,
};
