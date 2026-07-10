const allGames = {};
const tribeQueues = new Map();

/**
 * Serialize async work per tribe so concurrent commands/romance/import
 * cannot interleave mutations of the same in-memory gameState.
 */
function runExclusive(tribeName, fn) {
  const key = tribeName || 'bug';
  const previous = tribeQueues.get(key) || Promise.resolve();
  const run = previous.catch(() => {}).then(() => fn());
  const tracked = run.finally(() => {
    if (tribeQueues.get(key) === tracked) {
      tribeQueues.delete(key);
    }
  });
  tribeQueues.set(key, tracked);
  return run;
}

function getGameState(tribeName, savelib) {
  if (allGames[tribeName]) {
    return allGames[tribeName];
  }

  // loadTribe either returns a loaded/new game or throws TRIBE_LOAD_FAILED.
  // Never call initGame here when a corrupt main save exists.
  const gameState = savelib.loadTribe(tribeName);
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
  runExclusive,
};
