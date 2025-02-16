var feedlib = require("../libs/feed.js");

test("feed filtered by parent", () =>{
    var dummyMessage = {
        "author":
            {
                "message":function (message){} ,
                "send":function (message){} 
            }
        }
    var gameState = {
        "population": {
            "p1":{
                "name": "p1",
                "gender": "male",
                "activity": "gather",
                "food":20,
                "grain":10
            },
            "p2":{
              "name": "p2",
              "gender": "female",
              "grain":10
            }},
        "children":{
            "C1": {
                "mother": "p2",
                "father": "p1",
                "age": 4,
                "food": 0,
                "gender": "female",
                "name": "C1"
              },
              "C2": {
                "mother": "p2",
                "father": "p1",
                "age": 1,
                "food": 0,
                "gender": "female",
                "name": "C2"
              },
              "C3": {
                "mother": "p4",
                "father": "p5",
                "age": 1,
                "food": 0,
                "gender": "female",
                "name": "C3"
              }
        }
    }
    //module.exports.feed = ( msg, player, amount, childList,  gameState) =>{
    response = feedlib.feed(dummyMessage, gameState.population.p1, 2, ["p2"], gameState)
    expect(response).toBe("p1 feeds 2 to C1\np1 feeds 2 to C2\n")
});

test("feed !all", () =>{
    var dummyMessage = {
        "author":
            {
                "message":function (message){} ,
                "send":function (message){} 
            }
        }
    var gameState = {
        "population": {
            "p1":{
                "name": "p1",
                "gender": "male",
                "activity": "gather",
                "food":20,
                "grain":10
            },
            "p2":{
              "name": "p2",
              "gender": "female",
              "grain":10
            }},
        "children":{
            "C1": {
                "mother": "p2",
                "father": "p1",
                "age": 4,
                "food": 0,
                "gender": "female",
                "name": "C1"
              },
              "C2": {
                "mother": "p2",
                "father": "p1",
                "age": 1,
                "food": 0,
                "gender": "female",
                "name": "C2"
              },
              "C3": {
                "mother": "p4",
                "father": "p5",
                "age": 1,
                "food": 0,
                "gender": "female",
                "name": "C3"
              }
        }
    }
    //module.exports.feed = ( msg, player, amount, childList,  gameState) =>{
    response = feedlib.feed(dummyMessage, gameState.population.p1, 2, ["!all"], gameState)
    expect(response).toBe("p1 feeds 2 to C1\np1 feeds 2 to C2\np1 feeds 2 to C3\n")
});