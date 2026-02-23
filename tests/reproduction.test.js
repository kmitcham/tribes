var reproLib = require('../libs/reproduction.js');
const allNames = require('../libs/names.json');
console.log = jest.fn();

test('excludes people', () => {
  var gameState = {
    population: {
      p1: {
        name: 'p1',
        gender: 'male',
        activity: 'gather',
      },
      p2: {
        name: 'p2',
        gender: 'female',
      },
      p3: {
        name: 'p3',
        gender: 'male',
      },
      p4: {
        name: 'p4',
        gender: 'female',
        isPregnant: 'anyChild',
      },
    },
    round: 'reproduction',
  };
  response = reproLib.eligibleMates('p1', gameState.population, false);
  expect(response).toBe('p2');
});
test('makes a list', () => {
  var gameState = {
    population: {
      p1: {
        name: 'p1',
        gender: 'female',
        activity: 'gather',
      },
      p2: {
        name: 'p2',
        gender: 'male',
      },
      p3: {
        name: 'p3',
        gender: 'male',
      },
      p4: {
        name: 'p4',
        gender: 'male',
      },
    },
    round: 'reproduction',
  };
  response = reproLib.eligibleMates('p1', gameState.population, false);
  expect(response).toBe('p2 p3 p4');
});

test('valid mates', () => {
  var p1 = {
    name: 'p1',
    gender: 'female',
    activity: 'gather',
  };
  var p2 = { name: 'p2', gender: 'male' };
  response = reproLib.matingObjections(p1, p2);
  expect(response).toBe('');
});
test('same gender mates', () => {
  var p1 = {
    name: 'p1',
    gender: 'female',
    activity: 'gather',
  };
  var p2 = { name: 'p2', gender: 'female' };
  response = reproLib.matingObjections(p1, p2);
  expect(response).toBe('p1 is the same gender as p2.\n');
});

test('pregnant mates', () => {
  var p1 = {
    name: 'p1',
    gender: 'female',
    isPregnant: true,
    activity: 'gather',
  };
  var p2 = { name: 'p2', gender: 'male' };
  var response = reproLib.matingObjections(p1, p2);
  expect(response).toBe('');
  var response = reproLib.matingObjections(p2, p1);
  expect(response).toBe('');
});
test('Mating objections happy path', () => {
  p1 = {
    name: 'p1',
    gender: 'female',
  };
  p2 = {
    name: 'p2',
    gender: 'male',
  };
  var response = reproLib.matingObjections(p1, p2);
  expect(response).toBe('');
});
test('Mating objections fail', () => {
  p1 = {
    name: 'p1',
    gender: 'female',
    isPregnant: 'someKid',
  };
  p2 = {
    name: 'p2',
    gender: 'male',
  };
  p3 = {
    name: 'p3',
    gender: 'male',
  };
  var response = reproLib.matingObjections(p2, p3);
  expect(response).toBe('p2 is the same gender as p3.\n');
  response = reproLib.matingObjections(p1, p2);
  expect(response).toBe('');
  response = reproLib.matingObjections(p2, p1);
  expect(response).toBe('');
  response = reproLib.matingObjections(p1, p1);
  expect(response).toBe('p1 is the same gender as p1.\n');
});
test('make a consentList, happy path', () => {
  var gameState = {
    population: {
      p1: {
        name: 'p1',
        gender: 'female',
      },
      p2: {
        name: 'p2',
        gender: 'male',
      },
      p3: {
        name: 'p3',
        gender: 'male',
      },
      p4: {
        name: 'p4',
        gender: 'male',
      },
    },
    round: 'reproduction',
  };
  //function handleReproductionList(actorName, args, listName, gameState, bot){
  response = reproLib.handleReproductionList(
    'p1',
    ['p2', 'p4'],
    'consentList',
    gameState,
    {}
  );
  expect(gameState['population']['p1']['consentList']).toStrictEqual([
    'p2',
    'p4',
  ]);
});
test('make a consentList, with pass', () => {
  var gameState = {
    population: {
      p1: {
        name: 'p1',
        gender: 'female',
      },
      p2: {
        name: 'p2',
        gender: 'male',
      },
      p3: {
        name: 'p3',
        gender: 'male',
      },
      p4: {
        name: 'p4',
        gender: 'female',
      },
    },
    round: 'reproduction',
  };
  //function handleReproductionList(actorName, args, listName, gameState, bot){
  response = reproLib.handleReproductionList(
    'p1',
    ['p2', 'p4', '!pass', 'p3'],
    'consentList',
    gameState,
    {}
  );
  expect(response).toContain('p1 is the same gender as p4');
  expect(response).toContain('!pass is only valid in the inviteList');
});
test('make a invitelist, with pass', () => {
  var gameState = {
    population: {
      p1: {
        name: 'p1',
        gender: 'female',
      },
      p2: {
        name: 'p2',
        gender: 'male',
      },
      p3: {
        name: 'p3',
        gender: 'male',
      },
      p4: {
        name: 'p4',
        gender: 'female',
      },
    },
    round: 'reproduction',
  };
  //function handleReproductionList(actorName, args, listName, gameState, bot){
  expectedList = ['p2', 'p3', '!pass'];
  response = reproLib.handleReproductionList(
    'p1',
    expectedList,
    'inviteList',
    gameState,
    {}
  );
  exp = 'Setting your inviteList list to:p2,p3,!pass\n';
  expect(response).toBe(exp);
  expect(gameState['population']['p1']['inviteList']).toStrictEqual(
    expectedList
  );
});

test('make a invitelist, with Pass', () => {
  var gameState = {
    population: {
      p1: {
        name: 'p1',
        gender: 'female',
      },
      p2: {
        name: 'p2',
        gender: 'male',
      },
      p3: {
        name: 'p3',
        gender: 'male',
      },
      p4: {
        name: 'p4',
        gender: 'female',
      },
    },
    round: 'reproduction',
  };
  //function handleReproductionList(actorName, args, listName, gameState, bot){
  expectedList = ['p2', 'p3', '!Pass'];
  response = reproLib.handleReproductionList(
    'p1',
    expectedList,
    'inviteList',
    gameState,
    {}
  );
  exp = 'Setting your inviteList list to:p2,p3,!Pass\n';
  expect(response).toBe(exp);
  expect(gameState['population']['p1']['inviteList']).toStrictEqual(
    expectedList
  );
});

test('make a inviteList, with pass error', () => {
  var gameState = {
    population: {
      p1: {
        name: 'p1',
        gender: 'female',
      },
      p2: {
        name: 'p2',
        gender: 'male',
      },
      p3: {
        name: 'p3',
        gender: 'male',
      },
      p4: {
        name: 'p4',
        gender: 'male',
      },
    },
    round: 'reproduction',
  };
  //function handleReproductionList(actorName, args, listName, gameState, bot){
  expectedResponse =
    "Values after '!pass' must be removed.\n\nPlease try again to set your inviteList\n";
  response = reproLib.handleReproductionList(
    'p1',
    ['p2', 'p4', '!pass', 'p3'],
    'inviteList',
    gameState,
    {}
  );
  expect(response).toBe(expectedResponse);
});

test('make a inviteList, with pass happypath', () => {
  var gameState = {
    population: {
      p1: {
        name: 'p1',
        gender: 'female',
      },
      p2: {
        name: 'p2',
        gender: 'male',
      },
      p3: {
        name: 'p3',
        gender: 'male',
      },
      p4: {
        name: 'p4',
        gender: 'male',
      },
    },
    round: 'reproduction',
  };
  //function handleReproductionList(actorName, args, listName, gameState, bot){
  response = reproLib.handleReproductionList(
    'p1',
    ['p2', 'p4', '!pass'],
    'inviteList',
    gameState,
    {}
  );
  expect(response).toBe('Setting your inviteList list to:p2,p4,!pass\n');
});

