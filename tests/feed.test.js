// feed.test.js
const {
  feed,
  checkFood,
  consumeFoodChildren,
  birth,
} = require('../libs/feed.js');
console.log = jest.fn();

describe('feed function', () => {
  let gameState;
  let player;

  beforeEach(() => {
    // Reset mocks and setup initial state before each test
    jest.clearAllMocks();

    player = {
      name: 'TestPlayer',
      food: 10,
      grain: 5,
    };

    gameState = {
      children: {
        Child1: { food: 0, newAdult: false },
        Child2: { food: 2, newAdult: false },
        Adult1: { food: 1, newAdult: true },
      },
      population: {
        TestPlayer: player,
      },
    };
  });

  test('feed filtered by parent', () => {
    var dummyMessage = {
      author: {
        message: function (message) {},
        send: function (message) {},
      },
    };
    var gameState = {
      population: {
        p1: {
          name: 'p1',
          gender: 'male',
          activity: 'gather',
          food: 20,
          grain: 10,
        },
        p2: {
          name: 'p2',
          gender: 'female',
          grain: 10,
        },
      },
      children: {
        C1: {
          mother: 'p2',
          father: 'p1',
          age: 4,
          food: 0,
          gender: 'female',
          name: 'C1',
        },
        C2: {
          mother: 'p2',
          father: 'p1',
          age: 1,
          food: 0,
          gender: 'female',
          name: 'C2',
        },
        C3: {
          mother: 'p4',
          father: 'p5',
          age: 1,
          food: 0,
          gender: 'female',
          name: 'C3',
        },
      },
    };
    feed(dummyMessage, gameState.population.p1, 2, ['p2'], gameState);
    response = gameState.messages['tribe'];
    expect(response).toContain('p1 feeds 2 to C1');
    expect(response).toContain('p1 feeds 2 to C2');
  });

  test('feed !all', () => {
    var gameState = {
      population: {
        p1: {
          name: 'p1',
          gender: 'male',
          activity: 'gather',
          food: 20,
          grain: 10,
        },
        p2: {
          name: 'p2',
          gender: 'female',
          grain: 10,
        },
      },
      children: {
        C1: {
          mother: 'p2',
          father: 'p1',
          age: 4,
          food: 0,
          gender: 'female',
          name: 'C1',
        },
        C2: {
          mother: 'p2',
          father: 'p1',
          age: 1,
          food: 0,
          gender: 'female',
          name: 'C2',
        },
        C3: {
          mother: 'p4',
          father: 'p5',
          age: 1,
          food: 0,
          gender: 'female',
          name: 'C3',
        },
      },
    };
    feed(null, gameState.population.p1, 2, ['!all'], gameState);
    response = gameState.messages['tribe'];

    expect(response).toContain('p1 feeds 2 to C1');
    expect(response).toContain('p1 feeds 2 to C2');
    expect(response).toContain('p1 feeds 2 to C3');
  });

  test('feed !all when no one is hungry', () => {
    var gameState = {
      population: {
        p1: {
          name: 'p1',
          gender: 'male',
          activity: 'gather',
          food: 20,
          grain: 10,
        },
        p2: {
          name: 'p2',
          gender: 'female',
          grain: 10,
        },
      },
      children: {
        C1: {
          mother: 'p2',
          father: 'p1',
          age: 4,
          food: 2,
          gender: 'female',
          name: 'C1',
        },
        C2: {
          mother: 'p2',
          father: 'p1',
          age: 1,
          food: 2,
          gender: 'female',
          name: 'C2',
        },
        C3: {
          mother: 'p4',
          father: 'p5',
          age: 1,
          food: 2,
          gender: 'female',
          name: 'C3',
        },
      },
    };
    feed(null, gameState.population.p1, 2, ['!all'], gameState);
    response = gameState.messages['tribe'];
    expect(response).toContain('No children were fed');
  });

  test('feed !all when some are hungry', () => {
    var gameState = {
      population: {
        p1: {
          name: 'p1',
          gender: 'male',
          activity: 'gather',
          food: 200,
          grain: 10,
        },
        p2: {
          name: 'p2',
          gender: 'female',
          grain: 10,
        },
      },
      children: {
        C1: {
          mother: 'p2',
          father: 'p1',
          age: 4,
          food: 1,
          gender: 'female',
          name: 'C1',
        },
        C2: {
          mother: 'p2',
          father: 'p1',
          age: 1,
          food: 2,
          gender: 'female',
          name: 'C2',
        },
        C3: {
          mother: 'p4',
          father: 'p5',
          age: 1,
          food: 0,
          gender: 'female',
          name: 'C3',
        },
      },
    };
    feed(null, gameState.population.p1, 2, ['!all'], gameState);
    response = gameState.messages['tribe'];
    expect(response).toContain('p1 feeds 1 to C1');
    expect(response).toContain('p1 feeds 2 to C3');
    //expect(response).toBe("no children need food")
  });

  test('feeds a specific child successfully', () => {
    const childList = ['child1'];
    const amount = 2;

    const result = feed('', player, amount, childList, gameState);

    expect(result).toBe(0);
    expect(gameState.children['Child1'].food).toBe(2);
    expect(player.food).toBe(8);
    actual = gameState.messages['tribe'];
    expect(actual).toContain('TestPlayer feeds 2 to Child1');
  });

  test('does not feed child that already has enough food', () => {
    const childList = ['child2'];
    const amount = 1;
    const initialFood = player.food;

    feed('', player, amount, childList, gameState);

    expect(gameState.children['Child2'].food).toBe(2); // Unchanged
    expect(player.food).toBe(initialFood); // Unchanged
    actual = gameState.messages['TestPlayer'];
    expect(actual).toContain('Child2 has enough food already.');
  });

  test('handles !all command feeding all eligible children', () => {
    const childList = ['!all'];
    const amount = 2;

    feed('', player, amount, childList, gameState);

    expect(gameState.children['Child1'].food).toBe(2);
    expect(gameState.children['Child2'].food).toBe(2); // Unchanged
    expect(gameState.children['Adult1'].food).toBe(1); // Unchanged
    expect(player.food).toBe(8);
  });

  test('fails when player has insufficient food', () => {
    player.food = 1;
    player.grain = 0;
    const childList = ['child1'];
    const amount = 2;

    feed('', player, amount, childList, gameState);

    expect(gameState.children['Child1'].food).toBe(0); // Unchanged
    expect(player.food).toBe(1); // Unchanged
    actual = gameState.messages['TestPlayer'];
    expect(actual).toContain(
      'You do not have enough food or grain to feed Child1'
    );
  });
});

