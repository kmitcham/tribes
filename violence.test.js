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
        }
    }
    var message = 'all tests pass'
    factions = violencelib.getGameFactions(gameState) 
    var factionNames = Object.keys(factions);
    expect(factionNames.length).toBe(4)
    expect(factions["for"].length).toBe(2) // demander and pro1
    expect(factions["against"].length).toBe(1) // one against
    expect(factions["undeclared"].length).toBe(2) // one undeclared
    expect(factions["neutral"].length).toBe(1) // neutral, abstain and illegal
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
            "isSick":3,
            "chief": true
        }
    ]
    expectedScore = 5
    actualScore = violencelib.getFactionBaseScore(faction)
    expect(actualScore).toBe(expectedScore)
})

test("bonus checking ", ()=>{
    var attacker = {
        "name":"attacker",
        "strength":"strong",
        "profession":"hunter",
        "strategy":"attack",
        "target":"defender"
    }
    var defender = {
        "name":"defender",
        "strategy":"attack"
    }
    response = violencelib.computeBonus(attacker,defender);
    expect(response).toBe(2)
    defender.isPregnant = true
    response = violencelib.computeBonus(attacker,defender);
    expect(response).toBe(0)
    attacker.spearhead = 1
    response = violencelib.computeBonus(attacker,defender);
    expect(response).toBe(2)
    attacker.isSick = 3
    response = violencelib.computeBonus(attacker,defender);
    expect(response).toBe(0)
    delete attacker.strength
    response = violencelib.computeBonus(attacker,defender);
    expect(response).toBe(-1)
    attacker.strength = "weak"
    response = violencelib.computeBonus(attacker,defender);
    expect(response).toBe(-2)
    defender.strategy = 'defend'
    expect(violencelib.computeBonus(attacker,defender)).toBe(-4)
    defender.strategy = 'run'
    expect(violencelib.computeBonus(attacker,defender)).toBe(-4)
    attacker.isInjured = true
    expect(violencelib.computeBonus(attacker,defender)).toBe(-5)
    defender.escaped = true
    expect(violencelib.computeBonus(attacker,defender)).toBeLessThan(-12)
})

test("Faction Voting -> balanced", () =>{
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
              "con2": {
                "name": "con2",
                "faction":"against"
              },
              "neutral1": {
                "name": "neutral1",
                "faction":"neutral"
              }
        },
        "demand":"some demand"
    }
    var message = 'Tribal society breaks down as VIOLENCE is required to settle the issue of some demand'
    result = violencelib.getFactionResult(gameState)
    expect(result).toBe(message)
});

test("Faction Voting -> Overwhelmning For", () =>{
    var gameState = {
        "population": {
            "demander": {
                "name": "demander",
                "faction":"for"
              },
              "pro1": {
                "name": "pro1",
                "faction":"for",
                "profession":"hunter",
                "gender":"male"
              },
              "pro2": {
                "name": "pro2",
                "profession":"hunter",
                "gender":"male",
                "faction":"for"
              },
              "con1": {
                "name": "con1",
                "faction":"against"
              },
              "abstain": {
                "name": "abstain"
              },
              "neutral1": {
                "name": "neutral1",
                "faction":"neutral"
              }
        },
        "demand":"some demand"
    }
    var message = 'The Demand faction has overwhelming support (10).  The demand to some demand should be done immediately.'
    result = violencelib.getFactionResult(gameState)
    expect(result).toBe(message)
});
test("Faction Voting -> against", () =>{
    var gameState = {
        "population": {
            "demander": {
                "name": "demander",
                "faction":"for"
              },
              "con1": {
                "name": "con1",
                "faction":"against"
              },
              "con2": {
                "name": "con2",
                "faction":"against"
              },
              "con3": {
                "name": "con3",
                "faction":"against"
              },
              "neutral1": {
                "name": "neutral1",
                "faction":"neutral",
                "canCraft":true
              }
        },
        "demand":"some demand"
    }
    var message = 'The Oppostion faction has overwhelming support (6). The demand to some demand should be ignored.'
    result = violencelib.getFactionResult(gameState)
    expect(result).toBe(message)
});

test("Faction Voting -> marginal For", () =>{
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
              "neutral1": {
                "name": "neutral1",
                "faction":"neutral"
              }
        },
        "demand":"some demand"
    }
    var message = 'The Demand faction has overwhelming support (4).  The demand to some demand should be done immediately.'
    result = violencelib.getFactionResult(gameState)
    expect(result).toBe(message)
});
test("Display faction -> basic test", () =>{
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
              "und1": {
                "name": "und1"
              },
              "und2": {
                "name": "und2"            
              },
              "und3": {
                "name": "und3"            
              }
        },
        "demand":"some demand"
    }
    result = violencelib.getFactionResult(gameState)
    expect(result).toContain('und1, und2, und3 are not yet declared (for, against, neutral)')
    expect(result).toContain('demander, pro1 are for the demand')
    expect(result).toContain('con1 is against the demand')
    expect(result).toContain('Nobody is unwilling to fight about it')
});


test("ResolveViolence first test", () =>{
  var gameState = {
      "violence": "test violence",
      "population": {
          "demander": {
              "name": "demander",
              "faction":"for",
              "strategy": "attack",
              "attack_target":"con1"
            },
          "pro1": {
              "name": "pro1",
              "faction":"for",
              "profession":"hunter",
              "gender":"male",
              "strategy": "attack",
              "attack_target":"con1"
            },
          "pro2": {
              "name": "pro2",
              "profession":"hunter",
              "gender":"male",
              "faction":"for",
              "strategy":"defend"
          },
          "con1": {
              "name": "con1",
              "faction":"against",
              "strategy":"defend"
          },
          "con2": {
              "name": "con2",
              "faction":"against",
              "strategy":"run"
          },
          "con3": {
              "name": "con3", "escaped":true
          }
      },
      "demand":"some demand"
  }  
  expected = "Some violence output";
  var actual = violencelib.resolveViolence(gameState)
  expect(gameState.population["con2"].escaped).toBeTruthy();
  expect(actual).toContain("pro1 attacks con1")
  expect(actual).toContain("demander attacks con1")
  expect(actual).toContain("con1 attacks")
  expect(actual).toContain("con2 runs away from the fighting")
});

test("ResolveViolence for fatality", () =>{
  var gameState = {
      "violence": "test violence",
      "seasonCounter":33,
      "graveyard":{},
      "population": {
          "demander": {
              "name": "demander",
              "faction":"for",
              "profession":"hunter",
              "spearhead":1,
              "strength":"strong",
              "strategy": "attack",
              "attack_target":"con1x"
            },
          "pro1": {
              "name": "pro1",
              "faction":"for",
              "profession":"hunter",
              "spearhead":1,
              "strength":"strong",
              "profession":"hunter",
              "gender":"male",
              "strategy": "attack",
              "attack_target":"con1x"
            },
          "pro2": {
              "name": "pro2",
              "profession":"hunter",
              "spearhead":1,
              "strength":"strong",
              "gender":"male",
              "faction":"for",
              "strategy":"defend"
          },
          "con1x": {
              "name": "con1x",
              "faction":"against",
              "isInjured": true,
              "strength":"weak",
              "strategy":"defend"
          }
      },
      "demand":"some demand"
  }  
  var actual = violencelib.resolveViolence(gameState)
  expect(actual).toContain("pro1 attacks con1")
  expect(actual).toContain("demander attacks con1")
  //expect(actual).toContain("dump")
});