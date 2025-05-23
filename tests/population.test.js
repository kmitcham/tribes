const pop = require('../libs/population')

// Mock console.log to capture logs
console.log = jest.fn();

test("Name with @", ()=>{
    var gameState = {
        "population": {
            "demander": {
                "name": "demander",
                "faction":"for"
              },
              "neutral1": {
                "name": "neutral1",
                "faction":"neutral"
              }, 
              "testNick": {
                "name":"testNick",
                "handle":{
                  "displayName":"nick"
                }
              },
              "kevinmitcham22": {
                "gender": "male",
                "food": 10,
                "grain": 4,
                "basket": 0,
                "spearhead": 0,
                "handle": {
                  "id": "427681770930962435",
                  "bot": false,
                  "system": false,
                  "flags": 0,
                  "username": "kevinmitcham",
                  "globalName": "kevinmitcham",
                  "discriminator": "0",
                  "avatar": "590d429490ae1be623d1fe906fecdcbc",
                  "banner": null,
                  "accentColor": null,
                  "avatarDecoration": null,
                  "createdTimestamp": 1522037680133,
                  "defaultAvatarURL": "https://cdn.discordapp.com/embed/avatars/5.png",
                  "hexAccentColor": null,
                  "tag": "kevinmitcham",
                  "avatarURL": "https://cdn.discordapp.com/avatars/427681770930962435/590d429490ae1be623d1fe906fecdcbc.webp",
                  "displayAvatarURL": "https://cdn.discordapp.com/avatars/427681770930962435/590d429490ae1be623d1fe906fecdcbc.webp",
                  "bannerURL": null
                },
                "name": "kevinmitcham22",
                "strength": "weak",
                "profession": "hunter",
                "history": [
                  "0.5: kevinmitcham22 male joined the tribe.  kevinmitcham22 is weak.",
                  "0.5: became chief"
                ],
                "vote": "kevinmitcham22",
                "chief": true
              },
          
                        },
        "round": "work"
    }
    expectName = 'demander'
    player = pop.memberByName('@demander', gameState);
    expect(player).toBeTruthy();
    actualName = player.name;
    expect(actualName).toEqual(expectName);
    expectName = 'testNick'
    player = pop.memberByName('nick', gameState);
    expect(player).toBeTruthy();
    actualName = player.name;
    expect(actualName).toEqual(expectName);
    expectName = 'kevinmitcham22'
    player = pop.memberByName('kevinmitcham', gameState);
    expect(player).toBeTruthy();
    actualName = player.name;
    expect(actualName).toEqual(expectName);
})

test("person by ignoresCase", ()=>{
    var gameState = {
        "population": {
            "demander": {
                "name": "demander",
                "faction":"for",
                "handle":{
                  "id":7
                }
              },
              "pro1": {
                "name": "pro1",
                "faction":"for"
              }
                        },
        "round": "work"
    }
    expectName = 'demander'
    player = pop.memberByName('DEMANDER', gameState);
    expect(player).toBeTruthy();
    actualName = player.name;
    expect(actualName).toEqual(expectName);
  })

  test("person by ignoresCase with spaces" , ()=>{
    var gameState = {
        "population": {
            "demander": {
                "name": "dem Ander",
                "faction":"for",
                "handle":{
                  "id":7
                }
              },
              "pro1": {
                "name": "pro1",
                "faction":"for"
              }
                        },
        "round": "work"
    }
    expectName = 'dem Ander'
    player = pop.memberByName('DEM ANDER', gameState);
    expect(player).toBeTruthy();
    actualName = player.name;
    expect(actualName).toEqual(expectName);
  })

test("person with gender", ()=>{
  var gameState = {
    "population": {
     },
  }
  memberName = "Sally";
  pop.addToPopulation(gameState,memberName, "female", null, null);
  player = pop.memberByName(memberName, gameState);
  actualName = player.name;
  expect(actualName).toEqual(memberName);
  tribeMessage = gameState.messages["tribe"]
  expect(tribeMessage).toContain("female")
  expect(tribeMessage).toContain(memberName);
  pop.showHistory(memberName, gameState);
  playerMessage = gameState.messages[memberName];
  expect(playerMessage).toContain("joined the tribe");
})

test("person with gender and profession", ()=>{
  var gameState = {
    "population": {
     },
  }
  memberName = "Chris";
  pop.addToPopulation(gameState,memberName, "female", "hunter", null);
  player = pop.memberByName(memberName, gameState);
  actualName = player.name;
  expect(actualName).toEqual(memberName);
  tribeMessage = gameState.messages["tribe"]
  expect(tribeMessage).toContain("female")
  expect(tribeMessage).toContain(memberName);
  expect(tribeMessage).toContain("hunter");
  playerMessage = gameState.messages[memberName]
  
})

test("list names by gender", ()=>{
  var gameState = {
    "population": {
        "male1": {
            "name": "male1",
            "gender":"male"

          },
          "genderless": {
            "name": "genderless",
          },
          "male2": {
            "name": "male2",
            "gender":"male",
          },
          "female1": {
            "name": "female1",
            "gender":"female",
          },
          "female2": {
            "name": "female2",
            "gender":"female",
          },
    },
  }
  expectMale = ["male1", "male1"];
  expectFemale = ["female1", "female1"];
  actualMale = pop.getAllNamesByGender(gameState.population, "male");
  actualFemale = pop.getAllNamesByGender(gameState.population, "female");
  expect(expectMale.includes("male1"));
  expect(expectMale.includes("male2"));
  expect(2).toEqual(actualMale.length)
  expect(expectFemale.includes("female1"));
  expect(expectFemale.includes("female2"));
  expect(2).toEqual(actualMale.length)
})

