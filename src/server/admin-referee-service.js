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

function handleManageTribe(ws, data, deps) {
  const { referees, tribesRegistry, connectedClients, openState } = deps;

  if (!isReferee(data.playerName, referees)) {
    ws.send(
      JSON.stringify({ type: 'error', message: 'You are not a referee.' })
    );
    return;
  }

  if (data.action === 'create') {
    tribesRegistry.createTribe(data.tribeName);
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
    tribesRegistry.setTribeHidden(data.tribeName, data.hidden);
    broadcastTribeUpdate(connectedClients, tribesRegistry, openState);
    ws.send(
      JSON.stringify({
        type: 'commandResponse',
        success: true,
        command: 'Manage Tribe',
        message: `${data.hidden ? 'Hidden' : 'Revealed'} tribe ${data.tribeName}`,
      })
    );
  }
}

async function handleManageUsers(ws, data, deps) {
  const { referees, usersDict, writeUsers, hashPasswordFn } = deps;

  if (!isReferee(data.playerName, referees)) {
    ws.send(
      JSON.stringify({ type: 'error', message: 'You are not a referee.' })
    );
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
        { action: 'list', playerName: data.playerName },
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

    const tribeName = data.tribeName || data.tribe;
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

    const backupData = {
      metadata: {
        tribeName: tribeName,
        backedUpBy: data.playerName,
        backedUpAt: new Date().toISOString(),
        reason: 'Pre-import backup',
      },
      gameData: currentGameState,
    };

    const archiveDir = path.join(baseDir, 'archive', tribeName);
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
