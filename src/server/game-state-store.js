const allGames = {};

async function getGameState(tribeName, savelib) {
  if (allGames[tribeName]) {
    return allGames[tribeName];
  }

  let gameState = savelib.loadTribe(tribeName);
  if (!gameState) {
    gameState = savelib.initGame(tribeName);
  }

  allGames[tribeName] = gameState;
  return gameState;
}

function setGameState(tribeName, gameState) {
  allGames[tribeName] = gameState;
  return gameState;
}

function prepareGameStateForJoin(commandName, data, gameState, savelib, logFn) {
  if (commandName !== 'join' || !gameState || !gameState.ended) {
    return gameState;
  }

  const tribeName = data.tribe || gameState.name || 'bug';
  const freshGameState = savelib.initGame(tribeName);
  allGames[tribeName] = freshGameState;

  if (typeof logFn === 'function') {
    logFn(
      `[RESET] Started a new game for tribe ${tribeName} because join was requested after game end`
    );
  }

  return freshGameState;
}

function resetEndedGameAfterArchive(tribeName, savelib) {
  const freshGameState = savelib.initGame(tribeName);
  allGames[tribeName] = freshGameState;
  return freshGameState;
}

function getAllGames() {
  return allGames;
}

module.exports = {
  getGameState,
  setGameState,
  prepareGameStateForJoin,
  resetEndedGameAfterArchive,
  getAllGames,
};
