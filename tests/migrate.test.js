const m = require("../libs/migrateLib")
const killlib = require("../libs/kill")
const text = require("../libs/textprocess")

  let gameState;

  beforeEach(() => {
    gameState = {
      children: { 'child1': { age: 2, food: 3 }, 'child2': { age: 5, food: 1 } },
      population: { 'Bob': { food: 2, grain: 0, isInjured: 1, name:'Bob'}, 
                  'Alice': { food: 0, grain: 2, isInjured: 1, name:'Alice' }, 
                  'Charlie': { food: 4, name:'Charlie', grain: 2, isInjured: 0 } ,
                  'person1': { name: 'person1', isInjured: 1, food: 1, grain: 1, "chief": true },
                  'person2': { name: 'person2', isInjured: 0, food: 0, grain: 0 }
                },
      demand: false,
      violence: false,
      reproductionRound: true,
      needChanceRoll: false,
      currentLocationName: 'marsh'
    };
    // Mock functions
    text.addMessage = jest.fn();
    killlib.kill = jest.fn();
  });

  test('should return "Not a member" for non-existing member', () => {
    expect(m.migrate('Unknown', 'hills', true, gameState)).toBe("Not a member");
  });

  test('should return "not a chief" if not chief and trying to force migration', () => {
    expect(m.migrate('Bob', 'hills', true, gameState)).toBe("not a chief");
  });

  test('should return "no destination" if no destination provided', () => {
    expect(m.migrate('Bob', '', false, gameState)).toBe("no destination");
  });

  test('should return "blocked by demand" if there is demand or violence', () => {
    gameState.demand = true;
    expect(m.migrate('Bob', 'hills', false, gameState)).toBe("blocked by demand");
  });

  test('should return "not reproduction round" if not in reproduction round', () => {
    gameState.reproductionRound = false;
    expect(m.migrate('Bob', 'hills', false, gameState)).toBe("not reproduction round");
  });

  test('should return "waiting for chance" if needChanceRoll is true', () => {
    gameState.needChanceRoll = true;
    expect(m.migrate('Bob', 'hills', false, gameState)).toBe("waiting for chance");
  });


test('migration with force set to true', () => {
    const sourceName = 'person1';
    const destination = 'hills';
    const force = true;

    const result = m.migrate(sourceName, destination, force, gameState);

    expect(result).toBe(0);
    expect(gameState.currentLocationName).toBe('hills');
    
    // Check if food was consumed correctly for injured person
    expect(gameState.population['person1'].food).toBe(0);
    expect(gameState.population['person1'].grain).toBe(0);

    // Check if child consumed food
    expect(gameState.children['child1'].food).toBe(1);

    // Check if killlib.kill was called for deceased members
    expect(killlib.kill).toHaveBeenCalledTimes(0); // No one should die in this setup
    
    // Check messages added to gameState
    expect(text.addMessage).toHaveBeenCalledWith(gameState, "tribe", expect.stringContaining("Finding a route to hills"));
    expect(text.addMessage).toHaveBeenCalledWith(gameState, "tribe", expect.stringContaining("Setting the current location to hills"));
});

test('migration with force set to false', () => {
    const sourceName = 'person1';
    const destination = 'hills';
    const force = false;

    const result = m.migrate(sourceName, destination, force, gameState);

    expect(result).toBe(1);
    expect(gameState.currentLocationName).toBe('marsh'); // Location should not change

    // Check if messages were logged correctly
    expect(text.addMessage).toHaveBeenCalledWith(gameState, sourceName, expect.stringContaining("The following tribe members would die on the journey to hills"));
    expect(text.addMessage).toHaveBeenCalledWith(gameState, sourceName, expect.stringContaining("The following children would die along the way"));
    
    // Ensure no one was actually killed
    expect(killlib.kill).not.toHaveBeenCalled();
});

test('migration where people die', () => {
    gameState.population = {
        'person1': { name: 'person1', isInjured: 1, food: 0, grain: 0, chief: true }
    };
    gameState.children = {
        'child1': { name: 'child1', age: 2, food: 0 }
    };
    const sourceName = 'person1';
    const destination = 'hills';
    const force = true;

    const result = m.migrate(sourceName, destination, force, gameState);

    expect(result).toBe(0);
    expect(gameState.currentLocationName).toBe('hills');

    // Check if kill was called for both person and child
    expect(killlib.kill).toHaveBeenCalledTimes(2);
    expect(text.addMessage).toHaveBeenCalledWith(gameState, "tribe", expect.stringContaining("The following people died along the way"));
});
