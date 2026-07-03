const startFood = require('../commands/chief/startfood.js');

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
