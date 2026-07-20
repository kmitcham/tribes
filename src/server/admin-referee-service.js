const pathSafety = require('../../libs/pathSafety.js');

function isReferee(playerName, referees) {
  return playerName && referees.includes(playerName);
}

function broadcastTribeUpdate(connectedClients, tribesRegistry, openState) {
  const tribesList = tribesRegistry.getTribes();
  const updateMsg = JSON.stringify({
    type: 'commandList',
    tribes: tribesList,
  });

  for (const sockets of connectedClients.values()) {
    for (const clientWs of sockets) {
      if (clientWs.readyState === openState) {
        clientWs.send(updateMsg);
      }
    }
  }
}

/**
 * Require real credentials/session via validateUser, then referee membership.
 * Never authorize on a client-claimed name alone.
 * On success, binds ws.playerName to the authenticated identity.
 */
async function requireAuthenticatedReferee(ws, data, deps) {
  const { validateUser, referees, connectionStore } = deps;

  if (typeof validateUser !== 'function') {
    ws.send(
      JSON.stringify({
        type: 'error',
        message: 'Authentication is required for referee actions.',
      })
    );
    return false;
  }

  try {
    if (!(await validateUser(data))) {
      ws.send(
        JSON.stringify({
          type: 'error',
          message: 'Authentication failed',
        })
      );
      return false;
    }
  } catch (error) {
    ws.send(
      JSON.stringify({
        type: 'error',
        message: error.message || 'Authentication failed',
      })
    );
    return false;
  }

  // validateUser rewrites data.playerName to the canonical stored name.
  const authenticatedName = data.playerName;
  if (!isReferee(authenticatedName, referees)) {
    ws.send(
      JSON.stringify({ type: 'error', message: 'You are not a referee.' })
    );
    return false;
  }

  ws.playerName = authenticatedName;
  if (connectionStore && typeof connectionStore.trackPlayerConnection === 'function') {
    connectionStore.trackPlayerConnection(ws, authenticatedName);
  }
  return true;
}

async function handleManageTribe(ws, data, deps) {
  const {
    tribesRegistry,
    connectedClients,
    openState,
    gameStateStore,
  } = deps;

  if (!(await requireAuthenticatedReferee(ws, data, deps))) {
    return;
  }

  if (data.action === 'create') {
    try {
      tribesRegistry.createTribe(data.tribeName);
    } catch (err) {
      ws.send(
        JSON.stringify({
          type: 'error',
          message: err.message || 'Invalid tribe name',
        })
      );
      return;
    }
    broadcastTribeUpdate(connectedClients, tribesRegistry, openState);
    ws.send(
      JSON.stringify({
        type: 'commandResponse',
        success: true,
        command: 'Manage Tribe',
        message: `Created tribe ${data.tribeName}`,
      })
    );
    return;
  }

  if (data.action === 'setVisibility') {
    try {
      tribesRegistry.setTribeHidden(data.tribeName, data.hidden);
    } catch (err) {
      ws.send(
        JSON.stringify({
          type: 'error',
          message: err.message || 'Invalid tribe name',
        })
      );
      return;
    }
    broadcastTribeUpdate(connectedClients, tribesRegistry, openState);
    ws.send(
      JSON.stringify({
        type: 'commandResponse',
        success: true,
        command: 'Manage Tribe',
        message: `${data.hidden ? 'Hidden' : 'Revealed'} tribe ${data.tribeName}`,
      })
    );
    return;
  }

  if (data.action === 'delete') {
    if (data.confirm !== true) {
      ws.send(
        JSON.stringify({
          type: 'error',
          message:
            'Delete requires confirm: true (client must confirm permanent deletion).',
        })
      );
      return;
    }
    const tribeName = data.tribeName;
    try {
      pathSafety.assertSafeTribeName(tribeName);
      const result = tribesRegistry.deleteTribe(tribeName);
      if (
        gameStateStore &&
        typeof gameStateStore.removeGameState === 'function'
      ) {
        gameStateStore.removeGameState(tribeName);
      }
      broadcastTribeUpdate(connectedClients, tribesRegistry, openState);
      ws.send(
        JSON.stringify({
          type: 'commandResponse',
          success: true,
          command: 'Manage Tribe',
          message:
            `Deleted tribe ${tribeName}` +
            (result.deletedDir ? ' (data directory removed)' : ' (registry only)'),
        })
      );
    } catch (err) {
      ws.send(
        JSON.stringify({
          type: 'error',
          message: err.message || 'Failed to delete tribe',
        })
      );
    }
  }
}

