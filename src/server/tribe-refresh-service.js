function refreshTribeCommandLists(gameState, tribeName, deps) {
  const { tribeConnections, logWithTimestamp, openState, handleListCommands } =
    deps;

  const tribeMembers = tribeConnections.get(tribeName);
  if (!tribeMembers || tribeMembers.size === 0) {
    return;
  }

  logWithTimestamp(
    `Refreshing command lists for ${tribeMembers.size} members of ${tribeName} tribe`
  );

  for (const memberWs of tribeMembers) {
    if (memberWs.readyState === openState && memberWs.currentPlayer) {
      try {
        const mockData = {
          playerName: memberWs.currentPlayer,
          clientId: memberWs.clientId || 'refresh',
        };

        handleListCommands(memberWs, mockData, gameState);
      } catch (error) {
        console.error(
          `Error refreshing commands for ${memberWs.currentPlayer}:`,
          error
        );
      }
    }
  }
}

function refreshTribeGameData(gameState, tribeName, deps) {
  const {
    tribeConnections,
    logWithTimestamp,
    removeClunkyKeys,
    removeFatherReferences,
    refreshChildGuardians,
    util,
    getPlayerConnectedTribes,
    openState,
  } = deps;

  const tribeMembers = tribeConnections.get(tribeName);
  if (!tribeMembers || tribeMembers.size === 0) {
    return;
  }

  logWithTimestamp(
    `Refreshing game data for ${tribeMembers.size} members of ${tribeName} tribe`
  );

  const populationData = {
    type: 'infoRequest',
    label: 'population',
    content: removeClunkyKeys(gameState.population),
  };

  const childrenData = {
    type: 'infoRequest',
    label: 'children',
    content: removeFatherReferences(
      refreshChildGuardians(gameState.children, gameState.population)
    ),
  };

  const graveyardData = {
    type: 'infoRequest',
    label: 'graveyard',
    content: removeClunkyKeys(gameState.graveyard),
  };

  for (const memberWs of tribeMembers) {
    if (memberWs.readyState === openState) {
      try {
        const statusData = {
          type: 'infoRequest',
          label: 'status',
          content: util.gameStateMessage(gameState),
          gameState: {
            round: gameState.round || 'work',
            workRound: gameState.workRound,
            foodRound: gameState.foodRound,
            reproductionRound: gameState.reproductionRound,
            matingComplete: gameState.matingComplete === true,
            seasonCounter: gameState.seasonCounter,
            currentLocationName: gameState.currentLocationName,
            year: Math.floor(gameState.seasonCounter / 2),
            demand: gameState.demand,
            violence: gameState.violence,
            combatRounds: Number.isFinite(gameState.violenceRounds)
              ? gameState.violenceRounds
              : 0,
            playerTribeCount: memberWs.currentPlayer
              ? getPlayerConnectedTribes(memberWs.currentPlayer).length
              : 0,
            playerTribes: memberWs.currentPlayer
              ? getPlayerConnectedTribes(memberWs.currentPlayer)
              : [],
          },
        };

        memberWs.send(JSON.stringify(populationData));
        memberWs.send(JSON.stringify(childrenData));
        memberWs.send(JSON.stringify(graveyardData));
        memberWs.send(JSON.stringify(statusData));
      } catch (error) {
        console.error('Error sending refresh data to tribe member:', error);
      }
    }
  }
}

module.exports = {
  refreshTribeCommandLists,
  refreshTribeGameData,
};
