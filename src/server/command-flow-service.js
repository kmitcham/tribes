async function handleCommandRequest(ws, data, gameState, deps) {
  const {
    commands,
    commandLog,
    validateUser,
    prepareGameStateForJoin,
    replayPendingMessages,
    createMockInteraction,
    sendGameMessages,
    savelib,
    refreshTribeGameData,
    refreshTribeCommandLists,
    gameStateStore,
  } = deps;

  const commandName = data.command;
  const playerName = data.playerName || ws.playerName || 'unknown';
  const tribeName = data.tribe || 'bug';
  let argsPayload = {};
  try {
    argsPayload = JSON.parse(JSON.stringify(data.parameters || {}));
  } catch (_err) {
    argsPayload = { unserializable: true };
  }

  if (commandLog && typeof commandLog.info === 'function') {
    commandLog.info({
      dateTime: new Date().toISOString(),
      player: playerName,
      tribe: tribeName,
      command: commandName || 'unknown',
      args: argsPayload,
    });
  }

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

  gameState = prepareGameStateForJoin(commandName, data, gameState);

  replayPendingMessages(
    ws,
    data.playerName,
    data.tribe || 'bug',
    data.clientId
  );

  try {
    const interaction = createMockInteraction(data, ws, gameState);

    gameState.messages = {};

    await command.execute(interaction, gameState, null);

    await sendGameMessages(ws, gameState, data);

    if (gameState.saveRequired) {
      savelib.saveTribe(gameState);
      gameState.saveRequired = false;

      await refreshTribeGameData(gameState, data.tribe || 'bug');

      if (gameState.commandsNeedRefresh) {
        await refreshTribeCommandLists(gameState, data.tribe || 'bug');
        delete gameState.commandsNeedRefresh;
      }
    }

    if (gameState.archiveRequired) {
      const tribeName = gameState.name;
      const gameEnded = gameState.ended;
      savelib.archiveTribe(gameState);
      gameState.archiveRequired = false;
      if (gameEnded) {
        gameStateStore.resetEndedGameAfterArchive(tribeName, savelib);
      }
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

module.exports = {
  handleCommandRequest,
};
