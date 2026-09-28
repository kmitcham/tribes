'use strict';

/**
 * All gamestate.gameTrack mutations should go through these helpers so a
 * disk save is always requested (saveRequired).
 */

function ensureGameTrack(gameState) {
  if (!gameState.gameTrack || typeof gameState.gameTrack !== 'object') {
    gameState.gameTrack = {};
  }
  return gameState.gameTrack;
}

function getGameTrack(gameState, locationName) {
  const tracks = ensureGameTrack(gameState);
  const value = Number(tracks[locationName]);
  return Number.isFinite(value) ? value : 0;
}

/**
 * Set a location's game track and mark the tribe dirty for save.
 * @returns {number} the value stored
 */
function setGameTrack(gameState, locationName, value) {
  if (!gameState || !locationName) {
    return 0;
  }
  const tracks = ensureGameTrack(gameState);
  let next = Number(value);
  if (!Number.isFinite(next)) {
    next = 1;
  }
  tracks[locationName] = next;
  gameState.saveRequired = true;
  return next;
}

/**
 * Add delta to a location's game track (default +1) and mark dirty for save.
 * @returns {number} the new track value
 */
function bumpGameTrack(gameState, locationName, delta) {
  const amount = Number(delta);
  const change = Number.isFinite(amount) ? amount : 1;
  const current = getGameTrack(gameState, locationName) || 0;
  return setGameTrack(gameState, locationName, current + change);
}

module.exports = {
  ensureGameTrack,
  getGameTrack,
  setGameTrack,
  bumpGameTrack,
};