test('trigger end of mating', () => {
  var gameState = {
    name: 'unitTest-tribe',
    population: {
      p1: {
        name: 'p1',
        gender: 'female',
        inviteList: ['p2', '!pass'],
      },
      p2: {
        name: 'p2',
        gender: 'male',
        consentList: ['p1'],
        cannotInvite: true,
      },
      p3: {
        name: 'p3',
        gender: 'male',
        cannotInvite: true,
      },
      p4: {
        name: 'p4',
        gender: 'male',
        cannotInvite: true,
      },
    },
    children: {},
    reproductionRound: true,
  };
  //function handleReproductionList(actorName, args, listName, gameState, bot){
  response = reproLib.globalMatingCheck(gameState, {});
  expect(gameState['population']['p1']['cannotInvite']).toBeTruthy();
  expect(response).toBe('this many people are done mating: 4');
});

test('sorting check', () => {});

test('unique names', () => {
  //getNextChildName(children, allNames, nextIndex, gameState){
  const fakeNames = {
    names: [
      ['a1', 'a2', 'a3'],
      ['b1', 'b2', 'b3'],
    ],
  };
  const children = {
    a1: {
      mother: 'm1',
      father: 'f1',
      age: 8,
      name: 'a1',
      food: 2,
      gender: 'male',
    },
    b1: {
      mother: 'm2',
      father: 'f2',
      age: 4,
      name: 'b1',
      food: 2,
      gender: 'male',
    },
    a2: {
      mother: 'm1',
      father: 'f2',
      age: -1,
      name: 'a2',
      food: 2,
      gender: 'male',
    },
  };
  result = reproLib.getNextChildName(children, fakeNames, 1, {});
  expect(result.indexOf('b')).toBe(0);
  expect(result.indexOf('a')).toBe(-1);
  expect(result.indexOf('1')).toBe(-1);
});

test('matingList tests', () => {
  var gameState = {
    name: 'unitTest-tribe',
    population: {
      p1: {
        name: 'p1',
        gender: 'female',
        inviteList: ['p 2', '!pass'],
        consentList: ['p 2'],
        declineList: [],
      },
      p2: {
        name: 'p 2',
        gender: 'male',
        consentList: ['p1'],
        cannotInvite: true,
      },
      p3: {
        name: 'p3',
        gender: 'male',
        consentList: ['p1'],
        cannotInvite: true,
      },
      p4: {
        name: 'p4',
        gender: 'male',
        declineList: [],
        cannotInvite: true,
      },
    },
    children: {},
    reproductionRound: true,
  };
  //function handleReproductionList(actorName, args, listName, gameState, bot){
  response = reproLib.showMatingLists('p1', gameState, {});
  expect(response.indexOf('inviteList')).toBeGreaterThan(0);
  expect(response.indexOf('consentList')).toBeGreaterThan(0);
  expect(response.indexOf('declineList')).toBeGreaterThan(0);
  response = reproLib.showMatingLists('p2', gameState, {});
  expect(response.indexOf('inviteList')).toBeGreaterThan(0);
  expect(response.indexOf('consentList')).toBeGreaterThan(0);
  expect(response.indexOf('declineList')).toBeGreaterThan(0);
  canResponse = reproLib.canStillInvite(gameState);
  expect(canResponse).toBe('p1');
});

test('make a invitelist, with commas, pass and save', () => {
  var gameState = {
    population: {
      p1: {
        name: 'p1',
        gender: 'female',
      },
      p2: {
        name: 'p 2',
        gender: 'male',
      },
      p3: {
        name: 'p3',
        gender: 'male',
      },
      p4: {
        name: 'p4',
        gender: 'female',
      },
    },
    round: 'reproduction',
  };
  //function handleReproductionList(actorName, args, listName, gameState, bot){
  expectedList = ['p 2', 'p3', '!pass'];
  inputList = ['p 2,', 'p3,', '!pass'];
  response = reproLib.handleReproductionList(
    'p1',
    inputList,
    'inviteList',
    gameState,
    {}
  );
  exp = 'Setting your inviteList list to:p 2,p3,!pass\n';
  expect(response).toBe(exp);
  expect(gameState['population']['p1']['inviteList']).toStrictEqual(
    expectedList
  );
});

test('make a consent list with !all', () => {
  var gameState = {
    population: {
      p1: {
        name: 'p1',
        gender: 'female',
      },
      p2: {
        name: 'p2',
        gender: 'male',
      },
      p3: {
        name: 'p3',
        gender: 'male',
      },
      p4: {
        name: 'p4',
        gender: 'female',
      },
    },
    round: 'reproduction',
  };
  expectedList = ['p2', 'p3', '!all'];
  inputList = ['p2,', 'p3,', '!all,'];
  response = reproLib.handleReproductionList(
    'p1',
    inputList,
    'consentList',
    gameState,
    {}
  );
  exp = 'Setting your consentList list to:p2,p3,!all\n';
  expect(response).toBe(exp);
  expect(gameState['population']['p1']['consentList']).toStrictEqual(
    expectedList
  );
});

test('make a consent list with !all and a declineList', () => {
  var gameState = {
    population: {
      p1: {
        name: 'p1',
        gender: 'female',
        declineList: ['p3'],
      },
      p2: {
        name: 'p2',
        gender: 'male',
      },
      p3: {
        name: 'p3',
        gender: 'male',
      },
      p4: {
        name: 'p4',
        gender: 'female',
      },
    },
    round: 'reproduction',
  };
  expectedList = ['p2', 'p3', '!all'];
  rawInputList = 'p2, p3, !all';
  reproLib.consentPrep(gameState, 'p1', rawInputList);
  response = gameState.messages['p1'];
  exp = 'Updated consentlist to p2,p3,!all';
  expect(response).toContain(exp);
  expect(response).toContain('will not override');
  expect(response).toContain('Updated');
  expect(gameState['population']['p1']['consentList']).toStrictEqual(
    expectedList
  );
});

test('make a consent list with !none', () => {
  var gameState = {
    population: {
      p1: {
        name: 'p1',
        gender: 'female',
        consentList: ['p2'],
      },
      p2: {
        name: 'p2',
        gender: 'male',
        consentList: ['!all'],
      },
      p3: {
        name: 'p3',
        gender: 'male',
      },
      p4: {
        name: 'p4',
        gender: 'female',
      },
    },
    round: 'reproduction',
  };
  inputList = '!none';
  response = reproLib.consentPrep(gameState, 'p1', inputList);
  member = gameState['population']['p1'];
  hasList = 'consentList' in member;
  expect(!hasList);
});
test('make a consent list with !none', () => {
  var gameState = {
    population: {
      p1: {
        name: 'p1',
        gender: 'female',
        consentList: ['p2'],
      },
      p2: {
        name: 'p2',
        gender: 'male',
        consentList: ['!all'],
      },
      p3: {
        name: 'p3',
        gender: 'male',
      },
      p4: {
        name: 'p4',
        gender: 'female',
      },
    },
    round: 'reproduction',
  };
  inputList = '!none';
  response = reproLib.consentPrep(gameState, 'p1', inputList);
  member = gameState['population']['p1'];
  hasList = 'consentList' in member;
  expect(!hasList);
});

test('consent and decline collisions on all', () => {
  var gameState = {
    population: {
      p1: {
        name: 'p1',
        gender: 'female',
        consentList: ['!all'],
        declineList: ['!all'],
      },
      p2: {
        name: 'p2',
        gender: 'male',
        consentList: ['!all'],
      },
    },
    round: 'reproduction',
  };
  inputList = '!all';
  //function decline(actorName, messageArray,  gameState){
  response = reproLib.decline('p1', inputList, gameState);
  member = gameState['population']['p1'];
  expect(['p2']).toStrictEqual(member.declineList);
});

