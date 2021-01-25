var violencelib = require("./violence.js");

test("Happy Path Demand", () =>{
    var gameState = {
        "population": {
          "gather1": {
            "name": "gather1",
          }
        },
        "round": "work"
    }
    var playername = "gather1"
    var message = 'all tests pass'
    expectedMessage ="gather1 DEMANDS: all tests pass"
    actualMessage = violencelib.demand(playername, message, gameState)
    expect(actualMessage).toBe(expectedMessage)
    expect(gameState['population'][playername]["faction"]).toEqual("for") 
    expect(gameState['demand']).toEqual(message) 
});

test("Faction Check", () =>{
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
    var message = 'all tests pass'
    factions = violencelib.getGameFactions(gameState) 
    var factionNames = Object.keys(factions);
    expect(factionNames.length).toBe(4)
    expect(factions["for"].length).toBe(2) // demander and pro1
    expect(factions["against"].length).toBe(1) // one against
    expect(factions["undeclared"].length).toBe(2) // one against
    expect(factions["abstain"].length).toBe(1) // abstain, neutral and illegal
});

test("Base Score test", () =>{
    var faction = [
        {   "name": "pro1",
            "faction":"for",
            "gender": "male"
        },
        {   "name": "pro2",
            "faction":"for",
            "gender": "female",
            "strength":"strong"
        }
    ]
    expectedScore = 7
    actualScore = violencelib.getFactionBaseScore(faction)
    expect(actualScore).toBe(expectedScore)
})
test("Base Score pregnant injured", () =>{
    var faction = [
        {   "name": "pro1",
            "faction":"for",
            "gender": "male",
            "isInjured":true
        },
        {   "name": "pro2",
            "faction":"for",
            "gender": "female",
            "isPregnant": true,
            "strength":"strong"
        }
    ]
    expectedScore = 7
    actualScore = violencelib.getFactionBaseScore(faction)
    expect(actualScore).toBe(expectedScore)
})
test("Base Score chief", () =>{
    var faction = [
        {   "name": "pro1",
            "faction":"for",
            "gender": "male",
            "isSick":true,
            "chief": true
        }
    ]
    expectedScore = 5
    actualScore = violencelib.getFactionBaseScore(faction)
    expect(actualScore).toBe(expectedScore)
})