async function handleManageUsers(ws, data, deps) {
  const { usersDict, writeUsers, hashPasswordFn } = deps;

  if (!(await requireAuthenticatedReferee(ws, data, deps))) {
    return;
  }

  if (data.action === 'list') {
    const userList = Object.keys(usersDict).map((name) => {
      const user = usersDict[name];
      return {
        name: name,
        email: user && user.email ? user.email : 'N/A',
      };
    });
    ws.send(JSON.stringify({ type: 'manageUsersList', users: userList }));
    return;
  }

  if (data.action === 'delete') {
    if (usersDict[data.targetUser]) {
      delete usersDict[data.targetUser];
      writeUsers();
      ws.send(
        JSON.stringify({
          type: 'commandResponse',
          success: true,
          command: 'Manage Users',
          message: `Deleted user ${data.targetUser}`,
        })
      );
      await handleManageUsers(
        ws,
        {
          action: 'list',
          playerName: data.playerName,
          password: data.password,
          sessionToken: data.sessionToken,
        },
        deps
      );
    }
    return;
  }

  if (data.action === 'resetPassword' && usersDict[data.targetUser]) {
    const newPassword = data.newPassword || '';
    let hash = '';
    if (newPassword !== '') {
      hash = await hashPasswordFn(newPassword);
    }
    usersDict[data.targetUser].password = hash;
    writeUsers();
    ws.send(
      JSON.stringify({
        type: 'commandResponse',
        success: true,
        command: 'Manage Users',
        message: `Reset password for user ${data.targetUser}`,
      })
    );
  }
}

async function handleExportGame(ws, data, deps) {
  const {
    validateUser,
    referees,
    getGameState,
    logWithTimestamp,
    serverVersion,
  } = deps;

  try {
    if (!(await validateUser(data))) {
      ws.send(
        JSON.stringify({
          type: 'exportGameResponse',
          success: false,
          message: 'Authentication failed',
          clientId: data.clientId,
        })
      );
      return;
    }

    if (!isReferee(data.playerName, referees)) {
      ws.send(
        JSON.stringify({
          type: 'exportGameResponse',
          success: false,
          message: 'Access denied: Referee privileges required',
          clientId: data.clientId,
        })
      );
      logWithTimestamp(
        `[SECURITY] Non-referee ${data.playerName} attempted to export game data`
      );
      return;
    }

    const tribeName = data.tribeName || data.tribe;
    if (!tribeName) {
      ws.send(
        JSON.stringify({
          type: 'exportGameResponse',
          success: false,
          message: 'Tribe name is required',
          clientId: data.clientId,
        })
      );
      return;
    }

    if (!pathSafety.isSafeTribeName(tribeName)) {
      ws.send(
        JSON.stringify({
          type: 'exportGameResponse',
          success: false,
          message:
            'Invalid tribe name. Use 1-64 characters: letters, numbers, _ or - only.',
          clientId: data.clientId,
        })
      );
      return;
    }

    const gameState = await getGameState(tribeName);
    if (!gameState) {
      ws.send(
        JSON.stringify({
          type: 'exportGameResponse',
          success: false,
          message: `No game data found for tribe: ${tribeName}`,
          clientId: data.clientId,
        })
      );
      return;
    }

    const exportData = {
      metadata: {
        tribeName: tribeName,
        exportedBy: data.playerName,
        exportedAt: new Date().toISOString(),
        exportVersion: '1.0',
        serverVersion,
      },
      gameData: gameState,
    };

    logWithTimestamp(
      `[REFEREE] ${data.playerName} exported game data for tribe: ${tribeName}`
    );

    ws.send(
      JSON.stringify({
        type: 'exportGameResponse',
        success: true,
        tribeName: tribeName,
        exportData: exportData,
        filename: `${tribeName}-export-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`,
        clientId: data.clientId,
      })
    );
  } catch (error) {
    console.error('Error exporting game data:', error);
    ws.send(
      JSON.stringify({
        type: 'exportGameResponse',
        success: false,
        message: 'Export failed: ' + error.message,
        clientId: data.clientId,
      })
    );
  }
}