test("string list to array", ()=>{
  var input = "a b c";
  var expected = ['a','b','c'];
  var actual = pop.convertStringToArray(input);
  expect(actual).toEqual(expected);

  input = "a,b,c";
  expected = ['a','b','c'];
  actual = pop.convertStringToArray(input);
  expect(actual).toEqual(expected);

  input = "a";
  expected = ['a'];
  actual = pop.convertStringToArray(input);
  expect(actual).toEqual(expected);
  
  input = "";
  expected = [];
  actual = pop.convertStringToArray(input);
  expect(actual).toEqual(expected);

  input = "a b, c";
  expected = ['a b', 'c'];
  actual = pop.convertStringToArray(input);
  expect(actual).toEqual(expected);

  input = [];
  expected = [];
  actual = pop.convertStringToArray(input);
  expect(actual).toEqual(expected);
  
  input = null;
  expected = [];
  actual = pop.convertStringToArray(input);
  expect(actual).toEqual(expected);
});

// Mock console.log to capture logs
console.log = jest.fn();

describe('nameFromAtNumber function (revised)', () => {
    let bot;
    let nameFromAtNumber = pop.nameFromAtNumber
    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();

        // Mock bot object with users.cache.get
        bot = {
            users: {
                cache: {
                    get: jest.fn()
                }
            }
        };
    });

    test('should return cleaned displayName when atNumber starts with @ and user is found', () => {
        const atNumber = '@12345';
        bot.users.cache.get.mockReturnValueOnce({ displayName: 'Alice!_123' });

        const result = nameFromAtNumber(atNumber, bot);

        expect(bot.users.cache.get).toHaveBeenCalledWith('12345');
        expect(result).toBe('Alice!_123');
        expect(console.log).not.toHaveBeenCalled();
    });

    test('should return cleaned displayName when atNumber starts with <@ and user is found', () => {
        const atNumber = '<@12345>';
        bot.users.cache.get.mockReturnValueOnce({ displayName: 'Bob!_456' });

        const result = nameFromAtNumber(atNumber, bot);

        expect(bot.users.cache.get).toHaveBeenCalledWith('12345');
        expect(result).toBe('Bob!_456');
        expect(console.log).not.toHaveBeenCalled();
    });

    test('should return cleaned atNumber when user not found in cache', () => {
        const atNumber = '@12345';
        bot.users.cache.get.mockReturnValueOnce(null);

        const result = nameFromAtNumber(atNumber, bot);

        expect(bot.users.cache.get).toHaveBeenCalledWith('12345');
        expect(result).toBe('12345');
        expect(console.log).toHaveBeenCalledWith('No luck getting user for @12345');
    });

    test('should clean atNumber by removing non-word characters except !', () => {
        const atNumber = '@12345#$%';
        bot.users.cache.get.mockReturnValueOnce(null);

        const result = nameFromAtNumber(atNumber, bot);

        expect(result).toBe('12345');
        expect(console.log).toHaveBeenCalledWith('No luck getting user for @12345#$%');
    });

    test('should preserve ! in displayName when user is found', () => {
        const atNumber = '@12345';
        bot.users.cache.get.mockReturnValueOnce({ displayName: 'Hello!World@#' });

        const result = nameFromAtNumber(atNumber, bot);

        expect(result).toBe('Hello!World');
        expect(console.log).not.toHaveBeenCalled();
    });

    test('should clean atNumber when bot is not provided', () => {
        const atNumber = '@12345#$%';
        const result = nameFromAtNumber(atNumber, null);

        expect(result).toBe('12345');
        expect(console.log).not.toHaveBeenCalled();
    });

    test('should clean atNumber when it does not start with @ or <', () => {
        const atNumber = 'User#$%!Name';
        const result = nameFromAtNumber(atNumber, bot);

        expect(result).toBe('User!Name');
        expect(bot.users.cache.get).not.toHaveBeenCalled();
        expect(console.log).not.toHaveBeenCalled();
    });

    test('should log "Bad call" and return empty string when atNumber is null', () => {
        const atNumber = null;
        const result = nameFromAtNumber(atNumber, bot);

        expect(result).toBe('');
        expect(console.log).toHaveBeenCalledWith('Bad call to nameFromAtNumber:' + atNumber);
        expect(bot.users.cache.get).not.toHaveBeenCalled();
    });

    test('should log "Bad call" and return empty string when atNumber is undefined', () => {
        const atNumber = undefined;
        const result = nameFromAtNumber(atNumber, bot);

        expect(result).toBe('');
        expect(console.log).toHaveBeenCalledWith('Bad call to nameFromAtNumber:' + atNumber);
        expect(bot.users.cache.get).not.toHaveBeenCalled();
    });

    test('should log "Bad call" and return empty string when atNumber is empty', () => {
        const atNumber = '';
        const result = nameFromAtNumber(atNumber, bot);

        expect(result).toBe('');
        expect(console.log).toHaveBeenCalledWith('Bad call to nameFromAtNumber:');
        expect(bot.users.cache.get).not.toHaveBeenCalled();
    });

    test('should handle atNumber with only special characters after cleaning', () => {
        const atNumber = '@#$%^&*';
        const result = nameFromAtNumber(atNumber, bot);

        expect(result).toBe('');
        expect(bot.users.cache.get).toHaveBeenCalledWith('');
        expect(console.log).toHaveBeenCalledWith('No luck getting user for @#$%^&*');
    });
});