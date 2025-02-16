const sum = require('./sum');

test('adds 1 + 2 to equal 3', () => {
  expect(sum(1, 2)).toBe(3);
});




//const migrate = require("../libs/migrateLib")

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

  // test('should return "Not a member" for non-existing member', () => {
  //   expect(migrate('Unknown', 'Mountain', true, gameState)).toBe("Not a member");
  // });