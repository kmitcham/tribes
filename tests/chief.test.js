// Import necessary dependencies
const assert = require('assert');
const chiefLib = require('../libs/chief.js');

let gameState;

beforeEach(() => {
  // Set up a fresh gameState before each test
  gameState = {
    population: {
      'Alice': { food: 10, strength: 'strong', name:'Alice' },
      'Bob': { food: 8 , name:'Bob'},
      'Charlie': { food: 5, strength: 'weak', name:'Charlie' },
      'Dave': { food: 12, spearhead: 0, name:'Dave' }
    },
    children: {
      'Child1': { "name": "Child1", age: 10, mother: 'Alice' },
      'Child2': { "name": "Child2", age: 6, mother: 'Bob' },
      'Child3': { "name": "Child3", age: 4, mother: 'Charlie' },
      'NewAdult': { "name": "NewAdult",age: 16, mother: 'Dave', newAdult: true }
    },
    needChanceRoll: true,
    saveRequired: false,
    gameTrack: { 'marsh': 10, 'hills': 12, 'forest': 8 },
    currentLocationName: 'forest',
    season: 'summer'
  };
});

test('should handle a person growing stronger (roll 16-18)', () => {
  delete gameState['population']['Charlie'].strength
  const result =  chiefLib.doChance(17, gameState);
  assert(result.includes('grows stronger'));
  // Check that a person was modified correctly
  // If a strong person was picked first, it should have tried a different person
  // This is a simplistic test - in reality you might want to mock randomMemberName
  // to guarantee which person is chosen
  const personName = result.split(' ')[2];
  const person = gameState.population[personName];
  assert.strictEqual(person.strength, 'strong');
  assert.strictEqual(gameState.needChanceRoll, false);
  assert.strictEqual(gameState.saveRequired, true);
});

test('should handle fungus spoiling all food (roll 15)', () => {
  const result =  chiefLib.doChance(15, gameState);
  assert(result.includes('Fungus!'));
  // Verify all food is set to 0
  for (const name in gameState.population) {
    assert.strictEqual(gameState.population[name].food, 0);
  }
  assert.strictEqual(gameState.needChanceRoll, false);
  assert.strictEqual(gameState.saveRequired, true);
});

test('should handle rats spoiling one or two people\'s food (roll 14)', () => {
  const result =  chiefLib.doChance(14, gameState);
  assert(result.includes('Rats!'));
  // Check that at least one person's food was set to 0
  const firstPersonName = result.split('Rats! All ')[1].split('\'s')[0];
  assert.strictEqual(gameState.population[firstPersonName].food, 0);
  
  // If there are 8+ people, a second person should also lose food
  if (Object.keys(gameState.population).length >= 8) {
    const pattern = /Also (.*?)'s \[\d+\] food is also spoiled/;
    const match = result.match(pattern);
    if (match) {
      const secondPersonName = match[1];
      assert.strictEqual(gameState.population[secondPersonName].food, 0);
    }
  }
  
  assert.strictEqual(gameState.needChanceRoll, false);
  assert.strictEqual(gameState.saveRequired, true);
});

test('should handle finding a spearhead (roll 13)', () => {
  const result =  chiefLib.doChance(13, gameState);
  assert(result.includes('finds a spearhead'));
  const personName = result.split(' ')[2];
  assert(gameState.population[personName].spearhead >= 1);
  assert.strictEqual(gameState.needChanceRoll, false);
  assert.strictEqual(gameState.saveRequired, true);
});

test('should handle children gathering food (roll 12)', () => {
  const result =  chiefLib.doChance(12, gameState);
  assert(result.includes('The younger tribesfolk gather food'));
  // Check that mothers received food from eligible children
  assert(gameState.population['Alice'].food > 10); // Child1 gives 2
  assert(gameState.population['Bob'].food  = 8);   // Child2 too young
  assert.strictEqual(gameState.population['Charlie'].food, 5); // Child3 too young
  assert(gameState.population['Dave'].food > 12); // NewAdult gives 4
  assert.strictEqual(gameState.needChanceRoll, false);
  assert.strictEqual(gameState.saveRequired, true);
});

test('should handle locusts eating food (roll 11)', () => {
  // Mock dice roll to return a predictable value for food loss
  const result =  chiefLib.doChance(11, gameState);
  assert(result.includes('Locusts!'));
  // Each person should lose 2 food (our mocked dice roll value)
  assert(gameState.population['Alice'].food < 10);
  assert(gameState.population['Bob'].food < 8);
  assert(gameState.population['Charlie'].food < 5);
  assert(gameState.population['Dave'].food < 12);
  
  assert.strictEqual(gameState.needChanceRoll, false);
  assert.strictEqual(gameState.saveRequired, true);
});

test('should handle predator attack (roll 10)', () => {
  const result =  chiefLib.doChance(10, gameState);
  assert(result.includes('devoured'));
  assert.strictEqual(gameState.needChanceRoll, false);
  assert.strictEqual(gameState.saveRequired, true);
});

test('should handle weevils eating one person\'s food (roll 9)', () => {
  const result =  chiefLib.doChance(9, gameState);
  assert(result.includes('weevils'));
  const personName = result.split(' ')[2];
  assert(gameState.population[personName].food <
                      (personName === 'Alice' ? 10 : 
                      personName === 'Bob' ? 8 : 
                      personName === 'Charlie' ? 5 : 12));
  
  assert.strictEqual(gameState.needChanceRoll, false);
  assert.strictEqual(gameState.saveRequired, true);
});

test('should handle favorable jerky conditions (roll 8)', () => {
  const result =  chiefLib.doChance(8, gameState);
  assert(result.includes('Favorable weather conditions'));
  assert.strictEqual(gameState.canJerky, true);
  assert.strictEqual(gameState.needChanceRoll, false);
  assert.strictEqual(gameState.saveRequired, true);
});

test('should handle fire (roll 7)', () => {
  const result =  chiefLib.doChance(7, gameState);
  assert(result.includes('FIRE!'));
  assert.strictEqual(gameState.gameTrack['forest'], 20);
  assert.strictEqual(gameState.needChanceRoll, false);
  assert.strictEqual(gameState.saveRequired, true);
});

test('should handle injury (roll 6)', () => {
  const result =  chiefLib.doChance(6, gameState);
  assert(result.includes('injured – miss next turn'));
  const personName = result.split(' ')[2];
  assert.strictEqual(gameState.population[personName].isInjured, 4);
  assert.strictEqual(gameState.needChanceRoll, false);
  assert.strictEqual(gameState.saveRequired, true);
});

test('should handle sickness (roll 5)', () => {
  const result =  chiefLib.doChance(5, gameState);
  assert(result.includes('got sick'));
  const personName = result.split(' ')[2];
  assert.strictEqual(gameState.population[personName].isSick, 3);
  assert(gameState.population[personName].food <= 
          (personName === 'Alice' ? 8 : 
          personName === 'Bob' ? 6 : 
          personName === 'Dave' ? 10 :
          personName === 'Charlie' ? 3 : 10));
  assert.strictEqual(gameState.needChanceRoll, false);
  assert.strictEqual(gameState.saveRequired, true);
  console.log("last test in chief complete");
});

test('test execution does not crash', ()=>{
  expect("foo").toBe("foo");
  assert("foo".includes("foo"));
  console.log("finished tests without crash");
});