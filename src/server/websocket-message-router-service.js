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

  // Tribe association is non-sensitive UI context. Player→socket binding for
  // private delivery must only happen after successful auth (commands, romance,
  // sessionAuth, register, referee manage/export/import).
  connectionStore.trackTribeConnection(ws, tribe);

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
