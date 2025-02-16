const m = require("../libs/migrateLib")

  let gameState;

  beforeEach(() => {
    gameState = {
      children: { 'child1': { age: 2, food: 3 }, 'child2': { age: 5, food: 1 } },
      population: { 'Bob': { food: 2, grain: 0, isInjured: 1 }, 'Alice': { food: 0, grain: 2, isInjured: 1 }, 'Charlie': { food: 4, grain: 2, isInjured: 0 } },
      demand: false,
      violence: false,
      reproductionRound: true,
      needChanceRoll: false,
      currentLocationName: 'Forest'
    };
  });

  test('should return "Not a member" for non-existing member', () => {
    expect(m.migrate('Unknown', 'Mountain', true, gameState)).toBe("Not a member");
  });

  test('should return "not a chief" if not chief and trying to force migration', () => {
    expect(m.migrate('Bob', 'Mountain', true, gameState)).toBe("not a chief");
  });

  test('should return "no destination" if no destination provided', () => {
    expect(m.migrate('Bob', '', false, gameState)).toBe("no destination");
  });

  test('should return "blocked by demand" if there is demand or violence', () => {
    gameState.demand = true;
    expect(m.migrate('Bob', 'Mountain', false, gameState)).toBe("blocked by demand");
  });

  test('should return "not reproduction round" if not in reproduction round', () => {
    gameState.reproductionRound = false;
    expect(m.migrate('Bob', 'Mountain', false, gameState)).toBe("not reproduction round");
  });

  test('should return "waiting for chance" if needChanceRoll is true', () => {
    gameState.needChanceRoll = true;
    expect(m.migrate('Bob', 'Mountain', false, gameState)).toBe("waiting for chance");
  });