// Import necessary dependencies
const assert = require('assert');

// Mock dependencies
const mockDice = {
  roll: jest.fn(),
};

const mockPop = {
  memberByName: jest.fn(),
  history: jest.fn(),
};

const mockKilllib = {
  kill: jest.fn(),
};

const mockReproLib = {
  addChild: jest.fn(),
};

// Mock the global objects that the function uses
global.dice = mockDice;
global.pop = mockPop;
global.killlib = mockKilllib;
global.reproLib = mockReproLib;

describe('consumeFoodChildren Function Tests', () => {
  let gameState;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Set up a fresh gameState before each test
    gameState = {
      messages: {},
      population: {
        Mother1: {
          name: 'Mother1',
          isPregnant: 'Child1',
          guarding: ['Child1'],
        },
        Mother2: {
          name: 'Mother2',
          nursing: ['Child2'],
        },
        Mother3: {
          name: 'Mother3',
          guarding: ['Child3', 'OtherChild'],
        },
        Father1: { name: 'Father1' },
      },
      children: {
        Child1: {
          name: 'Child1',
          mother: 'Mother1',
          father: 'Father1',
          gender: 'male',
          age: -1,
          food: 5,
        },
        Child2: {
          name: 'Child2',
          mother: 'Mother2',
          father: 'Father1',
          gender: 'female',
          age: 3,
          food: 2,
        },
        Child3: {
          name: 'Child3',
          mother: 'Mother3',
          father: 'Father1',
          gender: 'male',
          age: 23,
          food: 2,
        },
        DeadChild: {
          name: 'DeadChild',
          mother: 'Mother1',
          dead: true,
          age: 2,
          food: 0,
        },
      },
    };

    // Set up mock implementations
    mockPop.memberByName.mockImplementation((name, state) => {
      return state.population[name];
    });

    mockReproLib.addChild.mockImplementation((mother, father, state) => {
      const twin = {
        name: 'Twin' + Math.random().toString(36).substring(7),
        mother: mother,
        father: father,
        gender: Math.random() > 0.5 ? 'male' : 'female',
        age: -1,
        food: 5,
      };
      state.children[twin.name] = twin;
      return twin;
    });
  });

  it('should age all living children by 1', () => {
    consumeFoodChildren(gameState);

    // Check all living children aged by 1
    expect(gameState.children['Child1'].age).toBe(0);
    expect(gameState.children['Child2'].age).toBe(4);
    expect(gameState.children['Child3'].age).toBe(24);

    // Dead children should not age
    expect(gameState.children['DeadChild'].age).toBe(2);
  });

  it("should reduce each child's food by 2", () => {
    consumeFoodChildren(gameState);

    // Check food reduction
    expect(gameState.children['Child1'].food).toBe(3);
    expect(gameState.children['Child2'].food).toBe(0);
    expect(gameState.children['Child3'].food).toBe(2); // young adult does not eat anymore
  });

  it('should mark children with negative food as dead', () => {
    gameState.children['Child2'].food = 1;
    consumeFoodChildren(gameState);

    // Child2 should be marked as dead due to starvation
    expect(gameState.graveyard['Child2'].dead).toBe(true);

    // Mother2's pregnancy status should be cleared
    expect(gameState.population['Mother2'].isPregnant).toBeUndefined();
  });

  it('should handle child birth when age becomes 0', () => {
    // Mock dice roll for successful birth (> 4)
    mockDice.roll.mockReturnValue(10);

    response = consumeFoodChildren(gameState);

    // Check birth-related actions
    expect(response).toContain('Mother1 gives birth to a male-child');
    // this can fail when  (birthRoll < 5 )
    // Mother should be guarding the child
    expect(gameState.population['Mother1'].guarding).toContain('Child1');

    // Mother should be nursing
    expect(gameState.population['Mother1'].nursing).toContain('Child1');
  });

  it('should handle stillbirth when birth roll is low', () => {
    birthRoll = 4;

    birth(
      gameState,
      gameState.children['Child1'],
      gameState.population['Mother1'],
      birthRoll
    );

    // Child should be marked as dead
    expect(gameState.graveyard['Child1'].dead).toBe(true);

    // Kill function should be called with birth complications
    expect(gameState.graveyard['Child1'].deathMessage).toContain(
      'complications'
    );
  });

  it('should handle twin birth when roll is 17', () => {
    // Mock dice roll for twin birth
    birthRoll = 17;

    // Create a fake twin
    const fakeTwin = {
      name: 'TwinTest',
      mother: 'Mother1',
      father: 'Father1',
      gender: 'female',
      age: 0,
      food: 5,
    };
    mockReproLib.addChild.mockReturnValue(fakeTwin);

    birth(
      gameState,
      gameState.children['Child1'],
      gameState.population['Mother1'],
      birthRoll
    );

    // Should have called addChild to create twin
    //expect(gameState.childre).toHaveBeenCalledWith('Mother1', 'Father1', gameState);

    // Mother's pregnancy status should be cleared
    expect(Object.keys(gameState.children).length).toEqual(5);

    // Twin should be included in mother's guarding list
    expect(gameState.population['Mother1'].guarding.length).toEqual(2);
  });

  it('should handle weaning when child reaches age 4', () => {
    // Child2 would be age 4 after the function runs
    // But in this case Child2 starves, so we need to modify the test or the initial state
    gameState.children['Child2'].food = 5; // Prevent starvation

    consumeFoodChildren(gameState);

    // Check if child is removed from nursing list
    expect(gameState.population['Mother2'].nursing).toBeUndefined();
  });

  it('should handle transition to adulthood at age 24', () => {
    consumeFoodChildren(gameState);

    // Child3 should be marked as a new adult
    expect(gameState.children['Child3'].newAdult).toBe(true);

    // Child3 should be removed from Mother3's guarding list
    expect(gameState.population['Mother3'].guarding).not.toContain('Child3');
    expect(gameState.population['Mother3'].guarding).toContain('OtherChild');
  });

  it('should clear babysitters when child becomes an adult', () => {
    // Add a babysitter
    gameState.children['Babysitter'] = {
      name: 'Babysitter',
      mother: 'Mother2',
      age: 15,
      food: 10,
      babysitting: 'Child3',
    };

    consumeFoodChildren(gameState);

    // Babysitter should no longer be babysitting the new adult
    expect(gameState.children['Babysitter'].babysitting).toBeUndefined();
  });

  it('should handle nursing setup for newborns', () => {
    // Mock dice roll for successful birth
    mockDice.roll.mockReturnValue(10);

    consumeFoodChildren(gameState);

    // Mother1 should be nursing Child1
    expect(gameState.population['Mother1'].nursing).toContain('Child1');
  });

  it('should fix bugged pregnancies when child ages', () => {
    // Setup a "bugged" pregnancy where isPregnant still references a child that's already born
    gameState.children['Child2'].age = 1;
    gameState.population['Mother2'].isPregnant = 'Child2';

    consumeFoodChildren(gameState);

    // The pregnancy status should be cleared
    expect(gameState.population['Mother2'].isPregnant).toBeUndefined();
  });

  it('should return a descriptive response string', () => {
    gameState.children['Child2'].food = 1;

    const response = consumeFoodChildren(gameState);

    // Check that the response contains expected text
    expect(response).toContain('Child1');
    expect(response).toContain('Child2 has starved to death');
    expect(response).toContain('Child3 has reached adulthood');
  });
});
