'use strict';

const gameTrackLib = require('../libs/gameTrack.js');
const huntLib = require('../libs/hunt.js');
const chiefLib = require('../libs/chief.js');

describe('gameTrack helpers always mark saveRequired', () => {
  test('setGameTrack and bumpGameTrack set saveRequired', () => {
    const gameState = { gameTrack: { veldt: 3 }, saveRequired: false };
    gameTrackLib.setGameTrack(gameState, 'veldt', 7);
    expect(gameState.gameTrack.veldt).toBe(7);
    expect(gameState.saveRequired).toBe(true);

    gameState.saveRequired = false;
    gameTrackLib.bumpGameTrack(gameState, 'veldt', 1);
    expect(gameState.gameTrack.veldt).toBe(8);
    expect(gameState.saveRequired).toBe(true);
  });

  test('hunt increments track and leaves saveRequired true', () => {
    const gameState = {
      seasonCounter: 1,
      round: 'work',
      currentLocationName: 'marsh',
      gameTrack: { veldt: 1, forest: 1, marsh: 4, hills: 1 },
      foodAcquired: 0,
      population: {
        Hunter1: {
          name: 'Hunter1',
          profession: 'hunter',
          food: 0,
          spearhead: 0,
        },
      },
      children: {},
      messages: {},
      saveRequired: false,
    };
    huntLib.hunt('Hunter1', gameState.population.Hunter1, 10, gameState);
    expect(gameState.gameTrack.marsh).toBe(5);
    expect(gameState.saveRequired).toBe(true);
  });

  test('chance fire sets track to 20 with saveRequired', () => {
    const gameState = {
      seasonCounter: 1,
      currentLocationName: 'forest',
      gameTrack: { veldt: 1, forest: 5, marsh: 1, hills: 1 },
      population: { A: { name: 'A', food: 2 } },
      children: {},
      messages: {},
      needChanceRoll: true,
      saveRequired: false,
    };
    chiefLib.doChance(7, gameState);
    expect(gameState.gameTrack.forest).toBe(20);
    expect(gameState.saveRequired).toBe(true);
  });

  test('recoverGameTracks on cold season reduces tracks and sets saveRequired', () => {
    const gameState = {
      // even seasonCounter => cold season
      seasonCounter: 2,
      gameTrack: { veldt: 6, forest: 6, marsh: 6, hills: 6 },
      population: {},
      children: {},
      messages: {},
      saveRequired: false,
    };
    chiefLib.recoverGameTracks(gameState);
    expect(gameState.saveRequired).toBe(true);
    expect(gameState.gameTrack.veldt).toBeLessThan(6);
    expect(gameState.seasonCounter).toBe(3);
  });
});
