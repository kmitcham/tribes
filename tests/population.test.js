const pop = require('../libs/population')

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