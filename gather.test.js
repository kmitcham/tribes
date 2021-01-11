const lib = require("./gather.js");

test('low roll', () =>{
    var gameState = {
          "seasonCounter": 1,
          "gameTrack": {
            "veldt": 1,
            "forest": 1,
            "marsh": 1,
            "hills": 1
          },
          "name": "flounder-tribe",
          "population": {
            "gather1": {
              "gender": "female",
              "spearhead": 0,
              "name": "gather1",
              "food":0,
              "profession": "hunter"
            }
          },
          "currentLocationName": "marsh",
          "round": "work"
    }
    var playername = "gather1"
    var player = gameState["population"][playername]
    output = lib.gather(playername, player, 3, gameState)
    expect(output).toMatch('clams');
    expect(gameState["population"][playername]['food']).toBe(4)
});

test('basket', () =>{
    var gameState = {
          "seasonCounter": 1,
          "gameTrack": {
            "veldt": 1,
            "forest": 1,
            "marsh": 1,
            "hills": 1
          },
          "name": "flounder-tribe",
          "population": {
            "gather1": {
              "gender": "female",
              "basket": 2,
              "name": "gather1",
              "food":0,
              "profession": "gatherer"
            }
          },
          "currentLocationName": "marsh",
          "round": "work"
    }
    var playername = "gather1"
    var player = gameState["population"][playername]
    output = lib.gather(playername, player, 3, gameState)
    expect(output).toMatch('clams');
    expect(output).toMatch('basket');
    expect(gameState["population"][playername]['food']).toBeGreaterThan(4)
});
