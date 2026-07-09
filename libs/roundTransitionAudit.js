const logger = require('./logger.js');

const ROUND_START_MARKERS = {
  work: '==>Starting the work round.',
  food: '==>Starting the food and trading round.',
  reproduction: '==> Starting the Reproduction round;',
};

function getSeasonLabel(gameState) {
  if (!gameState || typeof gameState.seasonCounter !== 'number') {
    return 'unknown';
  }
  return String(gameState.seasonCounter / 2);
}

function historyEntryMessage(entry) {
  if (typeof entry === 'string') {
    return entry;
  }
  if (entry && typeof entry === 'object' && typeof entry.message === 'string') {
    return entry.message;
  }
  return '';
}

function countRoundStartsForSeason(gameState, roundName) {
  const marker = ROUND_START_MARKERS[roundName];
  if (!marker) {
    return 0;
  }

  const tribeHistory = Array.isArray(gameState && gameState.tribeHistory)
    ? gameState.tribeHistory
    : [];
  const seasonPrefix = getSeasonLabel(gameState) + ':';

  let count = 0;
  for (const entry of tribeHistory) {
    const message = historyEntryMessage(entry);
    if (!message) {
      continue;
    }
    if (!message.startsWith(seasonPrefix)) {
      continue;
    }
    if (message.indexOf(marker) !== -1) {
      count += 1;
    }
  }
  return count;
}

function logRoundTransitionAnomaly(gameState, targetRound, details = {}) {
  const existingStarts = countRoundStartsForSeason(gameState, targetRound);
  if (existingStarts < 1) {
    return;
  }

  const payload = {
    dateTime: new Date().toISOString(),
    type: 'ROUND_ANOMALY',
    targetRound,
    season: getSeasonLabel(gameState),
    existingStarts,
    roundField: gameState ? gameState.round : undefined,
    workRound: gameState ? gameState.workRound : undefined,
    foodRound: gameState ? gameState.foodRound : undefined,
    reproductionRound: gameState ? gameState.reproductionRound : undefined,
    details,
  };

  logger.errorLog.error(JSON.stringify(payload));
}

module.exports = {
  logRoundTransitionAnomaly,
};
