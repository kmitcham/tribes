const pop = require('../libs/population')

test("Name with @", ()=>{
    var gameState = {
        "population": {
            "demander": {
                "name": "demander",
                "faction":"for"
              },
              "pro1": {
                "name": "pro1",
                "faction":"for"
              },
              "con1": {
                "name": "con1",
                "faction":"against"
              },
              "abstain": {
                "name": "abstain"
              },
              "illegal": {
                "name": "illegal",
                "faction":"elephant"
              },
              "neutral1": {
                "name": "neutral1",
                "faction":"neutral"
              }
                        },
        "round": "work"
    }
    expectName = 'demander'
    player = pop.memberByName('@demander', gameState);
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
  memberName = "Steve";
  pop.addToPopulation(gameState,memberName, "female", null, null);
  player = pop.memberByName(memberName, gameState);
  actualName = player.name;
  expect(actualName).toEqual(memberName);
  tribeMessage = gameState.messages["tribe"]
  expect(tribeMessage).toContain("female")
  expect(tribeMessage).toContain(memberName);
  playerMessage = gameState.messages[memberName]
  
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