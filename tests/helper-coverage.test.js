const banish = require('../libs/banish');
const children = require('../libs/children');
const text = require('../libs/textprocess');
const util = require('../libs/util');

describe('Helper coverage tests', () => {
  test('getYear converts seasons to years', () => {
    expect(util.getYear({ seasonCounter: 7 })).toBe(3.5);
  });

  test('countByType counts matching entries', () => {
    const population = {
      ada: { role: 'hunter' },
      bert: { role: 'gatherer' },
      cy: { role: 'hunter' },
      dot: {},
    };

    expect(util.countByType(population, 'role', 'hunter')).toBe(2);
  });

  test('gameStateMessage does not show pending invitations for one-gender tribe', () => {
    const gameState = {
      name: 'bug',
      seasonCounter: 4,
      currentLocationName: 'veldt',
      gameTrack: { veldt: 4 },
      reproductionRound: true,
      needChanceRoll: true,
      population: {
        ada: { name: 'ada', gender: 'female' },
      },
      children: {},
    };

    const message = util.gameStateMessage(gameState, null);

    expect(message).not.toContain('awaiting invitations or pass');
    expect(message).toContain('reproduction round, awaiting chance');
    expect(message).toContain('It is Year 2, cold season.');
    expect(message).toContain('adults and 0 children.');
    expect(message).toContain('game track is at 4.');
  });

  test('countChildrenOfParentUnderAge counts children for either parent', () => {
    const childMap = {
      Ava: { mother: 'Alice', father: 'Bob', age: 3 },
      Ben: { mother: 'Alice', father: 'Dan', age: 7 },
      Cam: { mother: 'Eve', father: 'Bob', age: 2 },
      Dee: { mother: 'Alice', father: 'Bob', age: 12 },
    };

    expect(children.countChildrenOfParentUnderAge(childMap, 'Alice', 10)).toBe(
      2
    );
    expect(children.countChildrenOfParentUnderAge(childMap, 'Bob', 5)).toBe(2);
  });

  test('banishAdmin rejects actors without chief privileges', () => {
    const gameState = {
      population: {
        Leader: { name: 'Leader', chief: false },
        Target: { name: 'Target' },
      },
      messages: {},
    };
    const addMessageSpy = jest.spyOn(text, 'addMessage');

    banish.banishAdmin(gameState, 'Leader', 'Target', 'reason');

    expect(addMessageSpy).toHaveBeenCalledWith(
      gameState,
      'Leader',
      'banish requires chief privileges.'
    );
  });

  test('banishAdmin reports active demand details', () => {
    const gameState = {
      population: {
        Leader: { name: 'Leader', chief: true },
        Target: { name: 'Target' },
      },
      demand: 'food redistribution',
      messages: {},
    };
    const addMessageSpy = jest.spyOn(text, 'addMessage');

    banish.banishAdmin(gameState, 'Leader', 'Target', 'reason');

    expect(addMessageSpy).toHaveBeenCalledWith(
      gameState,
      'Leader',
      'Banish can not be used during a conflict (active demand or violence). Active conflict: food redistribution.'
    );
  });

  test('depart moves member to banished list with voluntary reason', () => {
    const gameState = {
      population: {
        Alice: { name: 'Alice', gender: 'female', inviteList: ['Bob'] },
        Bob: { name: 'Bob', gender: 'male', inviteList: ['Alice', '!pass'] },
      },
      children: {},
      messages: {},
    };

    banish.depart(gameState, 'Alice');

    expect(gameState.population.Alice).toBeUndefined();
    expect(gameState.banished.Alice).toBeDefined();
    expect(gameState.banished.Alice[1]).toBe('left voluntarily');
    expect(gameState.messages.tribe).toContain('Alice has departed the tribe.');
    expect(gameState.messages.Alice).toContain(
      'You have left this tribe voluntarily'
    );
    expect(gameState.population.Bob.inviteList.indexOf('Alice')).toBe(-1);
    expect(gameState.saveRequired).toBe(true);
  });

  test('depart is blocked during demand or violence', () => {
    const gameState = {
      population: {
        Alice: { name: 'Alice' },
      },
      demand: 'share the meat',
      messages: {},
    };

    banish.depart(gameState, 'Alice');

    expect(gameState.population.Alice).toBeDefined();
    expect(gameState.banished).toBeUndefined();
    expect(gameState.messages.Alice).toContain(
      'Depart can not be used during a conflict'
    );
    expect(gameState.messages.Alice).toContain('share the meat');
  });

  test('chief who departs prompts for a new chief', () => {
    const gameState = {
      population: {
        Alice: { name: 'Alice', chief: true },
        Bob: { name: 'Bob' },
      },
      children: {},
      messages: {},
    };

    banish.depart(gameState, 'Alice');

    expect(gameState.population.Alice).toBeUndefined();
    expect(gameState.messages.tribe).toContain(
      'The tribe needs a new chief. Use vote to choose one.'
    );
    expect(gameState.ended).toBeFalsy();
  });

  test('last adult departing ends the game', () => {
    const gameState = {
      population: {
        Alice: { name: 'Alice', chief: true },
      },
      children: {},
      messages: {},
      foodAcquired: 0,
      spoiled: 0,
    };

    banish.depart(gameState, 'Alice');

    expect(gameState.population.Alice).toBeUndefined();
    expect(gameState.ended).toBe(true);
    expect(gameState.messages.tribe).toContain(
      'The last adult has left the tribe. The game ends.'
    );
    expect(gameState.messages.tribe).toContain('GAME OVER');
  });

  test('chief self-banish prompts for a new chief', () => {
    const gameState = {
      population: {
        Alice: { name: 'Alice', chief: true },
        Bob: { name: 'Bob' },
      },
      children: {},
      messages: {},
    };

    banish.banishAdmin(gameState, 'Alice', 'Alice', 'I step down by banishment');

    expect(gameState.population.Alice).toBeUndefined();
    expect(gameState.banished.Alice).toBeDefined();
    expect(gameState.messages.tribe).toContain(
      'The tribe needs a new chief. Use vote to choose one.'
    );
  });

  test('banished or departed adults cannot rejoin via addToPopulation', () => {
    const pop = require('../libs/population');
    const gameState = {
      population: {
        Bob: { name: 'Bob' },
      },
      banished: {
        Alice: [{ name: 'Alice', gender: 'female' }, 'left voluntarily'],
      },
      messages: {},
    };

    pop.addToPopulation(gameState, 'Alice', 'female', null, null);

    expect(gameState.population.Alice).toBeUndefined();
    expect(gameState.messages.Alice).toContain(
      'You cannot rejoin this tribe after leaving or being banished.'
    );
  });
});
