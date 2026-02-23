var childlib = require('../libs/children.js');
console.log = jest.fn();

test('Display new adults also', () => {
  var gameState = {
    population: {
      m1: { name: 'm1' },
      f1: { name: 'f1' },
    },
  };
  var children = {
    c1: {
      mother: 'm1',
      father: 'f1',
      age: 34,
      name: 'c1',
      food: 2,
      gender: 'male',
    },
    c2: {
      mother: 'm2',
      father: 'f2',
      age: 32,
      name: 'c3',
      food: 2,
      gender: 'male',
    },
    c3: {
      mother: 'm1',
      father: 'f2',
      age: 30,
      name: 'c3',
      food: 2,
      gender: 'male',
    },
  };
  var gameState = {
    population: {
      m1: { name: 'm1' },
      m2: { name: 'm2' },
      f2: { name: 'f2' },
      f1: { name: 'f1' },
    },
    children: children,
  };
  actualMessages = childlib.showChildren(children, gameState);
  const actualMessage = actualMessages.join();
  expect(actualMessage.indexOf('Unborn')).toBe(-1);
  expect(actualMessage.indexOf('Children')).toBe(-1);
  expect(actualMessage.indexOf('New Adults')).toBeGreaterThan(-1);
  expect(actualMessage.indexOf('c1')).toBeGreaterThan(-1);
  expect(actualMessage.indexOf('c2')).toBeGreaterThan(-1);
  expect(actualMessage.indexOf('c3')).toBeGreaterThan(-1);
});
test('filter mixed ages', () => {
  var children = {
    c1: {
      mother: 'm1',
      father: 'f1',
      age: 24,
      name: 'c1',
      food: 2,
      gender: 'male',
    },
    c2: {
      mother: 'm2',
      father: 'f2',
      age: 4,
      name: 'c3',
      food: 2,
      gender: 'male',
    },
    c3: {
      mother: 'm1',
      father: 'f2',
      age: -1,
      name: 'c3',
      food: 2,
      gender: 'male',
    },
  };
  var gameState = {
    population: {
      m1: { name: 'm1' },
      m2: { name: 'm2' },
      f2: { name: 'f2' },
      f1: { name: 'f1' },
    },
    children: children,
    messages: {},
  };
  actualMessage = childlib.showChildren(children, gameState, 'm1').join();
  expect(actualMessage.indexOf('Unborn')).toBeGreaterThan(-1);
  expect(actualMessage.indexOf('Adults')).toBeGreaterThan(-1);
  expect(actualMessage.indexOf('Children')).toBe(-1);
  expect(actualMessage.indexOf('c1')).toBeGreaterThan(-1);
  expect(actualMessage.indexOf('c2')).toBe(-1);
  expect(actualMessage.indexOf('c3')).toBeGreaterThan(-1);
});

test('Check sorting', () => {
  var children = {
    Achild: {
      mother: 'm1',
      father: 'f1',
      age: 14,
      name: 'A',
      food: 2,
      gender: 'male',
    },
    Bchild: {
      mother: 'm2',
      father: 'f2',
      age: 14,
      name: 'B',
      food: 2,
      gender: 'male',
    },
    Cchild: {
      mother: 'm1',
      father: 'f2',
      age: -1,
      name: 'C',
      food: 2,
      gender: 'male',
    },
  };
  var gameState = {
    population: {
      m1: { name: 'm1' },
      m2: { name: 'm2' },
      f2: { name: 'f2' },
      f1: { name: 'f1' },
    },
    children: children,
  };
  actualMessage = childlib.showChildren(children, gameState).join();
  alocation = actualMessage.indexOf('Achild');
  blocation = actualMessage.indexOf('Bchild');
  clocation = actualMessage.indexOf('Cchild');
  expect(alocation).toBeGreaterThan(-1);
  expect(blocation).toBeGreaterThan(-1);
  expect(clocation).toBeGreaterThan(-1);
  expect(alocation).toBeGreaterThan(blocation);
  expect(blocation).toBeGreaterThan(clocation);
  expect(alocation).toBeGreaterThan(clocation);
});

