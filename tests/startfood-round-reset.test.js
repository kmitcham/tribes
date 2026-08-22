const startFood = require('../commands/chief/startfood.js');
const advanceRound = require('../commands/chief/advanceround.js');

describe('startfood / advanceround work-round completion gate', () => {
  test('startfood proceeds even when a healthy player has not worked', () => {
    const gameState = {
      demand: null,
      violence: null,
      ended: false,
      workRound: true,
      foodRound: false,
      reproductionRound: false,
      population: {
        Chief: {
          name: 'Chief',
          chief: true,
          worked: true,
          food: 4,
          grain: 0,
          gender: 'male',
        },
        Lazy: {
          name: 'Lazy',
          worked: false,
          food: 4,
          grain: 0,
          gender: 'female',
        },
      },
      children: {},
      messages: {},
      seasonCounter: 1,
      gameTrack: { veldt: 1, marsh: 1, hills: 1, forest: 1 },
    };

    const result = startFood.startFoodFilter('Chief', gameState, {});

    expect(result).toBeDefined();
    expect(gameState.workRound).toBe(false);
    expect(gameState.foodRound || gameState.reproductionRound).toBe(true);
  });

  test('startFoodFilter with requireAllWorked blocks unworked healthy players', () => {
    const gameState = {
      demand: null,
      violence: null,
      ended: false,
      workRound: true,
      foodRound: false,
      reproductionRound: false,
      population: {
        Chief: {
          name: 'Chief',
          chief: true,
          worked: true,
          food: 4,
          grain: 0,
          gender: 'male',
        },
        Lazy: {
          name: 'Lazy',
          worked: false,
          food: 4,
          grain: 0,
          gender: 'female',
        },
      },
      children: {},
      messages: {},
      seasonCounter: 1,
      gameTrack: { veldt: 1, marsh: 1, hills: 1, forest: 1 },
    };

    const result = startFood.startFoodFilter('Chief', gameState, {}, {
      requireAllWorked: true,
    });

    expect(result).toBeUndefined();
    expect(gameState.workRound).toBe(true);
    expect(gameState.foodRound).toBe(false);
    expect(gameState.messages.Chief).toContain(
      'these players have not worked yet'
    );
    expect(gameState.messages.Chief).toContain('Lazy');
    expect(gameState.messages.Chief).toContain('startfood');
  });

  test('allows food advance when unworked players are only sick or injured', () => {
    const gameState = {
      demand: null,
      violence: null,
      ended: false,
      workRound: true,
      foodRound: false,
      reproductionRound: false,
      population: {
        Chief: {
          name: 'Chief',
          chief: true,
          worked: true,
          food: 4,
          grain: 0,
          gender: 'male',
          isInjured: 0,
          isSick: 0,
        },
        InjuredResting: {
          name: 'InjuredResting',
          worked: false,
          food: 4,
          grain: 0,
          gender: 'female',
          isInjured: 2,
          isSick: 0,
        },
        SickResting: {
          name: 'SickResting',
          worked: false,
          food: 4,
          grain: 0,
          gender: 'male',
          isInjured: 0,
          isSick: 1,
        },
      },
      children: {},
      messages: {},
      seasonCounter: 1,
      gameTrack: { veldt: 1, marsh: 1, hills: 1, forest: 1 },
    };

    const result = startFood.startFoodFilter('Chief', gameState, {}, {
      requireAllWorked: true,
    });

    expect(result).toBeDefined();
    // Left work round (may land in food, or auto-advance to reproduction if fully fed).
    expect(gameState.workRound).toBe(false);
    expect(gameState.foodRound || gameState.reproductionRound).toBe(true);
  });

  test('advanceround from work round stays put when someone has not worked', async () => {
    const gameState = {
      demand: null,
      violence: null,
      ended: false,
      workRound: true,
      foodRound: false,
      reproductionRound: false,
      population: {
        Chief: {
          name: 'Chief',
          chief: true,
          worked: true,
          food: 4,
          grain: 0,
          gender: 'male',
        },
        Slack: {
          name: 'Slack',
          worked: false,
          food: 4,
          grain: 0,
          gender: 'female',
        },
      },
      children: {},
      messages: {},
      seasonCounter: 1,
      gameTrack: { veldt: 1, marsh: 1, hills: 1, forest: 1 },
    };

    await advanceRound.execute(
      { member: { displayName: 'Chief' } },
      gameState,
      {}
    );

    expect(gameState.workRound).toBe(true);
    expect(gameState.foodRound).toBe(false);
    expect(gameState.saveRequired).toBeFalsy();
    expect(gameState.messages.Chief).toContain('Slack');
  });
});

describe('startfood clears stale activity status', () => {
  test('clears prior work activity when advancing to food round', () => {
    const gameState = {
      demand: null,
      violence: null,
      ended: false,
      workRound: true,
      foodRound: false,
      reproductionRound: false,
      population: {
        Chief: {
          name: 'Chief',
          chief: true,
          worked: true,
          activity: 'gathered',
          food: 3,
          grain: 0,
          gender: 'male',
          isInjured: 0,
          isSick: 0,
        },
        Worker: {
          name: 'Worker',
          chief: false,
          worked: true,
          activity: 'crafted',
          food: 3,
          grain: 0,
          gender: 'female',
          isInjured: 0,
          isSick: 0,
        },
      },
      children: {},
      messages: {},
      gameTrack: {
        veldt: 1,
        marsh: 1,
        hills: 1,
        forest: 1,
      },
      seasonCounter: 0,
    };

    const bot = {};
    startFood.startFoodFilter('Chief', gameState, bot);

    expect(gameState.foodRound).toBe(true);
    expect(gameState.workRound).toBe(false);

    expect(gameState.population.Chief.worked).toBe(false);
    expect(gameState.population.Worker.worked).toBe(false);

    expect(gameState.population.Chief.activity).toBeUndefined();
    expect(gameState.population.Worker.activity).toBeUndefined();
  });

  test('uses recovery activity for resting injured player', () => {
    const gameState = {
      demand: null,
      violence: null,
      ended: false,
      workRound: true,
      foodRound: false,
      reproductionRound: false,
      population: {
        Chief: {
          name: 'Chief',
          chief: true,
          worked: true,
          activity: 'gathered',
          food: 4,
          grain: 0,
          gender: 'male',
          isInjured: 0,
          isSick: 0,
        },
        InjuredResting: {
          name: 'InjuredResting',
          chief: false,
          worked: false,
          activity: 'hunted',
          food: 4,
          grain: 0,
          gender: 'male',
          isInjured: 2,
          isSick: 0,
        },
      },
      children: {},
      messages: {},
      gameTrack: {
        veldt: 1,
        marsh: 1,
        hills: 1,
        forest: 1,
      },
      seasonCounter: 0,
    };

    const bot = {};
    startFood.startFoodFilter('Chief', gameState, bot);

    expect(gameState.population.InjuredResting.worked).toBe(false);
    expect(gameState.population.InjuredResting.activity).toBe('recovery');
  });
});
