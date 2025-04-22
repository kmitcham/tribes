const lib = require("../libs/hunt.js");

test('no profession', () =>{
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
            "food":0,
          }
        },
        "currentLocationName": "marsh",
        "round": "work"
  }
  var playername = "Hunter1"
  var player = gameState["population"][playername]
  output = lib.hunt(playername, player, 10, gameState)
  expect(output).toContain('[10]-skill');
  expect(gameState["gameTrack"]["marsh"]).toBe(2)
  expect(gameState["population"][playername]['food']).toBe(0)
});
test('non-hunting profession', () =>{
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
            "food":0,
            "profession": "accountant"
          }
        },
        "currentLocationName": "marsh",
        "round": "work"
  }
  var playername = "Hunter1"
  var player = gameState["population"][playername]
  output = lib.hunt(playername, player, 10, gameState)
  expect(output).toContain('[10]-skill');
  expect(gameState["gameTrack"]["marsh"]).toBe(2)
  expect(gameState["population"][playername]['food']).toBe(0)
});

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
              "food":0,
              "profession": "hunter"
            }
          },
          "currentLocationName": "marsh",
          "round": "work"
    }
    var playername = "Hunter1"
    var player = gameState["population"][playername]
    output = lib.hunt(playername, player, 3, gameState)
    expect(output).toMatch('Injury!');
    expect(gameState["population"][playername]["isInjured"]).toBeTruthy()
    expect(gameState["gameTrack"]["marsh"]).toBe(2)
    expect(gameState["population"][playername]['food']).toBe(0)
});

test('injury edge case', () =>{
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
              "food":0,
              "profession": "hunter"
            }
          },
          "currentLocationName": "marsh",
          "round": "work"
    }
    var playername = "Hunter1"
    var player = gameState["population"][playername]
    output = lib.hunt(playername, player, 5, gameState)
    expect(output).toMatch('Injury!');
    expect(gameState["population"][playername]["isInjured"]).toBeTruthy()
    expect(gameState["gameTrack"]["marsh"]).toBe(2)
    expect(gameState["population"][playername]['food']).toBe(0)
});
test('injury avoided with strong case', () =>{
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
              "strength":"strong",
              "food":0,
              "profession": "hunter"
            }
          },
          "currentLocationName": "marsh",
          "round": "work"
    }
    var playername = "Hunter1"
    var player = gameState["population"][playername]
    output = lib.hunt(playername, player, 5, gameState)
    expect(output).toMatch('No game');
    expect(output).toMatch('strong');
    expect(gameState["population"][playername]["isInjured"]).not.toBeTruthy()
    expect(gameState["gameTrack"]["marsh"]).toBe(2)
    expect(gameState["population"][playername]['food']).toBe(0)
});
test('spear fail', () =>{
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
              "spearhead": 1,
              "food":0,
             "name": "Hunter1",
              "profession": "hunter"
            }
          },
          "currentLocationName": "marsh",
          "round": "work"
    }
    var playername = "Hunter1"
    var player = gameState["population"][playername]
    output = lib.hunt(playername, player, 8, gameState)
    expect(output).toMatch('No game');
    expect(output).not.toMatch('+spearhead');
    expect(gameState["gameTrack"]["marsh"]).toBe(2)
    expect(gameState["population"][playername]['food']).toBe(0)
});
test('spear conversion', () =>{
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
              "spearhead": 1,
              "food":0,
              "name": "Hunter1",
              "profession": "hunter"
            }
          },
          "currentLocationName": "marsh",
          "round": "work"
    }
    var playername = "Hunter1"
    var player = gameState["population"][playername]
    output = lib.hunt(playername, player, '9', gameState)
    expect(output).toMatch('small fish');
    expect(output).toMatch('+spearhead');
    expect(gameState["population"][playername]['food']).toBe(12)
    expect(gameState["gameTrack"]["marsh"]).toBe(2)
});
test('threshold, no spear', () =>{
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
              "food":0,
              "name": "Hunter1",
              "profession": "hunter"
            }
          },
          "currentLocationName": "marsh",
          "round": "work"
    }
    var playername = "Hunter1"
    var player = gameState["population"][playername]
    output = lib.hunt(playername, player, 9, gameState)
    expect(output).toMatch('marsh rat');
    expect(gameState["population"][playername]['food']).toBe(2)
    expect(gameState["population"][playername]['worked']).toBeTruthy()
    expect(gameState["gameTrack"]["marsh"]).toBe(2)
});

