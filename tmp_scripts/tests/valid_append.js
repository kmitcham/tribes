const fs = require('fs');
let code = fs.readFileSync('tests/reproduction.test.js', 'utf8');

const t = "\n" + `
test('migrateToResponseDict works correctly backwards compat', () => {
  var person = {
    name: 'p1',
    consentList: ['p2', 'p3'],
    declineList: ['p4']
  };
  reproLib.migrateToResponseDict(person);
  expect(person.responseDict).toBeDefined();
  expect(person.responseDict['p2']).toBe('consent');
  expect(person.responseDict['p3']).toBe('consent');
  expect(person.responseDict['p4']).toBe('decline');
});

test('handleRomanceResponse correctly sets consent and decline in responseDict', () => {
  var gameState = {
    population: {
      p1: { name: 'p1', activity: 'reproduction', responseDict: {} }
    }
  };
  reproLib.handleRomanceResponse(gameState, 'p1', 'p2', 'consent');
  expect(gameState.population.p1.responseDict['p2']).toBe('consent');
});

test('globalMatingCheck resolves maybe to wait if target response is undefined', () => {
  var gameState = {
    population: {
      p1: { name: 'p1', gender: 'male', activi      p1: { ntion', inviteList: ['p2'], inviteIndex: 0, responseDic      p1: { name::       p1: { name: 'p1', gender: 'male', activi      p1: { ntion', in: [      p1: { na: 0      p1: { na:       p1: { name: 'sages: { p1:      p1: { name: 'p1tivity:       p1: { name: 'p1', gender: 'male', in      p1: { name: 'p1', gender: 'male', e.messages['p1']).toContain('wait');
});

test('globalMatingCheck resolves consent directly dictionary', () => {
  var gameState = {
    population: {
      p1: { name: 'p1', gender: 'male', activity: 'reproduction', inviteList: ['p2'], inviteIndex: 0, responseDict: {} },
      p2: { name: 'p2', gender: 'female', activity: 'reproduction', inviteList: [], inviteIndex: 0, responseDict: { p1: 'consent' }, cannotInvite: false }
    },
    messages: { p1: '', p2: '' },
    activity: 'reproduction'
  };
  reproLib.globalMatingCheck(gameState, {});
  expect(gameState.messages['p1']).toContain('mates with');
});

test('globalMatingCheck resolves decline directly dictionary', () => {
  var gameState = {
    population: {
      p1: { name: 'p1', gender: 'male', activity: 'reproduction', inviteList: ['p2'], inviteIndex: 0, responseDict: {} },
      p2: { name: 'p2', gender: 'female', activity: 'reproduction', inviteList: [], inviteIndex: 0, responseDict: { p1: 'decline' } }
    },
    messages: { p1: '', p2: '' },
    activity: 'reproduction'
  };
  reproLib.globalMatingCheck(gameState, {});
  expect(gameState.messages['p1']).toContain('not interested');
});
`;

fs.writeFileSync('tests/reproduction.test.js', code + t);
