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
      'banish requires chief privileges'
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
      'banish can not be used while a demand is active. Active demand: food redistribution'
    );
  });
});