test('prep with hungry', () => {
  var children = {
    c1: {
      mother: 'm1',
      father: 'f1',
      age: 24,
      name: 'c1',
      food: 2,
      gender: 'male',
    },
    c2: {
      mother: 'm2',
      father: 'f2',
      age: 4,
      name: 'c3',
      food: 0,
      gender: 'male',
    },
    c3: {
      mother: 'm1',
      father: 'f2',
      age: -1,
      name: 'c3',
      food: 0,
      gender: 'male',
    },
  };
  var gameState = {
    population: {
      m1: { name: 'm1' },
      m2: { name: 'm2' },
      f2: { name: 'f2' },
      f1: { name: 'f1' },
    },
    children: children,
    messages: {},
  };
  //function showChildrenPrep(gameState, displayName, onlyHungry, filterParentName ){
  childlib.showChildrenPrep(gameState, 'm1', 'hungry', null);
  actualMessages = gameState.messages['m1'];
  expect(actualMessages).toContain('c3');
  expect(actualMessages).not.toContain('c1');
});

test('prep with mother filter', () => {
  var children = {
    c1: {
      mother: 'm1',
      father: 'f1',
      age: 24,
      name: 'c1',
      food: 2,
      gender: 'male',
    },
    c2: {
      mother: 'm2',
      father: 'f2',
      age: 4,
      name: 'c3',
      food: 0,
      gender: 'male',
    },
    c3: {
      mother: 'm1',
      father: 'f2',
      age: -1,
      name: 'c3',
      food: 0,
      gender: 'male',
    },
  };
  var gameState = {
    population: {
      m1: { name: 'm1' },
      m2: { name: 'm2' },
      f2: { name: 'f2' },
      f1: { name: 'f1' },
    },
    children: children,
    messages: {},
  };
  //function showChildrenPrep(gameState, displayName, onlyHungry, filterParentName ){
  childlib.showChildrenPrep(gameState, 'm1', null, 'm1');
  actualMessages = gameState.messages['m1'];
  expect(actualMessages).toContain('c1');
  expect(actualMessages).not.toContain('c2');
});

test('prep with father filter', () => {
  var children = {
    c1: {
      mother: 'm1',
      father: 'f1',
      age: 24,
      name: 'c1',
      food: 2,
      gender: 'male',
    },
    c2: {
      mother: 'm2',
      father: 'f2',
      age: 4,
      name: 'c3',
      food: 0,
      gender: 'male',
    },
    c3: {
      mother: 'm1',
      father: 'f2',
      age: -1,
      name: 'c3',
      food: 0,
      gender: 'male',
    },
  };
  var gameState = {
    population: {
      m1: { name: 'm1', gender: 'female' },
      m2: { name: 'm2', gender: 'female' },
      f2: { name: 'f2', gender: 'male' },
      f1: { name: 'f1', gender: 'male' },
    },
    children: children,
    messages: {},
  };
  childlib.showChildrenPrep(gameState, 'm1', null, 'f1');
  actualMessages = gameState.messages['m1'];
  expect(actualMessages).toContain('impossible');
  expect(actualMessages).not.toContain('c1');
});

test('prep with no filter', () => {
  var children = {
    c1: {
      mother: 'm1',
      father: 'f1',
      age: 24,
      name: 'c1',
      food: 2,
      gender: 'male',
    },
    c2: {
      mother: 'm2',
      father: 'f2',
      age: 4,
      name: 'c3',
      food: 0,
      gender: 'male',
    },
    c3: {
      mother: 'm1',
      father: 'f2',
      age: -1,
      name: 'c3',
      food: 0,
      gender: 'male',
    },
  };
  var gameState = {
    population: {
      m1: { name: 'm1' },
      m2: { name: 'm2' },
      f2: { name: 'f2' },
      f1: { name: 'f1' },
    },
    children: children,
    messages: {},
  };
  //function showChildrenPrep(gameState, displayName, onlyHungry, filterParentName ){
  childlib.showChildrenPrep(gameState, 'm1', null, null);
  actualMessages = gameState.messages['m1'];
  expect(actualMessages).toContain('c1');
  expect(actualMessages).toContain('c2');
  expect(actualMessages).toContain('c3');
});