async function handleImportGame(ws, data, currentGameState, deps) {
  const {
    validateUser,
    referees,
    logWithTimestamp,
    path,
    fs,
    baseDir,
    writeJson,
    gameStateStore,
    savelib,
    refreshTribeGameData,
    refreshTribeCommandLists,
    getGameState,
  } = deps;

  try {
    if (!(await validateUser(data))) {
      ws.send(
        JSON.stringify({
          type: 'importGameResponse',
          success: false,
          message: 'Authentication failed',
          clientId: data.clientId,
        })
      );
      return;
    }

    if (!isReferee(data.playerName, referees)) {
      ws.send(
        JSON.stringify({
          type: 'importGameResponse',
          success: false,
          message: 'Access denied: Referee privileges required',
          clientId: data.clientId,
        })
      );
      logWithTimestamp(
        `[SECURITY] Non-referee ${data.playerName} attempted to import game data`
      );
      return;
    }

    // Single canonical target: never backup tribe A and write tribe B.
    const tribeField = data.tribeName;
    const tribeContext = data.tribe;
    if (
      tribeField &&
      tribeContext &&
      String(tribeField) !== String(tribeContext)
    ) {
      ws.send(
        JSON.stringify({
          type: 'importGameResponse',
          success: false,
          message:
            `Tribe mismatch: tribeName ('${tribeField}') and tribe ('${tribeContext}') must match. ` +
            'Import aborted to avoid backing up one tribe and overwriting another.',
          clientId: data.clientId,
        })
      );
      return;
    }

    const tribeName = tribeField || tribeContext;
    const importData = data.importData;

    if (!tribeName) {
      ws.send(
        JSON.stringify({
          type: 'importGameResponse',
          success: false,
          message: 'Tribe name is required',
          clientId: data.clientId,
        })
      );
      return;
    }

    if (!pathSafety.isSafeTribeName(tribeName)) {
      ws.send(
        JSON.stringify({
          type: 'importGameResponse',
          success: false,
          message:
            'Invalid tribe name. Use 1-64 characters: letters, numbers, _ or - only.',
          clientId: data.clientId,
        })
      );
      return;
    }

    if (!importData) {
      ws.send(
        JSON.stringify({
          type: 'importGameResponse',
          success: false,
          message: 'Import data is required',
          clientId: data.clientId,
        })
      );
      return;
    }

    let gameDataToImport;
    if (importData.gameData) {
      gameDataToImport = importData.gameData;
      logWithTimestamp(
        `[REFEREE] Importing with metadata - exported by: ${importData.metadata?.exportedBy}, exported at: ${importData.metadata?.exportedAt}`
      );
      const metaTribe = importData.metadata && importData.metadata.tribeName;
      if (metaTribe && String(metaTribe) !== String(tribeName)) {
        logWithTimestamp(
          `[REFEREE] Import note: payload metadata tribe '${metaTribe}' differs from target '${tribeName}' (clone/cross-tribe import)`
        );
      }
    } else if (importData.name || importData.population) {
      gameDataToImport = importData;
      logWithTimestamp('[REFEREE] Importing legacy format game data');
    } else {
      ws.send(
        JSON.stringify({
          type: 'importGameResponse',
          success: false,
          message: 'Invalid import data format',
          clientId: data.clientId,
        })
      );
      return;
    }

    if (
      !gameDataToImport.population ||
      typeof gameDataToImport.population !== 'object'
    ) {
      ws.send(
        JSON.stringify({
          type: 'importGameResponse',
          success: false,
          message: 'Invalid game data: missing or invalid population data',
          clientId: data.clientId,
        })
      );
      return;
    }

    const runLocked =
      gameStateStore && typeof gameStateStore.runExclusive === 'function'
        ? (fn) => gameStateStore.runExclusive(tribeName, fn)
        : (fn) => fn();

    await runLocked(async () => {
      // Always backup the live target tribe, not a router-loaded sibling tribe.
      let liveState = null;
      if (typeof getGameState === 'function') {
        liveState = await getGameState(tribeName);
      } else if (
        currentGameState &&
        (currentGameState.name === tribeName || !currentGameState.name)
      ) {
        liveState = currentGameState;
      } else if (savelib && typeof savelib.loadTribe === 'function') {
        liveState = savelib.loadTribe(tribeName);
      }

      const backupData = {
        metadata: {
          tribeName: tribeName,
          backedUpBy: data.playerName,
          backedUpAt: new Date().toISOString(),
          reason: 'Pre-import backup',
        },
        gameData: liveState,
      };

      const archiveDir = pathSafety.archiveDirForTribe(tribeName, baseDir);
      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
      }

      const backupFilename = `${tribeName}-pre-import-backup-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      const backupPath = path.join(archiveDir, backupFilename);
      writeJson(backupPath, backupData);

      gameDataToImport.name = tribeName;
      gameStateStore.setGameState(tribeName, gameDataToImport);
      savelib.saveTribe(gameDataToImport);

      logWithTimestamp(
        `[REFEREE] ${data.playerName} successfully imported game data for tribe: ${tribeName}`
      );
      logWithTimestamp(`[REFEREE] Backup saved as: ${backupFilename}`);

      ws.send(
        JSON.stringify({
          type: 'importGameResponse',
          success: true,
          tribeName: tribeName,
          message: `Game data imported successfully. Backup saved as: ${backupFilename}`,
          backupFilename: backupFilename,
          clientId: data.clientId,
        })
      );

      await refreshTribeGameData(gameDataToImport, tribeName);
      await refreshTribeCommandLists(gameDataToImport, tribeName);
    });
  } catch (error) {
    console.error('Error importing game data:', error);
    ws.send(
      JSON.stringify({
        type: 'importGameResponse',
        success: false,
        message: 'Import failed: ' + error.message,
        clientId: data.clientId,
      })
    );
  }
}

module.exports = {
  broadcastTribeUpdate,
  handleManageTribe,
  handleManageUsers,
  handleExportGame,
  handleImportGame,
};
