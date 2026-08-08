/**
 * Guards against state mutations that never set gameState.saveRequired.
 * The command pipeline only persists when saveRequired is true.
 */
const runCommand = require('../commands/conflict/run.js');
const reproLib = require('../libs/reproduction.js');
const workLib = require('../libs/work.js');
const prof = require('../libs/profession.js');
const migrateLib = require('../libs/migrateLib.js');

describe('saveRequired on state mutations', () => {
  test('run command sets saveRequired (strategy may clear when combat resolves)', () => {
    const gameState = {
      population: {
        alice: { name: 'alice', faction: 'for' },
        bob: { name: 'bob', faction: 'against' },
        carol: { name: 'carol', faction: 'for', strategy: 'defend' },
      },
      messages: {},
      violence: 'test demand',
      violenceFactions: {
        alice: 'for',
        bob: 'against',
        carol: 'for',
      },
    };

    runCommand.execute(
      {
        member: { displayName: 'alice' },
        options: {},
      },
      gameState
    );

    // With undecided players, strategy should stick as 'run'
    expect(gameState.population.alice.strategy).toBe('run');
    expect(gameState.saveRequired).toBe(true);
  });

  test('pass sets cannotInvite and saveRequired', () => {
    const gameState = {
      reproductionRound: true,
      population: {
        alice: {
          name: 'alice',
          gender: 'female',
          inviteList: ['!pass'],
        },
        bob: {
          name: 'bob',
          gender: 'male',
          inviteList: ['!pass'],
          cannotInvite: true,
        },
      },
      children: {},
      messages: {},
    };

    reproLib.pass(gameState, 'alice');

    expect(gameState.population.alice.cannotInvite).toBe(true);
    expect(gameState.saveRequired).toBe(true);
  });

  test('train sets saveRequired on success', () => {
    const dice = require('../libs/dice.js');
    const original = dice.roll;
    dice.roll = () => 12;

    const gameState = {
      workRound: true,
      population: {
        learner: { name: 'learner' },
        mentor: { name: 'mentor', canCraft: true },
      },
      messages: {},
    };

    try {
      workLib.train(gameState, 'learner');
      expect(gameState.population.learner.canCraft).toBe(true);
      expect(gameState.saveRequired).toBe(true);
    } finally {
      dice.roll = original;
    }
  });

  test('specialize sets saveRequired', () => {
    const gameState = {
      population: {
        alice: { name: 'alice', gender: 'female' },
      },
      messages: {},
    };

    prof.specialize('alice', 'hunter', gameState);

    expect(gameState.population.alice.profession).toBe('hunter');
    expect(gameState.saveRequired).toBe(true);
  });

  test('forced migrate sets saveRequired', () => {
    const gameState = {
      reproductionRound: true,
      needChanceRoll: false,
      currentLocationName: 'veldt',
      population: {
        alice: { name: 'alice', chief: true },
      },
      children: {},
      messages: {},
    };

    const result = migrateLib.migrate('alice', 'forest', true, gameState);

    expect(result).toBe(0);
    expect(gameState.currentLocationName).toBe('forest');
    expect(gameState.saveRequired).toBe(true);
  });
});
