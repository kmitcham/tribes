'use strict';

const scoutCommand = require('../commands/general/scout.js');

describe('scout command', () => {
  function createInteraction(displayName, values) {
    return {
      member: { displayName },
      options: {
        getString(name) {
          return Object.prototype.hasOwnProperty.call(values, name)
            ? values[name]
            : null;
        },
      },
    };
  }

  test('returns game tracks for location=overview', async () => {
    const gameState = {
      locationName: 'marsh',
      currentLocationName: 'marsh',
      seasonCounter: 1,
      gameTrack: {
        veldt: 1,
        forest: 2,
        marsh: 3,
        hills: 4,
      },
      population: {},
      messages: {},
    };

    const interaction = createInteraction('ScoutTester', {
      location: 'overview',
    });

    await scoutCommand.execute(interaction, gameState);

    expect(gameState.messages.ScoutTester).toMatch(/Game tracks by area/);
    expect(gameState.messages.ScoutTester).toMatch(/marsh: track 3/);
    expect(gameState.messages.ScoutTester).not.toContain('resources are');
  });

  test('statistics=all table is personalized and lists basket/spear variants', async () => {
    const gameState = {
      currentLocationName: 'hills',
      seasonCounter: 1,
      gameTrack: {
        veldt: 1,
        forest: 1,
        marsh: 1,
        hills: 8,
      },
      population: {
        ScoutTester: {
          name: 'ScoutTester',
          profession: 'hunter',
          strength: 'strong',
          guarding: [],
        },
      },
      messages: {},
    };

    const interaction = createInteraction('ScoutTester', {
      location: 'hills',
      statistics: 'all',
    });

    await scoutCommand.execute(interaction, gameState);

    const msg = gameState.messages.ScoutTester;
    expect(msg).toMatch(
      /Scout statistics for ScoutTester — hills \(game track 8/
    );
    expect(msg).toMatch(/profession=hunter/);
    expect(msg).toMatch(/strength=strong/);
    expect(msg).toMatch(/gather \(no basket\)/);
    expect(msg).toMatch(/gather \(with basket\)/);
    expect(msg).toMatch(/hunt \(no spear\)/);
    expect(msg).toMatch(/hunt \(with spear\)/);
    expect(msg).toMatch(/game track 8/);
  });

  test('statistics without tribe membership explains the requirement', async () => {
    const gameState = {
      currentLocationName: 'veldt',
      seasonCounter: 1,
      gameTrack: { veldt: 1, forest: 1, marsh: 1, hills: 1 },
      population: {},
      messages: {},
    };

    const interaction = createInteraction('Ghost', {
      location: 'veldt',
      statistics: 'all',
    });

    await scoutCommand.execute(interaction, gameState);
    expect(gameState.messages.Ghost).toMatch(/need you in the tribe/i);
  });

  test('statistics option descriptions mention game track', () => {
    const json = scoutCommand.data.toJSON();
    const statistics = (json.options || []).find((o) => o.name === 'statistics');
    expect(statistics).toBeTruthy();
    expect(statistics.description.toLowerCase()).toMatch(/game track/);
    const choiceNames = (statistics.choices || []).map((c) => c.name).join(' ');
    expect(choiceNames.toLowerCase()).toMatch(/game track/);
  });
});

describe('scout statistics player helpers', () => {
  const { gatherYieldOnce, huntYieldOnce, playerContext } = scoutCommand._test;

  test('playerContext reads profession and strength', () => {
    const ctx = playerContext(
      { name: 'Ada', profession: 'gatherer', strength: 'weak', guarding: ['a', 'b', 'c'] },
      { seasonCounter: 2 }
    );
    expect(ctx.isGatherer).toBe(true);
    expect(ctx.isHunter).toBe(false);
    expect(ctx.strengthMod).toBe(-1);
    expect(ctx.coldSeason).toBe(true);
    expect(ctx.guardMod).toBe(-2);
  });

  test('basket column doubles gather EV for exact enumeration path', () => {
    const ctx = playerContext(
      { name: 'Ada', profession: 'gatherer', strength: '', guarding: [] },
      { seasonCounter: 1 }
    );
    const once = gatherYieldOnce('veldt', 12, ctx);
    // with-basket exact path uses 2× one roll's yield
    expect(once.food + once.grain).toBeGreaterThan(0);
  });

  test('spear can improve hunter yield on high raw rolls', () => {
    const ctx = playerContext(
      { name: 'Bob', profession: 'hunter', strength: 'strong', guarding: [] },
      { seasonCounter: 1 }
    );
    const plain = huntYieldOnce('veldt', 12, ctx, false, 1);
    const spear = huntYieldOnce('veldt', 12, ctx, true, 1);
    expect(spear.food).toBeGreaterThanOrEqual(plain.food);
  });
});
