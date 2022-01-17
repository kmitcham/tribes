var banishlib = require("./banish.js");

test("banish person", () =>{
    var gameState = {
        "name": "unitTest-tribe",
          "population": {
              "p1":{
                  "name": "p1",
                  "gender": "female",
                  "inviteList":["p2","!pass"],
                  "consentList":["p2"],
                  "declineList":[]
              },
              "p2":{
                "name": "p2",
                "gender": "female",
                "consentList":["p1"],
                "nurser": [
                  "North"
                ],                
                "cannotInvite": true
              }
              , "p3":{
                "name": "p3",
                "gender": "male",
                "consentList":["p1"],
                "cannotInvite":true
              },
              "p4":{
                  "name": "p4",
                  "gender": "male",
                  "declineList":[],
                  "cannotInvite":true
                }
           },
           "children": {
              "unborn": {
                "mother": "p2",
                "father": "p1",
                "age": -1, "name":"unborn", "food": 2, 'gender':'male'
              },             
              "nurser": {
                "mother": "p2",
                "father": "p1",
                "age": 3, "name":"nurser", "food": 2, 'gender':'male'
                },
              "weaned": {
                "mother": "p2",
                "father": "p1",
                "age": 4, "name":"weaned", "food": 2, 'gender':'male'
              }
            },
          "reproductionRound": true
    }
    banishlib.banish(gameState, "p2", null)
    nameList = Object.keys(gameState.population)
    expect(nameList.indexOf("p2")).toBe(-1)
    expect(gameState.population.p1.inviteList.indexOf("p2")).toBe(-1)
    removed = gameState.population["p2"] || null
    expect(removed).toBeNull()
    removed = gameState["children"]["unborn"] || null
    expect(removed).toBeNull()    
    removed = gameState["children"]["nurser"] || null
    expect(removed).toBeNull()
    notRemoved = gameState["children"]["weaned"] || null
    expect(notRemoved.mother).toBe("p2")
});