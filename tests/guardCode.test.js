const lib = require('../libs/guardCode.js');
console.log = jest.fn();

test('simple watch cases', () => {
  var population = {
    p1: {
      name: 'p1',
      worked: false,
      isInjured: false,
      guarding: ['c1'],
      nursing: ['Ilima'],
      activity: 'gather',
    },
    p2: {
      name: 'p2',
      worked: false,
      isInjured: false,
      guarding: [],
      activity: 'gather',
    },
  };
  var children = {
    c1: {
      mother: 'p1',
      father: 'p2',
      age: 3,
      name: 'c1',
    },
    unwatched: {
      mother: 'p1',
      father: 'p2',
      age: 3,
      name: 'unwatched',
    },
  };
  expect(lib.findGuardValueForChild('c1', population, children)).toBe(1);
  expect(lib.findGuardValueForChild('unwatched', population, children)).toBe(0);
  expect(children['c1'].guardians).toBeTruthy();
  expect(Object.keys(children['c1'].guardians).length).toBe(1);
});

test('finds least watched', () => {
  var population = {
    p1: {
      name: 'p1',
      worked: false,
      isInjured: false,
      guarding: ['c1'],
      nursing: ['Ilima'],
      activity: 'gather',
    },
    p2: {
      name: 'p2',
      worked: false,
      isInjured: false,
      guarding: [],
      activity: 'gather',
    },
  };
  var children = {
    c1: {
      mother: 'p1',
      father: 'p2',
      age: 3,
      name: 'c1',
    },
    unwatched: {
      mother: 'p1',
      father: 'p2',
      age: 2,
      name: 'unwatched',
    },
  };
  expect(lib.findLeastGuarded(children, population)).toBe(
    'unwatched is least watched. Watch score = 0'
  );
});
test('babysitter', () => {
  var population = {
    p1: {
      name: 'p1',
      worked: false,
      isInjured: false,
      guarding: ['c1'],
      nursing: ['Ilima'],
      activity: 'gather',
    },
    p2: {
      name: 'p2',
      worked: false,
      isInjured: false,
      guarding: ['c1'],
      activity: 'gather',
    },
  };
  var children = {
    c1: {
      mother: 'p1',
      father: 'p2',
      age: 3,
      name: 'c1',
    },
    sitter: {
      mother: 'p1',
      father: 'p2',
      newAdult: true,
      age: 30,
      babysitting: 'c1',
      name: 'sitter',
    },
  };
  expect(lib.findGuardValueForChild('c1', population, children)).toBe(3);
  expect(children['c1'].guardians).toBeTruthy();
  expect(Object.keys(children['c1'].guardians).length).toBe(3);
});

test('devours unwatched child', () => {
  var gameState = {
    currentLocationName: 'marsh',
    population: {
      p1: {
        name: 'p1',
        worked: false,
        isInjured: false,
        guarding: ['c1'],
        nursing: ['Ilima'],
        activity: 'gather',
      },
      p2: {
        name: 'p2',
        worked: false,
        isInjured: false,
        guarding: ['c1'],
        activity: 'gather',
      },
    },
    children: {
      c1: {
        mother: 'p1',
        father: 'p2',
        age: 3,
        name: 'c1',
      },
      sitter: {
        mother: 'p1',
        father: 'p2',
        newAdult: true,
        age: 23,
        babysitting: 'c1',
        name: 'sitter',
      },
      unwatched: {
        mother: 'p1',
        father: 'p2',
        age: 2,
        name: 'unwatched',
      },
    },
    round: 'reproduction',
  };
  var children = gameState['children'];
  var population = gameState['population'];
  response = lib.hyenaAttack(children, gameState);
  expect(lib.findGuardValueForChild('c1', population, children)).toBe(3);
  expect(children['c1'].guardians).toBeTruthy();
  expect(Object.keys(children['c1'].guardians).length).toBe(3);
  expect(lib.findGuardValueForChild('unwatched', population, children)).toBe(0);
  msgArray = response.split(' ');
  target = msgArray[3];
  expect(target.indexOf('unwatched')).toBeGreaterThan(-1);
  devoured = response.indexOf('devoured');
  expect(devoured).toBeGreaterThan(0);
});

// test case: only unborn children
// test case: many guards on a child (no mock rolls yet, though)
test('multi-watch checks each guard', () => {
  var gameState = {
    currentLocationName: 'marsh',
    population: {
      p1: {
        name: 'p1',
        worked: false,
        isInjured: false,
        guarding: ['c1', 'cx', 'cxx', 'cxxx', 'cxxxx', 'cy'],
        nursing: ['Ilima'],
      },
      p2: {
        name: 'p2',
        worked: false,
        isInjured: false,
        guarding: ['c1'],
      },
    },
    children: {
      c1: {
        mother: 'p1',
        father: 'p2',
        age: 3,
        name: 'c1',
      },
      sitter: {
        mother: 'p1',
        father: 'p2',
        newAdult: true,
        age: 24,
        babysitting: 'c1',
        name: 'sitter',
      },
    },
    round: 'reproduction',
  };
  var children = gameState['children'];
  var population = gameState['population'];
  response = lib.hyenaAttack(children, gameState);
  //console.log('base response '+response)
  expect(lib.findGuardValueForChild('c1', population, children)).toBeLessThan(
    3
  );
  expect(children['c1'].guardians).toBeTruthy();
  expect(Object.keys(children['c1'].guardians).length).toBe(3);
  expect(response.indexOf('p1')).toBeGreaterThan(0);
  if (response.indexOf('slips') > 0) {
    expect(response.indexOf('p2')).toBeGreaterThan(0);
  }
});
