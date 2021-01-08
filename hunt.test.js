const lib = require("./hunt.js");

test('injury case', () =>{
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
            "Hunter1": {
              "gender": "female",
              "spearhead": 0,
              "name": "Hunter1",
              "profession": "hunter"
            }
          },
          "currentLocationName": "marsh",
          "round": "work"
    }
    var playername = "Hunter1"
    var player = gameState["population"][playername]
    expect(lib.hunt(playername, player, 3, gameState)).toMatch('Injury!');
    expect(gameState["population"][playername]["isInjured"]).toBeTruthy()
    expect(gameState["gameTrack"]["marsh"]).toBe(2)
});