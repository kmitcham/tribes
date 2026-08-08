const gameStateStore = require('../src/server/game-state-store.js');

describe('game-state-store flushAllGamesToDisk', () => {
  afterEach(() => {
    // Clear any tribes registered during tests
    const all = gameStateStore.getAllGames();
    Object.keys(all).forEach((name) => gameStateStore.removeGameState(name));
  });

  test('saves all loaded tribes when force is true', () => {
    const saved = [];
    const savelib = {
      saveTribe(gs) {
        saved.push(gs.name);
      },
    };

    gameStateStore.setGameState('alpha', {
      name: 'alpha',
      saveRequired: false,
      population: {},
    });
    gameStateStore.setGameState('beta', {
      name: 'beta',
      saveRequired: true,
      population: {},
    });

    const result = gameStateStore.flushAllGamesToDisk(savelib, { force: true });

    expect(result.total).toBe(2);
    expect(result.saved).toBe(2);
    expect(result.failed).toBe(0);
    expect(saved.sort()).toEqual(['alpha', 'beta']);
    expect(gameStateStore.getAllGames().alpha.saveRequired).toBe(false);
    expect(gameStateStore.getAllGames().beta.saveRequired).toBe(false);
  });

  test('when force is false, only saves tribes with saveRequired', () => {
    const saved = [];
    const savelib = {
      saveTribe(gs) {
        saved.push(gs.name);
      },
    };

    gameStateStore.setGameState('clean', {
      name: 'clean',
      saveRequired: false,
      population: {},
    });
    gameStateStore.setGameState('dirty', {
      name: 'dirty',
      saveRequired: true,
      population: {},
    });

    const result = gameStateStore.flushAllGamesToDisk(savelib, {
      force: false,
    });

    expect(result.saved).toBe(1);
    expect(result.skipped).toBe(1);
    expect(saved).toEqual(['dirty']);
  });

  test('counts failures without throwing', () => {
    const savelib = {
      saveTribe(gs) {
        if (gs.name === 'bad') {
          throw new Error('disk full');
        }
      },
    };

    gameStateStore.setGameState('good', {
      name: 'good',
      saveRequired: true,
      population: {},
    });
    gameStateStore.setGameState('bad', {
      name: 'bad',
      saveRequired: true,
      population: {},
    });

    const logs = [];
    const result = gameStateStore.flushAllGamesToDisk(savelib, {
      force: true,
      logFn: (msg) => logs.push(msg),
    });

    expect(result.saved).toBe(1);
    expect(result.failed).toBe(1);
    expect(logs.some((line) => String(line).includes('bad'))).toBe(true);
  });
});
