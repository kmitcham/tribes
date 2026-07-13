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

test('assignment ages include unborn (-0.5y) through 11.5y; adults pruned', () => {
  var population = {
    EncinoMan: {
      name: 'EncinoMan',
      guarding: ['Unborn', 'Ayo', 'Baibee', 'AdultKid'],
    },
  };
  var children = {
    Unborn: {
      name: 'Unborn',
      mother: 'Mom',
      age: -1, // -0.5 years — assignable in work, born in food
    },
    Ayo: {
      name: 'Ayo',
      mother: 'Mom',
      age: 23, // 11.5 years — still assignable / threat-eligible until 24
      guardians: { EncinoMan: 2 },
    },
    Baibee: {
      name: 'Baibee',
      mother: 'Mom',
      age: 4,
    },
    AdultKid: {
      name: 'AdultKid',
      mother: 'Mom',
      age: 24, // adult — must be pruned
    },
  };

  expect(lib.isChildGuardAssignable(children.Unborn)).toBe(true);
  expect(lib.isChildGuardAssignable(children.Ayo)).toBe(true);
  expect(lib.isChildGuardAssignable(children.AdultKid)).toBe(false);

  expect(lib.isChildGuardThreatEligible(children.Unborn)).toBe(false);
  expect(lib.isChildGuardThreatEligible(children.Ayo)).toBe(true);
  expect(lib.isChildGuardThreatEligible(children.AdultKid)).toBe(false);

  lib.normalizeGuardAssignments(population, children);

  // Unborn + Ayo + Baibee stay on the list; adult dropped.
  expect(population.EncinoMan.guarding).toEqual(['Unborn', 'Ayo', 'Baibee']);
  // Threat scores ignore unborn so they do not dilute Baibee/Ayo.
  expect(lib.findGuardValueForChild('Baibee', population, children)).toBe(0.5);
  expect(lib.findGuardValueForChild('Ayo', population, children)).toBe(0.5);
  expect(lib.findGuardValueForChild('Unborn', population, children)).toBe(0);
  expect(lib.findGuardValueForChild('AdultKid', population, children)).toBe(0);
});

test('issue #136: releaseChildFromAllGuards removes one child and deletes empty lists', () => {
  var population = {
    A: { name: 'A', guarding: ['OnlyKid'] },
    B: { name: 'B', guarding: ['OnlyKid', 'Other'] },
  };
  lib.releaseChildFromAllGuards('OnlyKid', population);
  expect(population.A.guarding).toBeUndefined();
  expect(population.B.guarding).toEqual(['Other']);
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
  const attackMatch = response.match(/attacks\s+([A-Za-z][A-Za-z0-9_-]*)/);
  expect(attackMatch).toBeTruthy();
  target = attackMatch[1];
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
  expect(lib.findGuardValueForChild('c1', population, children)).toBe(3);
  expect(children['c1'].guardians).toBeTruthy();
  expect(Object.keys(children['c1'].guardians).length).toBe(3);
  expect(response.indexOf('p1')).toBeGreaterThan(0);
  if (response.indexOf('slips') > 0) {
    expect(response.indexOf('p2')).toBeGreaterThan(0);
  }
});

test('normalizes guarding lists by dropping adults (age 24+)', () => {
  var population = {
    EncinoMan: {
      name: 'EncinoMan',
      guarding: ['Ayo', 'Baibee', 'Grown'],
    },
  };
  var children = {
    Ayo: {
      age: 23, // 11.5y — still needs protection until adulthood
      name: 'Ayo',
    },
    Baibee: {
      age: 22,
      name: 'Baibee',
    },
    Grown: {
      age: 24,
      name: 'Grown',
    },
  };

  expect(lib.findGuardValueForChild('Grown', population, children)).toBe(0);
  expect(population.EncinoMan.guarding).toEqual(['Ayo', 'Baibee']);
  expect(lib.findGuardValueForChild('Ayo', population, children)).toBe(0.5);
  expect(lib.findGuardValueForChild('Baibee', population, children)).toBe(0.5);
  expect(children.Baibee.guardians).toEqual({ EncinoMan: 2 });
});
