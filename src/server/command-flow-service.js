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
  const tribeName = data.tribe || gameState?.name || 'bug';
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

  const runLocked = gameStateStore.runExclusive
    ? (fn) => gameStateStore.runExclusive(tribeName, fn)
    : (fn) => fn();

  await runLocked(async () => {
    // Re-fetch under the lock so we never mutate a replaced/stale object.
    let lockedState =
      typeof gameStateStore.getGameState === 'function'
        ? gameStateStore.getGameState(tribeName, savelib)
        : gameState;

    lockedState = prepareGameStateForJoin(commandName, data, lockedState);

    replayPendingMessages(
      ws,
      data.playerName,
      data.tribe || 'bug',
      data.clientId
    );

    try {
      const interaction = createMockInteraction(data, ws, lockedState);

      lockedState.messages = {};

      await command.execute(interaction, lockedState, null);

      await sendGameMessages(ws, lockedState, data);

      if (lockedState.saveRequired) {
        savelib.saveTribe(lockedState);
        lockedState.saveRequired = false;

        await refreshTribeGameData(lockedState, data.tribe || 'bug');

        if (lockedState.commandsNeedRefresh) {
          await refreshTribeCommandLists(lockedState, data.tribe || 'bug');
          delete lockedState.commandsNeedRefresh;
        }
      }

      if (lockedState.archiveRequired) {
        const archiveTribeName = lockedState.name;
        const gameEnded = lockedState.ended;
        savelib.archiveTribe(lockedState);
        lockedState.archiveRequired = false;
        if (gameEnded) {
          gameStateStore.resetEndedGameAfterArchive(archiveTribeName, savelib);
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
  });
}

module.exports = {
  handleCommandRequest,
};