test('consent and decline collisions by name', () => {
  var gameState = {
    reproductionRound: true,
    population: {
      p1: {
        name: 'p1',
        gender: 'female',
        cannotInvite: true,
        inviteList: ['!pass'],
        consentList: ['p2'],
        declineList: ['p2'],
      },
      p2: {
        name: 'p2',
        gender: 'male',
        inviteList: ['p1'],
      },
    },
    round: 'reproduction',
  };
  response = reproLib.globalMatingCheck(gameState);
  p1 = gameState['population']['p1'];
  p2 = gameState['population']['p2'];
  expect(gameState.messages);
  p1message = gameState.messages['p1'];
  p2message = gameState.messages['p2'];
  expect(p1message).toStrictEqual('p2 flirts with you, but you decline.');
  expect(p2message).toStrictEqual('p1 declines your invitation.');
});

test('mating with spaces in names', () => {
  var gameState = {
    reproductionRound: true,
    population: {
      p1: {
        name: 'p1',
        gender: 'female',
        inviteList: ['p 2'],
        consentList: ['!all'],
      },
      p2: {
        name: 'p 2',
        gender: 'male',
        inviteList: ['p1', 'p4'],
        consentList: ['p1'],
      },
      p3: {
        name: 'p3',
        gender: 'male',
        inviteList: ['!pass'],
      },
      p4: {
        name: 'p4',
        gender: 'female',
        inviteList: ['!pass'],
        consentList: ['p 2'],
      },
    },
    children: {},
    round: 'reproduction',
  };
  //function handleReproductionList(actorName, args, listName, gameState, bot){
  response = reproLib.checkMating(gameState, 'p1');
  messages = gameState.messages;

  expect('p 2' in messages);
  p2messages = messages['p 2'];
  expect(p2messages).toContain('p1 is impressed');
  expect(p2messages).toContain('You share good feelings with p1');
  expect(p2messages).toContain('p1 flirts with you, and you are interested.');
  expect('p1' in messages);
  p1messages = messages['p1'];
  expect(p1messages).toContain('Checking');
  expect(p1messages).toContain('p 2');
  expect(p1messages).toContain('over');
  expect(p1messages).toContain('done mating');
});
test('make a consentList, null in the array', () => {
  var gameState = {
    population: {
      p1: {
        name: 'p1',
        gender: 'female',
      },
      p2: {
        name: 'p2',
        gender: 'male',
      },
      p3: {
        name: 'p3',
        gender: 'male',
      },
      p4: {
        name: 'p4',
        gender: 'male',
      },
    },
    round: 'reproduction',
  };
  response = reproLib.handleReproductionList(
    'p1',
    ['p2', null],
    'consentList',
    gameState,
    {}
  );
  expect(response).toContain('is not in the tribe');
});

test('pass when not in tribe', () => {
  var gameState = {
    name: 'test-tribe',
    population: {},
  };
  reproLib.pass(gameState, 'dummy');
  const message = gameState['messages']['dummy'];
  expect(message).toContain('You are not in this tribe.');
});

test('pass when not in reproduction', () => {
  var gameState = {
    name: 'test-tribe',
    reproductionRound: false,
    population: {
      dummy: {
        username: 'dummy',
        handle: { userid: 7 },
        name: 'dummy',
      },
    },
  };
  reproLib.pass(gameState, 'dummy');
  const message = gameState['messages']['dummy'];
  expect(message).toContain('round.');
});

test('pass happypath', () => {
  var gameState = {
    name: 'test-tribe',
    reproductionRound: true,
    population: {
      dummy: {
        username: 'dummy',
        handle: { userid: 7 },
        name: 'dummy',
      },
    },
  };
  reproLib.pass(gameState, 'dummy');
  const message = gameState['messages']['tribe'];
  expect(message).toContain('complete');
});

test('handle mating with lists and decline', () => {
  var gameState = {
    name: 'unitTest-tribe',
    population: {
      p1: {
        name: 'p1',
        gender: 'female',
        inviteList: ['p2', 'p3', 'p4'],
      },
      p2: {
        name: 'p2',
        gender: 'male',
        declineList: ['p1'],
        cannotInvite: true,
      },
      p3: {
        name: 'p3',
        gender: 'male',
        consentList: ['p1'],
        cannotInvite: true,
      },
      p4: {
        name: 'p4',
        gender: 'male',
        cannotInvite: true,
      },
    },
    children: {},
    reproductionRound: true,
  };
  //function handleReproductionList(actorName, args, listName, gameState, bot){
  response = reproLib.globalMatingCheck(gameState, {});
  expect(gameState['population']['p1']['cannotInvite']).toBeTruthy();
  const p1message = gameState['messages']['p1'];
  expect(p1message).toContain('p2 declines');
  expect(p1message).toContain('You share good feelings with p3');
  const p2message = gameState['messages']['p2'];
  expect(p2message).toContain('p1 flirts');
  expect(p2message).toContain('decline');
  const p3message = gameState['messages']['p3'];
  expect(p3message).toContain('p1 flirts');
  expect(p3message).toContain('feelings');
  expect(response).toBe('this many people are done mating: 4');
});

