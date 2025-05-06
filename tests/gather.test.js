const lib = require("../libs/gather.js");
console.log = jest.fn();

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
              "grain":0,
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
    expect(gameState["population"][playername]['food']).toBe(4)
});


test('good roll', () =>{
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
              "grain":0,
              "profession": "gatherer"
            }
          },
          "currentLocationName": "marsh",
          "round": "work"
    }
    var playername = "gather1"
    var player = gameState["population"][playername]
    output = lib.gather(playername, player, 16, gameState)
    expect(output).toMatch('grain');
    expect(gameState["population"][playername]['food']).toBe(0)
    expect(gameState["population"][playername]['grain']).toBe(6)
}); 

test('basket adds food', () =>{
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
              "grain":0,
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
    combo = gameState["population"][playername]['food'] + gameState["population"][playername]['grain'] 
    expect(combo).toBeGreaterThan(4)
});

test('no skill roll', () =>{
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
            "hunter1": {
              "gender": "female",
              "spearhead": 0,
              "name": "hunter1",
              "food":0,
              "grain":0,
              "profession": "hunter"
            }
          },
          "currentLocationName": "marsh",
          "round": "work"
    }
    var playername = "hunter1"
    var player = gameState["population"][playername]
    output = lib.gather(playername, player, 10, gameState)
    expect(output).toMatch('clams');
    expect(gameState["population"][playername]['food']).toBe(4)
});

test('no profession roll', () =>{
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
          "hunter1": {
            "gender": "female",
            "spearhead": 0,
            "name": "hunter1",
            "food":0,
            "grain":0,
          }
        },
        "currentLocationName": "marsh",
        "round": "work"
  }
  var playername = "hunter1"
  var player = gameState["population"][playername]
  output = lib.gather(playername, player, 10, gameState)
  expect(output).toMatch('clams');
  expect(gameState["population"][playername]['food']).toBe(4)
});


test('cold season mod', () =>{
    var gameState = {
          "seasonCounter": 2,
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
              "profession": "gatherer"
            }
          },
          "currentLocationName": "marsh",
          "round": "work"
    }
    var playername = "gather1"
    var player = gameState["population"][playername]
    output = lib.gather(playername, player, 10, gameState)
    expect(output).toMatch('clams');
    expect(gameState["population"][playername]['food']).toBe(4)
});

test('guarding 2 kids', () =>{
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
              "grain":0,
              "food":0,
                "guarding": [
                "child1",
                "child2"
                  ],
              "profession": "gatherer"
            }
          },
          "currentLocationName": "marsh",
          "round": "work"
    }
    var playername = "gather1"
    var player = gameState["population"][playername]
    output = lib.gather(playername, player, 10, gameState)
    expect(output).toMatch('eggs');
    expect(gameState["population"][playername]['food']).toBe(7)
});

test('guarding 3 kids', () =>{
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
              "guarding": [
                "child1",
                "child2",
                "child3"
              ],    
              "spearhead": 0,
              "name": "gather1",
              "grain":0,
              "food":0,
              "profession": "gatherer"
            }
          },
          "currentLocationName": "marsh",
          "round": "work"
    }
    var playername = "gather1"
    var player = gameState["population"][playername]
    output = lib.gather(playername, player, 10, gameState)
    expect(output).toMatch('rogs');
    expect(output).toMatch('kids');
    expect(gameState["population"][playername]['food']).toBe(5)
});
test('guarding 4 kids', () =>{
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
              "guarding": [
                "child1",
                "child2",
                "child3",
                "child4"
              ],
                  "name": "gather1",
              "grain":0,
              "food":0,
              "profession": "gatherer"
            }
          },
          "currentLocationName": "marsh",
          "round": "work"
    }
    var playername = "gather1"
    var player = gameState["population"][playername]
    output = lib.gather(playername, player, 10, gameState)
    expect(output).toMatch('kids');
    expect(output).toMatch('clams');
    expect(gameState["population"][playername]['food']).toBe(4)
});

test('guarding 4 kids', () =>{
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
              "guarding": [
                "child1",
                "child2",
                "child3",
                "child4",
                "child5"
              ],
                  "name": "gather1",
              "grain":0,
              "food":0,
              "profession": "gatherer"
            }
          },
          "currentLocationName": "marsh",
          "round": "work"
    }
    var playername = "gather1"
    var player = gameState["population"][playername]
    output = lib.gather(playername, player, 10, gameState)
    expect(output).toMatch('too many');
    expect(gameState["population"][playername]['food']).toBe(0)
});