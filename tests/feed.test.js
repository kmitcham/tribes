// feed.test.js
const {
  feed,
  consumeFood,
  consumeFoodChildren,
  birth,
} = require('../libs/feed.js');
const diceLib = require('../libs/dice.js');
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
        message: function (_message) {},
        send: function (_message) {},
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
    expect(response).toContain('p1 feeds all the children of p2.');
    expect(response).toContain('p1 feeds 2 to C1');
    expect(response).toContain('p1 feeds 2 to C2');
  });

  test('feed filtered by mother name even when mother is not in population', () => {
    var gameState = {
      population: {
        p1: {
          name: 'p1',
          gender: 'male',
          activity: 'gather',
          food: 20,
          grain: 10,
        },
      },
      children: {
        C1: {
          mother: 'lostMom',
          father: 'p1',
          age: 4,
          food: 0,
          gender: 'female',
          name: 'C1',
        },
        C2: {
          mother: 'lostMom',
          father: 'p1',
          age: 1,
          food: 0,
          gender: 'female',
          name: 'C2',
        },
        C3: {
          mother: 'otherMom',
          father: 'p1',
          age: 1,
          food: 0,
          gender: 'female',
          name: 'C3',
        },
      },
      banished: {
        lostMom: {
          name: 'lostMom',
          gender: 'female',
        },
      },
    };

    feed(null, gameState.population.p1, 2, ['lostMom'], gameState);
    response = gameState.messages['tribe'];

    expect(response).toContain('p1 feeds all the children of lostMom.');
    expect(response).toContain('p1 feeds 2 to C1');
    expect(response).toContain('p1 feeds 2 to C2');
    expect(response).not.toContain('p1 feeds 2 to C3');
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

    expect(response).toContain('p1 feeds all the hungry children.');
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

  test('feed !under2 feeds only hungry children under age two', () => {
    var gameState = {
      population: {
        p1: {
          name: 'p1',
          gender: 'male',
          activity: 'gather',
          food: 50,
          grain: 10,
        },
      },
      children: {
        BabyHungry: {
          mother: 'p2',
          father: 'p1',
          age: 3,
          food: 0,
          gender: 'female',
          name: 'BabyHungry',
        },
        BabyFed: {
          mother: 'p2',
          father: 'p1',
          age: 2,
          food: 2,
          gender: 'male',
          name: 'BabyFed',
        },
        OlderHungry: {
          mother: 'p2',
          father: 'p1',
          age: 4,
          food: 0,
          gender: 'female',
          name: 'OlderHungry',
        },
      },
    };

    feed(null, gameState.population.p1, 2, ['!under2'], gameState);
    response = gameState.messages['tribe'];

    expect(response).toContain('p1 feeds all hungry children under age two.');
    expect(response).toContain('p1 feeds 2 to BabyHungry');
    expect(response).not.toContain('p1 feeds 2 to BabyFed');
    expect(response).not.toContain('p1 feeds 2 to OlderHungry');
  });

  test('feed !allwith overfeeding', () => {
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
    feed(null, gameState.population.p1, 3, ['!all'], gameState);
    response = gameState.messages['tribe'];
    expect(response).toContain('fails to overfeed');
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

  test('feeds multiple children without message accumulation', () => {
    // Setup: Multiple hungry children
    gameState.children = {
      Child1: { food: 0, newAdult: false },
      Child2: { food: 0, newAdult: false },
      Child3: { food: 0, newAdult: false },
    };
    player.food = 30;
    player.grain = 0;

    feed('', player, 2, ['child1', 'child2', 'child3'], gameState);

    const response = gameState.messages['tribe'];

    // Verify each child is mentioned exactly once in a feed line
    const child1Matches = (response.match(/feeds 2 to Child1/g) || []).length;
    const child2Matches = (response.match(/feeds 2 to Child2/g) || []).length;
    const child3Matches = (response.match(/feeds 2 to Child3/g) || []).length;

    expect(child1Matches).toBe(1);
    expect(child2Matches).toBe(1);
    expect(child3Matches).toBe(1);

    // Verify message is reasonable length (not exponentially accumulated)
    // A non-accumulated message should be around 150-250 chars
    // An exponentially accumulated message would be 1000+ chars
    expect(response.length).toBeLessThan(500);
  });

  test('feeds all hungry children without exponential message growth', () => {
    // Setup: 4 hungry children (bigger number to make exponential accumulation obvious)
    gameState.children = {
      Hungry1: { food: 0, newAdult: false },
      Hungry2: { food: 0, newAdult: false },
      Hungry3: { food: 0, newAdult: false },
      Hungry4: { food: 0, newAdult: false },
    };
    player.food = 50;
    player.grain = 0;

    feed('', player, 2, ['!all'], gameState);

    const response = gameState.messages['tribe'];

    // With exponential accumulation, message would contain:
    // Hungry1 (1x), then Hungry1+Hungry2 (2x), then Hungry1+Hungry2+Hungry3 (3x)
    // So Hungry1 would appear 6 times total
    // With fix, each child should appear exactly once
    const hungry1Mentions = (response.match(/Hungry1/g) || []).length;
    const hungry4Mentions = (response.match(/Hungry4/g) || []).length;

    // Should have exactly 2 mentions each: once in "feeds X to ChildY" and once in "ChildY could eat more"
    expect(hungry1Mentions).toBeLessThanOrEqual(2);
    expect(hungry4Mentions).toBeLessThanOrEqual(2);

    // Message length sanity check - 4 children fed should be ~300-400 chars max
    // Exponential accumulation would easily exceed 1000+ chars
    expect(response.length).toBeLessThan(600);
  });

  test('feeds two specific children and verifies output', () => {
    // Setup: Two children to feed and one unfed child
    gameState.children = {
      Child1: { food: 0, newAdult: false },
      Child2: { food: 0, newAdult: false },
      UnfedChild: { food: 0, newAdult: false },
    };
    player.food = 10;
    player.grain = 0;

    // Feed two specific children
    feed('', player, 2, ['child1', 'child2'], gameState);

    const response = gameState.messages['tribe'];

    // Verify the fed children are mentioned with correct amounts
    expect(response).toMatch(/feeds 2 to Child1/);
    expect(response).toMatch(/feeds 2 to Child2/);

    // Confirm feed lines are not repeated
    const child1FeedLineCount = (
      response.match(/TestPlayer feeds 2 to Child1\./g) || []
    ).length;
    const child2FeedLineCount = (
      response.match(/TestPlayer feeds 2 to Child2\./g) || []
    ).length;
    expect(child1FeedLineCount).toBe(1);
    expect(child2FeedLineCount).toBe(1);

    // Verify the unfed child is not mentioned
    expect(response).not.toMatch(/UnfedChild/);

    // Verify the player's food is reduced correctly
    expect(player.food).toBe(6);

    // Verify the fed children's food is updated correctly
    expect(gameState.children['Child1'].food).toBe(2);
    expect(gameState.children['Child2'].food).toBe(2);

    // Verify the unfed child's food remains unchanged
    expect(gameState.children['UnfedChild'].food).toBe(0);
  });
});

// Import necessary dependencies
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
  let twinCounter;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    twinCounter = 0;

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
      twinCounter += 1;
      const twin = {
        name: 'Twin' + twinCounter,
        mother: mother,
        father: father,
        gender: 'female',
        age: -1,
        food: 5,
      };
      state.children[twin.name] = twin;
      return twin;
    });
  });

  it('should age all living children by 1', () => {
    // Child1 hits age 0 (birth). Stub roll so stillbirth (roll < 5) cannot flake the test.
    const rollSpy = jest.spyOn(diceLib, 'roll').mockReturnValue(10);
    consumeFoodChildren(gameState);
    rollSpy.mockRestore();

    // Check all living children aged by 1
    expect(gameState.children['Child1'].age).toBe(0);
    expect(gameState.children['Child2'].age).toBe(4);
    expect(gameState.children['Child3'].age).toBe(24);

    // Dead children should not age
    expect(gameState.children['DeadChild'].age).toBe(2);
  });

  it("should reduce each child's food by 2", () => {
    // Child1 hits age 0 (birth). Stub roll so stillbirth (roll < 5) cannot flake the test.
    const rollSpy = jest.spyOn(diceLib, 'roll').mockReturnValue(10);
    consumeFoodChildren(gameState);
    rollSpy.mockRestore();

    // Check food reduction
    expect(gameState.children['Child1'].food).toBe(3);
    expect(gameState.children['Child2'].food).toBe(0);
    expect(gameState.children['Child3'].food).toBe(2); // young adult does not eat anymore
  });

  it('should mark children with negative food as dead', () => {
    gameState.children['Child2'].food = 1;
    // Avoid birth stillbirth removing Child1 while we assert on Child2 starvation.
    const rollSpy = jest.spyOn(diceLib, 'roll').mockReturnValue(10);
    consumeFoodChildren(gameState);
    rollSpy.mockRestore();

    // Child2 should be marked as dead due to starvation
    expect(gameState.graveyard['Child2'].dead).toBe(true);

    // Mother2's pregnancy status should be cleared
    expect(gameState.population['Mother2'].isPregnant).toBeUndefined();
  });

  it('should handle child birth when age becomes 0', () => {
    // Mock dice roll on the actual module used by feed.js for deterministic birth path
    const rollSpy = jest.spyOn(diceLib, 'roll').mockReturnValue(10);

    response = consumeFoodChildren(gameState);

    rollSpy.mockRestore();

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
    // Mock dice roll on the actual module used by feed.js for deterministic birth path
    const rollSpy = jest.spyOn(diceLib, 'roll').mockReturnValue(10);

    consumeFoodChildren(gameState);

    rollSpy.mockRestore();

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

describe('consumeFood death summary integration', () => {
  it('reports starvation and no-milk deaths once with friendly wording', () => {
    const gameState = {
      seasonCounter: 10,
      population: {
        Mom: {
          name: 'Mom',
          gender: 'female',
          food: 0,
          grain: 0,
          nursing: ['baby1', 'baby2'],
        },
        Xan: {
          name: 'Xan',
          gender: 'male',
          food: 4,
          grain: 0,
        },
      },
      children: {
        Baby1: {
          name: 'Baby1',
          mother: 'Mom',
          father: 'Xan',
          age: 4,
          food: 2,
          gender: 'female',
        },
        Baby2: {
          name: 'Baby2',
          mother: 'Mom',
          father: 'Xan',
          age: 4,
          food: 2,
          gender: 'male',
        },
      },
    };

    const response = consumeFood(gameState);

    expect(response).toContain('Food round results:');
    expect(response).toContain('Adults starved: Mom.');
    expect(response).toContain('No children starved from hunger.');
    expect(response).toContain('Children died from no-milk: Baby1, Baby2.');

    // Ensure old misleading line is gone for no-milk child deaths.
    expect(response).not.toContain('No children starved!');

    // Ensure summary does not repeat the same victim/cause lines.
    const momStarveCount = (response.match(/Adults starved: Mom\./g) || [])
      .length;
    const noMilkLineCount = (
      response.match(/Children died from no-milk: Baby1, Baby2\./g) || []
    ).length;
    expect(momStarveCount).toBe(1);
    expect(noMilkLineCount).toBe(1);

    // Survivor correctness: Xan remains alive, Mom is removed.
    expect(gameState.population['Xan']).toBeDefined();
    expect(gameState.population['Mom']).toBeUndefined();
  });

  it('does not inject duplicate kill-lines into food summary output', () => {
    const gameState = {
      seasonCounter: 2,
      population: {
        Clawtooth: { name: 'Clawtooth', gender: 'male', food: 0, grain: 0 },
        Xan: { name: 'Xan', gender: 'male', food: 4, grain: 0 },
      },
      children: {},
    };

    const response = consumeFood(gameState);

    // Only the new summary format should appear in consumeFood output.
    expect(response).toContain('Adults starved: Clawtooth.');
    expect(response).not.toContain('Clawtooth killed by starvation');
    expect(response).not.toContain('Clawtooth has starved to death');
  });
});