test('roll too high', () =>{
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
              "food":0,
              "name": "Hunter1",
              "profession": "hunter"
            }
          },
          "currentLocationName": "marsh",
          "round": "work"
    }
    var playername = "Hunter1"
    var player = gameState["population"][playername]
    output = lib.hunt(playername, player, 19, gameState)
    expect(output).toMatch('hippo');
    expect(gameState["population"][playername]['food']).toBe(80)
    expect(gameState["population"][playername]['worked']).toBeTruthy()
    expect(gameState["gameTrack"]["marsh"]).toBe(2)
});
test('roll too low', () =>{
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
              "food":0,
              "profession": "hunter"
            }
          },
          "currentLocationName": "marsh",
          "round": "work"
    }
    var playername = "Hunter1"
    var player = gameState["population"][playername]
    output = lib.hunt(playername, player, 2, gameState)
    expect(output).toMatch('Injury!');
    expect(gameState["population"][playername]["isInjured"]).toBeTruthy()
    expect(gameState["gameTrack"]["marsh"]).toBe(2)
    expect(gameState["population"][playername]['food']).toBe(0)
});
test('game track limited', () =>{
  var gameState = {
        "seasonCounter": 1,
        "gameTrack": {
          "veldt": 1,
          "forest": 1,
          "marsh": 5,
          "hills": 1
        },
        "name": "flounder-tribe",
        "population": {
          "Hunter1": {
            "gender": "female",
            "spearhead": 0,
            "name": "Hunter1",
            "food":0,
            "profession": "hunter"
          }
        },
        "currentLocationName": "marsh",
        "round": "work"
  }
  var playername = "Hunter1"
  var player = gameState["population"][playername]
  output = lib.hunt(playername, player, 18, gameState)
  expect(gameState["gameTrack"]["marsh"]).toBe(6)
  expect(gameState["population"][playername]['food']).toBe(40)
});
test('scout current location', () =>{
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
            "food":0,
            "name": "Hunter1",
            "profession": "hunter"
          }
        },
        "currentLocationName": "marsh",
        "round": "work"
  }
  var location = null
  output = lib.getScoutMessage(location, gameState)
  expect(output).toMatch('hippo');
});
test('scout current location, capped', () =>{
  var gameState = {
        "seasonCounter": 1,
        "gameTrack": {
          "veldt": 1,
          "forest": 1,
          "marsh": 10,
          "hills": 1
        },
        "name": "flounder-tribe",
        "population": {
          "Hunter1": {
            "gender": "female",
            "spearhead": 0,
            "food":0,
            "name": "Hunter1",
            "profession": "hunter"
          }
        },
        "currentLocationName": "marsh",
        "round": "work"
  }
  var location = null
  output = lib.getScoutMessage(location, gameState)
  expect(output).toMatch('waterfowl');
  expect(output).toMatch('capped');
  expect(output).not.toMatch('deer');
});
test('scout alt location, capped', () =>{
  var gameState = {
        "seasonCounter": 1,
        "gameTrack": {
          "veldt": 6,
          "forest": 1,
          "marsh": 11,
          "hills": 1
        },
        "name": "flounder-tribe",
        "population": {
          "Hunter1": {
            "gender": "female",
            "spearhead": 0,
            "food":0,
            "name": "Hunter1",
            "profession": "hunter"
          }
        },
        "currentLocationName": "marsh",
        "round": "work"
  }
  var location = "veldt"
  output = lib.getScoutMessage(location, gameState)
  expect(output).toMatch('antelope');
  expect(output).toMatch('capped');
  expect(output).not.toMatch('zebra');
})