var endLib = require("./endgame.js");

test("Count dead adults", () =>{
    var gameState = {
        "graveyard":{
            "Hare": {
                "mother": "webbnh",
                "father": "BethMitcham",
                "age": 1,
                "food": 0,
                "gender": "male",
                "name": "Hare",
                "guardians": {
                "webbnh": 3
                }
            },
            "deadAdult1":{
                "profession":"crafter"
            },
            "deadAdult2":{
                "profession":"crafter"
            }
        }
    }
    actualMessage = endLib.countDeadAdults(gameState)
    expect(actualMessage).toBe(2)
    
});