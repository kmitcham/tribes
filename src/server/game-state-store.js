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

function removeGameState(tribeName) {
  if (tribeName && Object.prototype.hasOwnProperty.call(allGames, tribeName)) {
    delete allGames[tribeName];
    return true;
  }
  return false;
}

/**
 * Persist every in-memory tribe to disk (shutdown / crash safety net).
 * By default saves all loaded games, not only those with saveRequired,
 * so any missed flag still gets written if we receive SIGTERM.
 *
 * @param {object} savelib - must provide saveTribe(gameState)
 * @param {{ force?: boolean, logFn?: Function }=} options
 * @returns {{ saved: number, skipped: number, failed: number, total: number, tribes: string[] }}
 */
function flushAllGamesToDisk(savelib, options) {
  options = options || {};
  const force = options.force !== false;
  const logFn =
    typeof options.logFn === 'function' ? options.logFn : console.log;
  const names = Object.keys(allGames);
  let saved = 0;
  let skipped = 0;
  let failed = 0;
  const savedTribes = [];

  for (const tribeName of names) {
    const gameState = allGames[tribeName];
    if (!gameState || typeof gameState !== 'object') {
      skipped += 1;
      continue;
    }
    if (!force && !gameState.saveRequired) {
      skipped += 1;
      continue;
    }
    if (!gameState.name) {
      gameState.name = tribeName;
    }
    try {
      if (!savelib || typeof savelib.saveTribe !== 'function') {
        throw new Error('savelib.saveTribe is not available');
      }
      savelib.saveTribe(gameState);
      gameState.saveRequired = false;
      saved += 1;
      savedTribes.push(tribeName);
    } catch (err) {
      failed += 1;
      logFn(
        '[SHUTDOWN] Failed to save tribe ' +
          tribeName +
          ': ' +
          (err && err.message ? err.message : String(err))
      );
    }
  }

  return {
    saved: saved,
    skipped: skipped,
    failed: failed,
    total: names.length,
    tribes: savedTribes,
  };
}

module.exports = {
  getGameState,
  setGameState,
  prepareGameStateForJoin,
  resetEndedGameAfterArchive,
  getAllGames,
  removeGameState,
  runExclusive,
  flushAllGamesToDisk,
};