test('Infinite loop issue', () => {
  gameState = {
    name: 'unitTest-tribe',
    children: {},
    reproductionRound: true,
    population: {
      Susanthewinner: {
        gender: 'male',
        food: 4,
        grain: 8,
        basket: 0,
        spearhead: 2,
        handle: {
          id: '1249895732891353120',
          bot: false,
          system: false,
          flags: 0,
          username: 'susanthewinner',
          globalName: 'Susan the winner',
          discriminator: '0',
          avatar: '6c5996770c985bcd6e5b68131ff2ba04',
          banner: null,
          accentColor: null,
          avatarDecoration: null,
          createdTimestamp: 1718068764661,
          defaultAvatarURL: 'https://cdn.discordapp.com/embed/avatars/1.png',
          hexAccentColor: null,
          tag: 'susanthewinner',
          avatarURL:
            'https://cdn.discordapp.com/avatars/1249895732891353120/6c5996770c985bcd6e5b68131ff2ba04.webp',
          displayAvatarURL:
            'https://cdn.discordapp.com/avatars/1249895732891353120/6c5996770c985bcd6e5b68131ff2ba04.webp',
          bannerURL: null,
        },
        name: 'Susan the winner',
        strength: 'average',
        history: [
          '0.5: Susanthewinner male joined the tribe.',
          '2: UgUgOogOog shares good feelings with you [3]',
          '2.5: UgUgOogOog shares good feelings with you [1]',
          '3: Susan the winner goes hunting. [13]-season +spearhead \n\tstag +30 food\nThe game track goes from 2 to 3',
          '3: UgUgOogOog shares good feelings with you [2]',
          '3.5: Susan the winner goes hunting. [12]+spearhead \n\tdeer +30 food\n The spearhead broke! (roll 2)\nThe game track goes from 1 to 2',
          '3.5: UgUgOogOog shares good feelings with you [2]',
          '4: Susan the winner goes hunting. [12]-season +spearhead \n\tsmall deer +25 food\nThe game track goes from 2 to 3',
          '4.5: Susan the winner goes hunting. [9]+spearhead \n\tgoat +12 food\nThe game track goes from 1 to 2',
          '4.5: UgUgOogOog shares good feelings with you [1]',
          '5: Susan the winner goes hunting. [13]-season +spearhead \n\tdeer +30 food\nThe game track goes from 2 to 3',
          '5: UgUgOogOog shares good feelings with you [4]',
          '5.5: Susan the winner goes hunting. [17]+spearhead \n\tbear +50 food\nThe game track goes from 1 to 2',
          '5.5: UgUgOogOog shares good feelings with you [2]',
          '5.5: UgUgOogOog shares good feelings with you [6]',
          '6: Susan the winner goes hunting. [17]-season +spearhead  -game track \n\tgiraffe +50 food\nThe game track goes from 5 to 6',
          '6.5: Susan the winner goes hunting. [13]+spearhead \n\tzebra +40 food\nThe game track goes from 3 to 4',
          '6.5: UgUgOogOog shares good feelings with you [1]',
          '7: Susan the winner goes hunting. [11]-season +spearhead \n\tostrich +20 food\n The spearhead broke! (roll 1)\nThe game track goes from 4 to 5',
          '7: UgUgOogOog shares good feelings with you [5]',
          '7.5: Susan the winner goes hunting. [7]\nNo game.\n The spearhead broke! (roll 1)\nThe game track goes from 2 to 3',
          '7.5: UgUgOogOog shares good feelings with you [6]',
          '8: Susan the winner goes hunting. [12]-season +spearhead \n\tgazelle +25 food\nThe game track goes from 3 to 4',
          '8: UgUgOogOog shares good feelings with you [1]',
          '8.5: Susan the winner goes hunting. [9]+spearhead \n\tsmall antelope +15 food\nThe game track goes from 1 to 2',
          '8.5: UgUgOogOog shares good feelings with you [5]',
          '8.5: UgUgOogOog shares good feelings with you [3]',
          '9: Susan the winner goes hunting. [12]-season +spearhead \n\tgazelle +25 food\nThe game track goes from 2 to 3',
          '9: UgUgOogOog shares good feelings with you [4]',
          '9: UgUgOogOog shares good feelings with you [3]',
          '9.5: Susan the winner goes hunting. [9]+spearhead \n\tsmall fish +12 food\n The spearhead broke! (roll 2)\nThe game track goes from 1 to 2',
          '9.5: You share good feelings with UgUgOogOog [3]',
          '9.5: You share good feelings with UgUgOogOog [2]',
          '10: Susan the winner goes hunting. [9]-season +spearhead \n\tcapybara +8 food\nThe game track goes from 2 to 3',
          '10: Susan the winner gives UgUgOogOog 15 food',
          '10: You share good feelings with UgUgOogOog [5]',
          '10: You share good feelings with UgUgOogOog [1]',
          '10.5: Susan the winner goes hunting. [16]+spearhead \n\thippo +80 food\n The spearhead broke! (roll 1)\nThe game track goes from 2 to 3',
          '10.5: Susan the winner gives UgUgOogOog 70 food',
          '11: Susan the winner goes hunting. [7]-season \nNo game.\nThe game track goes from 4 to 5',
          '11: You share good feelings with UgUgOogOog [2]',
          '11.5: Susan the winner goes hunting. [11]+spearhead \n\tdeer +25 food\nThe game track goes from 2 to 3',
          '11.5: Susan the winner gives UgUgOogOog 20 food',
          '12: Susan the winner goes hunting. [18]-season +spearhead  -game track \n\tsturgeon +40 food\nThe game track goes from 4 to 5',
          '12: Susan the winner gives UgUgOogOog 39 food',
          '12: You share good feelings with UgUgOogOog [2]',
          '12: You share good feelings with UgUgOogOog [1]',
          '12.5: Susan the winner goes hunting. [9]+spearhead \n\tsmall fish +12 food\nThe game track goes from 2 to 3',
          '12.5: Susan the winner gives UgUgOogOog 10 food',
          '12.5: You share good feelings with UgUgOogOog [2]',
          '12.5: You share good feelings with UgUgOogOog [5]',
          '13: Susan the winner goes hunting. [15]-season +spearhead \n\tsturgeon +40 food\n The spearhead broke! (roll 2)\nThe game track goes from 3 to 4',
          '13: Susan the winner gives UgUgOogOog 30 food',
          '13: You share good feelings with UgUgOogOog [5]',
          '13: You share good feelings with UgUgOogOog [3]',
          '13.5: Susan the winner goes hunting. [17]+spearhead \n\thippo +80 food\nThe game track goes from 1 to 2',
          '13.5: Susan the winner gives UgUgOogOog 72 food',
          '13.5: You share good feelings with UgUgOogOog [5]',
          '13.5: You share good feelings with UgUgOogOog [2]',
          '14: Susan the winner goes hunting. [10]-season +spearhead \n\tsmall fish +12 food\nThe game track goes from 2 to 3',
          '14: You share good feelings with UgUgOogOog [2]',
          '14: Susan the winner gives UgUgOogOog 8 food',
          '14.5: Susan the winner goes hunting. [9]+spearhead \n\tsmall fish +12 food\n The spearhead broke! (roll 1)\nThe game track goes from 1 to 2',
          '14.5: You share good feelings with Jonayla [2]',
          '15: Susan the winner goes hunting. [9]-season +spearhead \n\tcapybara +8 food\nThe game track goes from 2 to 3',
          '15: Susan the winner gives UgUgOogOog 6 food',
          '15: You share good feelings with Jonayla [6]',
          '15: You share good feelings with UgUgOogOog [6]',
          '15.5: Susan the winner goes hunting. [10]+spearhead \n\twaterfowl +15 food\nThe game track goes from 1 to 2',
          '15.5: UgUgOogOog gives Susan the winner 1 food',
          '16: Susan the winner goes hunting. [15]-season +spearhead \n\tsturgeon +40 food\n The spearhead broke! (roll 2)\nThe game track goes from 2 to 3',
          '16: Susan the winner gives UgUgOogOog 30 food',
          '16: You share good feelings with UgUgOogOog [3]',
          '16: You share good feelings with Jonayla [5]',
          '16.5: Susan the winner goes hunting. [10]+spearhead \n\twaterfowl +15 food\n The spearhead broke! (roll 1)\nThe game track goes from 1 to 2',
          '16.5: You share good feelings with Jonayla [6]',
          '16.5: Susan the winner gives UgUgOogOog 13 food',
          '17: UgUgOogOog gives Susan the winner 1 spearhead',
          '17: Susan the winner goes hunting. [8]-season \nNo game.\nThe game track goes from 2 to 3',
          '17: You share good feelings with UgUgOogOog [4]',
          '17.5: Susan the winner goes hunting. [8]\nNo game.\nThe game track goes from 1 to 2',
          '17.5: Ragnar the not imcompetent gives Susan the winner 4 food',
          '17.5: You share good feelings with Jonayla [3]',
          '17.5: You share good feelings with UgUgOogOog [4]',
          '17.5: You share good feelings with UgUgOogOog [6]',
          '18: Susan the winner goes hunting. [5]-season \nInjury!\n The spearhead broke! (roll 2)\nThe game track goes from 2 to 3',
          '18: UgUgOogOog gives Susan the winner 4 food',
          '18.5: UgUgOogOog gives Susan the winner 4 food',
          '18.5: recovered from injury',
          '18.5: You share good feelings with Jonayla [2]',
          '18.5: You share good feelings with UgUgOogOog [2]',
          '19: UgUgOogOog gives Susan the winner 4 food',
          '19: recovered from illness',
          '19.5: UgUgOogOog gives Susan the winner 4 food',
          '19.5: recovered from illness',
          '20: Susan the winner goes hunting. [18]-season +spearhead \n\thippo +80 food\n The spearhead broke! (roll 2)\nThe game track goes from 1 to 2',
          '20: Susan the winner gives UgUgOogOog 65 food',
          '20: Jonayla gives Susan the winner 1 spearhead',
          '20: You share good feelings with UgUgOogOog [1]',
          '20: You share good feelings with UgUgOogOog [3]',
          '20: You share good feelings with Jonayla [1]',
          '20.5: Susan the winner goes hunting. [7]\nNo game.\n The spearhead broke! (roll 2)\nThe game track goes from 1 to 2',
          '20.5: Jonayla gives Susan the winner 1 spearhead',
          '20.5: UgUgOogOog invite you to share good feelings',
          '20.5: You share good feelings with UgUgOogOog',
          '20.5: Jonayla invite you to share good feelings',
          '21: Susan the winner goes hunting. [12]-season +spearhead \n\tdeer +25 food\nThe game track goes from 2 to 3',
          '21: Susan the winner gives UgUgOogOog 24 food',
          '21: Jonayla gives Susan the winner 1 spearhead',
          '21: Jonayla invite you to share good feelings',
          '21: You share good feelings with UgUgOogOog',
          '21: UgUgOogOog invite you to share good feelings',
          '21.5: Susan the winner studies crafting technique, but does not understand it yet. [8]',
          '21.5: UgUgOogOog invite you to share good feelings',
          '21.5: You share good feelings with UgUgOogOog',
          '21.5: Jonayla invite you to share good feelings',
          '22: Susan the winner goes hunting. [roll 14]-season +spearhead \n\talligator +35 food\nThe game track goes from 1 to 2',
          '22: Susan the winner gives UgUgOogOog 27 food',
        ],
        profession: 'hunter',
        worked: false,
        consentList: ['!all'],
        vote: 'Alexander',
        inviteList: ['UgUgOogOog', '!save', '!pass'],
        inviteIndex: 0,
        activity: 'hunt',
        cannotInvite: true,
      },
      Alexander: {
        gender: 'male',
        food: 0,
        grain: 47,
        basket: 1,
        spearhead: 0,
        handle: {
          guildId: '734974091718819891',
          joinedTimestamp: 1600653491274,
          premiumSinceTimestamp: null,
          nickname: 'Alexander',
          pending: false,
          communicationDisabledUntilTimestamp: null,
          userId: '209897135406055435',
          avatar: null,
          flags: 0,
          displayName: 'Alexander',
          roles: ['816905478172180480', '734974091718819891'],
          avatarURL: null,
          displayAvatarURL:
            'https://cdn.discordapp.com/avatars/209897135406055435/694c683b5011643aeb9ad12d4636334c.webp',
        },
        name: 'Alexander',
        strength: 'weak',
        history: [
          '6.5: Alexander male joined the tribe.',
          '6.5: Alexander gathers [6]grubs (2) basket: [12]wild vegetables (5)',
          '6.5: UgUgOogOog shares good feelings with you [4]',
          '7: recovered from injury',
          '7.5: Alexander gathers [17](weak)grain (6) basket: [11]wild cucumber (4) basket breaks.',
          '8: Alexander gathers [9]-season (weak)grubs (2) basket: [7]grubs (2)',
          '8.5: Alexander gathers [7](weak)grubs (2) basket: [8]grubs (2)',
          '8.5: UgUgOogOog shares good feelings with you [6]',
          '8.5: became chief',
          '9: Alexander gathers [8]-season (weak)grubs (2) basket: [2]grubs (2)',
          '9: UgUgOogOog shares good feelings with you [2]',
          '9.5: Alexander gathers [8](weak)clams (4) basket: [12]turtle eggs (7)',
          '9.5: People available to work: Alexander',
          '9.5: Alexander gives UgUgOogOog 1 food',
          '9.5: You share good feelings with UgUgOogOog [1]',
          '10: Alexander gathers [12]-season (weak)frogs and turtles (5) basket: [7]clams (4) basket breaks.',
          '10: You share good feelings with UgUgOogOog [3]',
          '10.5: Alexander gathers [8](weak)clams (4) basket: [11]duck eggs (7)',
          '11: Alexander gathers [12]-season (weak)frogs and turtles (5) basket: [5]clams (4)',
          '11: You share good feelings with UgUgOogOog [4]',
          '11: You share good feelings with UgUgOogOog [6]',
          '11.5: Alexander gathers [13](weak)wild vegetables (8) basket: [12]turtle eggs (7) basket breaks.',
          '12: recovered from injury',
          '12.5: Alexander gathers [7](weak)clams (4)',
          '12.5: You share good feelings with UgUgOogOog [2]',
          '13: Alexander gathers [8]-season (weak)clams (4) basket: [6]clams (4)',
          '13: You share good feelings with UgUgOogOog [5]',
          '13.5: Alexander gathers [11](weak)duck eggs (7) basket: [9]frogs and turtles (5)',
          '13.5: You share good feelings with UgUgOogOog [4]',
          '14: Alexander gathers [7]-season (weak)clams (4) basket: [7]clams (4)',
          '14: You share good feelings with UgUgOogOog [6]',
          '14: You share good feelings with UgUgOogOog [3]',
          '14.5: Alexander tries to learn to craft, but does not understand it yet. [4]',
          '15: Alexander gathers [7]-season (weak)clams (4) basket: [10]clams (4) basket breaks.',
          '15: You share good feelings with UgUgOogOog [5]',
          '15: You share good feelings with UgUgOogOog [2]',
          '15.5: Alexander gathers [7](weak)clams (4)',
          '15.5: Jonayla gives Alexander 1 basket',
          '16: Alexander gathers [15]-season (weak)turtle eggs (7) basket: [10]clams (4)',
          '16: You share good feelings with UgUgOogOog [6]',
          '16.5: Jonayla gives Alexander 1 basket',
          '16.5: Alexander gathers [12](weak)turtle eggs (7) basket: [9]frogs and turtles (5)',
          '17: Alexander tries to learn to craft, but does not understand it yet. [9]',
          '17: You share good feelings with UgUgOogOog [2]',
          '17.5: Alexander gives UgUgOogOog 1 basket',
          '17.5: Alexander tries to learn to craft, but does not understand it yet. [7]',
          '18: Jonayla gives Alexander 1 basket',
          '18: Alexander gathers [7]-season (weak)clams (4) basket: [4]clams (4)',
          '18: You share good feelings with Jonayla [1]',
          '18.5: Alexander gathers [15](weak)grain (6) basket: [15]grain (6) basket breaks.',
          '18.5: You share good feelings with UgUgOogOog [5]',
          '19: You share good feelings with Jonayla [6]',
          '19.5: Ragnar the not imcompetent gives Alexander 10 food',
          '19.5: Alexander gathers [13](weak)wild vegetables (8) basket: [13]wild vegetables (8) basket breaks.',
          '19.5: Alexander gives UgUgOogOog 2 food',
          '20: Jonayla gives Alexander 1 basket',
          '20: UgUgOogOog gives Alexander 4 food',
          '20: Alexander studies crafting technique, but does not understand it yet. [5]',
          '20.5: UgUgOogOog gives Alexander 4 food',
          '20.5: Alexander gives Ragnar the not imcompetent 1 basket',
          '20.5: Alexander studies crafting technique, but does not understand it yet. [7]',
          '21: UgUgOogOog gives Alexander 4 food',
          '21: Alexander studies crafting technique, but does not understand it yet. [2]',
          '21: You share good feelings with Jonayla',
          '21.5: UgUgOogOog gives Alexander 4 food',
          '21.5: Alexander studies crafting technique, but does not understand it yet. [9]',
          '21.5: You share good feelings with Jonayla',
          '22: Jonayla gives Alexander 1 basket',
          '22: UgUgOogOog gives Alexander 4 food',
          '22: Alexander studies crafting technique, but does not understand it yet. [9]',
        ],
        profession: 'gatherer',
        worked: false,
        consentList: ['!all'],
        vote: 'UgUgOogOog',
        inviteList: ['Jonayla', 'UgUgOogOog', ' !pass'],
        inviteIndex: 0,
        guarding: ['Fire', 'Kohl'],
        activity: 'training',
        cannotInvite: true,
      },
      UgUgOogOog: {
        gender: 'female',
        food: 1,
        grain: 21,
        basket: 1,
        spearhead: 0,
        handle: {
          guildId: '734974091718819891',
          joinedTimestamp: 1600648364385,
          premiumSinceTimestamp: null,
          nickname: 'UgUgOogOog',
          pending: false,
          communicationDisabledUntilTimestamp: null,
          userId: '542388020725415946',
          avatar: null,
          flags: 0,
          displayName: 'UgUgOogOog',
          roles: ['816905478172180480', '734974091718819891'],
          avatarURL: null,
          displayAvatarURL:
            'https://cdn.discordapp.com/avatars/542388020725415946/1be982bc46ae0e1dfd6ab599d030dcf5.webp',
        },
        name: 'UgUgOogOog',
        strength: 'average',
        profession: 'crafter',
        canCraft: true,
        history: [
          '8.5: UgUgOogOog female joined the tribe.',
          '9: UgUgOogOog creates something[1], but it is not a basket',
          '9: became chief',
          '9: Susan the winner shares good feelings with you [2]',
          '9: Alexander shares good feelings with you [3]',
          '9: Susan the winner shares good feelings with you [2]',
          '9.5: UgUgOogOog crafts[3] a basket',
          '9.5: Your inviteList is:UgUgOogOog\nYour consentList is:!all\nYour declineList is empty\n',
          '9.5: UgUgOogOog gives Ragnar the not imcompetent 1 basket',
          '9.5: You shares good feelings with Ragnar the not imcompetent [2]',
          '9.5: You shares good feelings with Susan the winner [3]',
          '9.5: You shares good feelings with Alexander [5]',
          '9.5: You shares good feelings with Susan the winner [3]',
          '10: UgUgOogOog crafts[4] a spearhead',
          '10: UgUgOogOog gives Susan the winner 1 spearhead',
          '10: You shares good feelings with Alexander [6]',
          '10: You shares good feelings with Susan the winner [3]',
          '10: You shares good feelings with Susan the winner [5]',
          '10: You shares good feelings with Ed the Elder [6]',
          '10.5: recovered from illness',
          '11: UgUgOogOog creates something[1], but it is not a spearhead',
          '11: UgUgOogOog gives birth to a male-child, Egg',
          '11: You shares good feelings with Susan the winner [3]',
          '11: You shares good feelings with Alexander [2]',
          '11: You shares good feelings with Alexander [6]',
          '11: You shares good feelings with Ragnar the not imcompetent [4]',
          '11: You shares good feelings with Ed the Elder [3]',
          '11.5: UgUgOogOog crafts[6] a spearhead',
          '11.5: UgUgOogOog gives Ed the Elder 1 spearhead',
          '12: UgUgOogOog creates something[1], but it is not a spearhead',
          '12: UgUgOogOog gives birth to a male-child, Fire',
          '12: You share good feelings with Susan the winner [6]',
          '12: You share good feelings with Susan the winner [3]',
          '12: You share good feelings with Ragnar the not imcompetent [3]',
          '12.5: UgUgOogOog crafts[3] a spearhead',
          '12.5: UgUgOogOog gives Ed the Elder 1 spearhead',
          '12.5: UgUgOogOog gives Susan the winner 2 food',
          '12.5: UgUgOogOog gives Ed the Elder 2 food',
          '12.5: You share good feelings with Alexander [4]',
          '12.5: You share good feelings with Susan the winner [4]',
          '12.5: You share good feelings with Ragnar the not imcompetent [1]',
          '12.5: You share good feelings with Susan the winner [3]',
          '13: UgUgOogOog gives Susan the winner 1 spearhead',
          '13: UgUgOogOog crafts[5] a basket',
          '13: UgUgOogOog gives Alexander 1 basket',
          '13: You share good feelings with Susan the winner [4]',
          '13: You share good feelings with Alexander [4]',
          '13: You share good feelings with Susan the winner [2]',
          '13: UgUgOogOog gives Ed the Elder 1 food',
          '13: You share good feelings with Ragnar the not imcompetent [4]',
          '13.5: UgUgOogOog crafts[5] a basket',
          '13.5: You share good feelings with Susan the winner [1]',
          '13.5: You share good feelings with Alexander [2]',
          '13.5: You share good feelings with Susan the winner [3]',
          '13.5: You share good feelings with Ragnar the not imcompetent [3]',
          '14: UgUgOogOog crafts[6] a spearhead',
          '14: You share good feelings with Susan the winner [2]',
          '14: You share good feelings with Alexander [3]',
          '14: You share good feelings with Ragnar the not imcompetent [6]',
          '14: You share good feelings with Alexander [1]',
          '14.5: UgUgOogOog gives Ragnar the not imcompetent 1 basket',
          '14.5: UgUgOogOog gives Susan the winner 1 spearhead',
          '14.5: UgUgOogOog crafts[5] a spearhead',
          '15: Susan the winner gives UgUgOogOog 6 food',
          '15: UgUgOogOog gives Jonayla 1 food',
          '15: UgUgOogOog gathers [12]-season (-3 skill) clams (4) basket: [2]clams (4) basket breaks.',
          '15: UgUgOogOog gives birth to a male-child, Gull',
          '15: You share good feelings with Alexander [5]',
          '15: You share good feelings with Alexander [6]',
          '15: You share good feelings with Ragnar the not imcompetent [2]',
          '15: You share good feelings with Susan the winner [4]',
          '15.5: UgUgOogOog gives Jonayla 4 food',
          '15.5: UgUgOogOog gives Susan the winner 1 food',
          '15.5: UgUgOogOog crafts[3] a basket',
          '15.5: UgUgOogOog gives Jonayla 1 basket',
          '16: UgUgOogOog creates something[1], but it is not a basket',
          '16: Susan the winner gives UgUgOogOog 30 food',
          '16: UgUgOogOog gives Jonayla 4 food',
          '16: UgUgOogOog gives birth to a male-child, Hazel',
          '16: You share good feelings with Ragnar the not imcompetent [5]',
          '16: You share good feelings with Susan the winner [3]',
          '16: You share good feelings with Alexander [5]',
          '16: You share good feelings with Ragnar the not imcompetent [2]',
          '16.5: UgUgOogOog crafts[4] a basket',
          '16.5: UgUgOogOog gives Jonayla 4 food',
          '16.5: UgUgOogOog gives Ragnar the not imcompetent 1 basket',
          '16.5: Susan the winner gives UgUgOogOog 13 food',
          '17: UgUgOogOog gives Susan the winner 1 spearhead',
          '17: UgUgOogOog crafts[6] a basket',
          '17: UgUgOogOog gives Ragnar the not imcompetent 1 basket',
          '17: UgUgOogOog gives Jonayla 6 food',
          '17: UgUgOogOog gives birth to a female-child, Joy',
          '17: You share good feelings with Ragnar the not imcompetent [1]',
          '17: You share good feelings with Alexander [4]',
          '17: You share good feelings with Susan the winner [1]',
          '17.5: UgUgOogOog gives Jonayla 6 food',
          '17.5: Alexander gives UgUgOogOog 1 basket',
          '17.5: UgUgOogOog gathers [8](-3 skill) clams (4) basket: [5]clams (4)',
          '17.5: You share good feelings with Ragnar the not imcompetent [4]',
          '17.5: You share good feelings with Susan the winner [4]',
          '17.5: You share good feelings with Susan the winner [6]',
          '18: UgUgOogOog gives Jonayla 2 grain',
          '18: UgUgOogOog gathers [14]-season (-3 skill) frogs and turtles (5) basket: [1]clams (4)',
          '18: UgUgOogOog gives Jonayla 6 food',
          '18: UgUgOogOog gives Susan the winner 4 food',
          '18.5: UgUgOogOog gives Jonayla 4 food',
          '18.5: UgUgOogOog gives Susan the winner 4 food',
          '18.5: UgUgOogOog gathers [9](-3 skill) clams (4) basket: [10]clams (4) basket breaks.',
          '18.5: UgUgOogOog gives Ragnar the not imcompetent 8 food',
          '18.5: Jonayla gives UgUgOogOog 1 basket',
          '18.5: UgUgOogOog gives birth to a female-child, Lily',
          '18.5: You share good feelings with Ragnar the not imcompetent [6]',
          '18.5: You share good feelings with Alexander [6]',
          '18.5: You share good feelings with Susan the winner [4]',
          '19: Ragnar the not imcompetent gives UgUgOogOog 5 food',
          '19: UgUgOogOog gathers [11]-season (-3 skill) clams (4) basket: [5]clams (4)',
          '19: UgUgOogOog gives Susan the winner 4 food',
          '19: UgUgOogOog gives Jonayla 4 food',
          '19.5: UgUgOogOog gathers [8](-3 skill) clams (4) basket: [3]clams (4) basket breaks.',
          '19.5: UgUgOogOog gives Susan the winner 4 food',
          '19.5: Alexander gives UgUgOogOog 2 food',
          '19.5: UgUgOogOog gives birth to a male-child, Mist',
          '19.5: You share good feelings with Ragnar the not imcompetent [4]',
          '20: Susan the winner gives UgUgOogOog 65 food',
          '20: UgUgOogOog creates something[2], but it is not a spearhead',
          '20: UgUgOogOog gives Alexander 4 food',
          '20: You share good feelings with Ragnar the not imcompetent [3]',
          '20: You share good feelings with Susan the winner [1]',
          '20: You share good feelings with Susan the winner [5]',
          '20.5: UgUgOogOog gives Jonayla 4 food',
          '20.5: UgUgOogOog gives Alexander 4 food',
          '20.5: UgUgOogOog creates something[1], but it is not a basket',
          '20.5: You share good feelings with Susan the winner',
          '20.5: Susanthewinner invite you to share good feelings',
          '20.5: Ragnarthenotimcompetent invite you to share good feelings',
          '21: Ragnar the not imcompetent gives UgUgOogOog 8 food',
          '21: Susan the winner gives UgUgOogOog 24 food',
          '21: UgUgOogOog creates something[1], but it is not a basket',
          '21: UgUgOogOog gives Alexander 4 food',
          '21: UgUgOogOog gives Jonayla 2 food',
          '21: Susanthewinner invite you to share good feelings',
          '21: You share good feelings with Susan the winner',
          '21: Ragnarthenotimcompetent invite you to share good feelings',
          '21.5: kevinmitcham gives UgUgOogOog 20 food',
          '21.5: UgUgOogOog gives Jonayla 4 food',
          '21.5: UgUgOogOog gives Alexander 4 food',
          '21.5: UgUgOogOog crafts[4] a basket',
          '21.5: UgUgOogOog gives Jonayla 1 basket',
          '21.5: You share good feelings with Susan the winner',
          '21.5: Ragnarthenotimcompetent invite you to share good feelings',
          '21.5: Susanthewinner invite you to share good feelings',
          '22: Susan the winner gives UgUgOogOog 27 food',
          '22: Jonayla gives UgUgOogOog 1 basket',
          '22: UgUgOogOog gives Alexander 4 food',
          '22: UgUgOogOog crafts[3] a basket',
          '22: UgUgOogOog gives Jonayla 1 basket',
          '22: UgUgOogOog gives Ragnar the not imcompetent 1 food',
        ],
        worked: false,
        vote: 'UgUgOogOog',
        chief: true,
        consentList: ['!all'],
        inviteList: [
          'Susan the winner',
          'Ragnar the not imcompetent',
          'Alexander',
          ' !pass',
        ],
        inviteIndex: 0,
        guarding: ['Joy', 'Lily'],
        isPregnant: 'Oona',
        activity: 'craft',
        cannotInvite: true,
      },
      Ragnarthenotimcompetent: {
        gender: 'male',
        food: 8,
        grain: 17,
        basket: 0,
        spearhead: 0,
        handle: {
          id: '922949872108310598',
          bot: false,
          system: false,
          flags: 0,
          username: 'jmitcham',
          globalName: 'Ragnar the not imcompetent',
          discriminator: '0',
          avatar: '7030d1d92c41551b449b277d2c7251e1',
          banner: null,
          accentColor: null,
          avatarDecoration: null,
          createdTimestamp: 1640118797090,
          defaultAvatarURL: 'https://cdn.discordapp.com/embed/avatars/2.png',
          hexAccentColor: null,
          tag: 'jmitcham',
          avatarURL:
            'https://cdn.discordapp.com/avatars/922949872108310598/7030d1d92c41551b449b277d2c7251e1.webp',
          displayAvatarURL:
            'https://cdn.discordapp.com/avatars/922949872108310598/7030d1d92c41551b449b277d2c7251e1.webp',
          bannerURL: null,
        },
        name: 'Ragnar the not imcompetent',
        strength: 'average',
        profession: 'gatherer',
        history: [
          '9.5: Ragnarthenotimcompetent male joined the tribe.',
          '9.5: Ragnar the not imcompetent gathers [6]clams (4)',
          '9.5: You share good feelings with UgUgOogOog [1]',
          '10: Ragnar the not imcompetent gathers [8]-season clams (4) basket: [10]clams (4)',
          '10.5: Ragnar the not imcompetent gathers [11]turtle eggs (7) basket: [8]frogs and turtles (5)',
          '11: Ragnar the not imcompetent gathers [8]-season clams (4) basket: [9]clams (4)',
          '11: You share good feelings with UgUgOogOog [3]',
          '11.5: Ragnar the not imcompetent gathers [14]grain (6) basket: [11]turtle eggs (7)',
          '12: You share good feelings with UgUgOogOog [4]',
          '12.5: Ragnar the not imcompetent gathers [12]wild vegetables (8) basket: [13]wild vegetables (8)',
          '12.5: You share good feelings with UgUgOogOog [5]',
          '13: Ragnar the not imcompetent gathers [11]-season frogs and turtles (5) basket: [6]clams (4)',
          '13: You share good feelings with UgUgOogOog [1]',
          '13.5: Ragnar the not imcompetent gathers [11]turtle eggs (7) basket: [5]clams (4)',
          '13.5: You share good feelings with UgUgOogOog [1]',
          '14: Ragnar the not imcompetent gathers [8]-season clams (4) basket: [4]clams (4)',
          '14: You share good feelings with UgUgOogOog [4]',
          '14.5: Ragnar the not imcompetent gathers [10]duck eggs (7) basket: [8]frogs and turtles (5) basket breaks.',
          '15: Ragnar the not imcompetent gathers [8]-season clams (4) basket: [7]clams (4)',
          '15: You share good feelings with UgUgOogOog [4]',
          '15.5: Ragnar the not imcompetent gathers [9]mushrooms (6) basket: [8]frogs and turtles (5) basket breaks.',
          '16: Jonayla gives Ragnar the not imcompetent 1 basket',
          '16: Ragnar the not imcompetent gathers [9]-season clams (4) basket: [6]clams (4)',
          '16: You share good feelings with UgUgOogOog [1]',
          '16: You share good feelings with UgUgOogOog [4]',
          '16.5: Ragnar the not imcompetent gathers [9]mushrooms (6) basket: [11]turtle eggs (7) basket breaks.',
          '16.5: UgUgOogOog gives Ragnar the not imcompetent 1 basket',
          '16.5: You share good feelings with Jonayla [1]',
          '17: Ragnar the not imcompetent gathers [11]-season frogs and turtles (5) basket: [10]clams (4) basket breaks.',
          '17: UgUgOogOog gives Ragnar the not imcompetent 1 basket',
          '17: Jonayla gives Ragnar the not imcompetent 1 basket',
          '17: You share good feelings with UgUgOogOog [2]',
          '17.5: Ragnar the not imcompetent gathers [11]turtle eggs (7) basket: [13]wild vegetables (8) basket breaks.',
          '17.5: Ragnar the not imcompetent gives Susan the winner 4 food',
          '17.5: You share good feelings with UgUgOogOog [4]',
          '18: Jonayla gives Ragnar the not imcompetent 1 basket',
          '18: Ragnar the not imcompetent gathers [11]-season frogs and turtles (5) basket: [10]clams (4) basket breaks.',
          '18: You share good feelings with Jonayla [3]',
          '18.5: UgUgOogOog gives Ragnar the not imcompetent 8 food',
          '18.5: Ragnar the not imcompetent gathers [12]wild vegetables (8) basket: [14]grain (6)',
          '18.5: You share good feelings with UgUgOogOog [2]',
          '19: Ragnar the not imcompetent gathers [11]-season frogs and turtles (5) basket: [2]clams (4)',
          '19: Ragnar the not imcompetent gives UgUgOogOog 5 food',
          '19: You share good feelings with Jonayla [4]',
          '19.5: Ragnar the not imcompetent gathers [13]wild vegetables (8) basket: [9]mushrooms (6)',
          '19.5: Ragnar the not imcompetent gives Alexander 10 food',
          '19.5: You share good feelings with UgUgOogOog [2]',
          '20: Ragnar the not imcompetent gathers [14]-season turtle eggs (7) basket: [5]clams (4) basket breaks.',
          '20: You share good feelings with UgUgOogOog [2]',
          '20.5: Alexander gives Ragnar the not imcompetent 1 basket',
          '20.5: Ragnar the not imcompetent gathers [14]grain (6) basket: [6]clams (4)',
          '20.5: You share good feelings with UgUgOogOog',
          '21: Ragnar the not imcompetent gathers [15]-season wild vegetables (8) basket: [5]clams (4)',
          '21: Ragnar the not imcompetent gives UgUgOogOog 8 food',
          '21: You share good feelings with UgUgOogOog',
          '21.5: Ragnar the not imcompetent studies crafting technique, but does not understand it yet. [6]',
          '21.5: You share good feelings with UgUgOogOog',
          '22: UgUgOogOog gives Ragnar the not imcompetent 1 food',
          '22: Ragnar the not imcompetent gathers [roll 5]-season clams (4) basket: [5]clams (4) basket breaks.',
        ],
        consentList: ['!all'],
        worked: false,
        inviteList: ['UgUgOogOog', 'Jonayla', '!pass'],
        inviteIndex: 1,
        guarding: ['Gull', 'Mist'],
        activity: 'gather',
      },
      Jonayla: {
        gender: 'female',
        food: 2,
        grain: 6,
        basket: 1,
        spearhead: 0,
        handle: {
          id: '1355712663820177438',
          bot: false,
          system: false,
          flags: 0,
          username: 'jonayla_19105',
          globalName: 'Jonayla',
          discriminator: '0',
          avatar: null,
          banner: null,
          accentColor: null,
          avatarDecoration: null,
          createdTimestamp: 1743297486978,
          defaultAvatarURL: 'https://cdn.discordapp.com/embed/avatars/0.png',
          hexAccentColor: null,
          tag: 'jonayla_19105',
          avatarURL: null,
          displayAvatarURL: 'https://cdn.discordapp.com/embed/avatars/0.png',
          bannerURL: null,
        },
        name: 'Jonayla',
        strength: 'average',
        profession: 'crafter',
        canCraft: true,
        history: [
          '14.5: Jonayla female joined the tribe.',
          '14.5: Jonayla crafts[5] a spearhead',
          '14.5: Jonayla gives Susan the winner 1 spearhead',
          '14.5: You share good feelings with Susan the winner [3]',
          '15: Jonayla crafts[5] a basket',
          '15: Jonayla gives UgUgOogOog 1 basket',
          '15: UgUgOogOog gives Jonayla 1 food',
          '15: You share good feelings with Susan the winner [3]',
          '15.5: Jonayla crafts[6] a basket',
          '15.5: Jonayla gives Alexander 1 basket',
          '15.5: UgUgOogOog gives Jonayla 4 food',
          '15.5: UgUgOogOog gives Jonayla 1 basket',
          '16: Jonayla crafts[4] a basket',
          '16: Jonayla gives Ragnar the not imcompetent 1 basket',
          '16: UgUgOogOog gives Jonayla 4 food',
          '16: Jonayla gives birth to a male-child, Indigo',
          '16: You share good feelings with Susan the winner [2]',
          '16.5: Jonayla crafts[5] a basket',
          '16.5: Jonayla gives Alexander 1 basket',
          '16.5: UgUgOogOog gives Jonayla 4 food',
          '16.5: You share good feelings with Susan the winner [4]',
          '16.5: You share good feelings with Ragnar the not imcompetent [1]',
          '17: Jonayla crafts[5] a basket',
          '17: Jonayla gives Ragnar the not imcompetent 1 basket',
          '17: UgUgOogOog gives Jonayla 6 food',
          '17.5: Jonayla creates something[2], but it is not a spearhead',
          '17.5: UgUgOogOog gives Jonayla 6 food',
          '17.5: Jonayla gives birth to a male-child, Kohl',
          '17.5: You share good feelings with Susan the winner [2]',
          '18: Jonayla crafts[6] a basket',
          '18: Jonayla gives Alexander 1 basket',
          '18: Jonayla gives Ragnar the not imcompetent 1 basket',
          '18: UgUgOogOog gives Jonayla 2 grain',
          '18: UgUgOogOog gives Jonayla 6 food',
          '18: You share good feelings with Alexander [2]',
          '18: You share good feelings with Ragnar the not imcompetent [3]',
          '18.5: UgUgOogOog gives Jonayla 4 food',
          '18.5: Jonayla crafts[3] a basket',
          '18.5: Jonayla gives UgUgOogOog 1 basket',
          '18.5: You share good feelings with Susan the winner [2]',
          '19: Jonayla crafts[2] a basket',
          '19: UgUgOogOog gives Jonayla 4 food',
          '19: You share good feelings with Ragnar the not imcompetent [4]',
          '19: You share good feelings with Alexander [6]',
          '19.5: Jonayla gathers [12](-3 skill) mushrooms (6) basket: [5]clams (4)',
          '20: Jonayla gives Alexander 1 basket',
          '20: Jonayla crafts[4] a spearhead',
          '20: Jonayla gives Susan the winner 1 spearhead',
          '20: Jonayla gives birth to a female-child, Night',
          '20: You share good feelings with Susan the winner [1]',
          '20.5: UgUgOogOog gives Jonayla 4 food',
          '20.5: Jonayla crafts[5] a spearhead',
          '20.5: Jonayla gives Susan the winner 1 spearhead',
          '20.5: You share good feelings with Susan the winner',
          '21: UgUgOogOog gives Jonayla 2 food',
          '21: Jonayla crafts[6] a spearhead',
          '21: Jonayla gives Susan the winner 1 spearhead',
          '21: You share good feelings with Susan the winner',
          '21: Alexander invite you to share good feelings',
          '21.5: UgUgOogOog gives Jonayla 4 food',
          '21.5: UgUgOogOog gives Jonayla 1 basket',
          '21.5: Jonayla gathers [roll 9](-3 skill) clams (4) basket: [9]clams (4)',
          '21.5: Alexander invite you to share good feelings',
          '21.5: You share good feelings with Susan the winner',
          '22: Jonayla gives Alexander 1 basket',
          '22: Jonayla crafts[3] a basket',
          '22: Jonayla gives UgUgOogOog 1 basket',
          '22: UgUgOogOog gives Jonayla 1 basket',
        ],
        worked: false,
        inviteList: [
          'Susan the winner',
          'Alexander',
          'Ragnar the not imcompetent',
          ' !pass',
        ],
        consentList: [
          'Susan the winner',
          'Alexander',
          'Ragnar the not imcompetent',
        ],
        inviteIndex: 0,
        guarding: ['Indigo', 'Night'],
        isPregnant: 'Pine',
        activity: 'craft',
        cannotInvite: true,
      },
    },
  };
  response = reproLib.globalMatingCheck(gameState, {});
  expect(response).toContain('5');
  var playerJMessage = gameState['messages']['Jonayla'];
  expect(playerJMessage).toContain('Ragnar');
  expect(playerJMessage).toContain('flirts');
  expect(playerJMessage).toContain('pregnant');
  var playerRMessage = gameState['messages']['Ragnarthenotimcompetent'];
  expect(playerRMessage).toContain('pregnant');
});
