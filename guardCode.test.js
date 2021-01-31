const lib = require("./guardCode.js");

test('simple watch cases', () =>{
    var population = {
        "p1":{
            "name": "p1",
            "worked": false,
            "isInjured": false,
            "guarding": [
              "c1"
            ],
            "nursing": [
              "Ilima"
            ],
            "activity": "gather"
        },
        "p2":{
            "name": "p2",
            "worked": false,
            "isInjured": false,
            "guarding": [],
            "activity": "gather"
        }
    };
    var children = {
        "c1": {
            "mother": "p1",
            "father": "p2",
            "age": 3,
            "name": "c1",
          },
          "unwatched": {
            "mother": "p1",
            "father": "p2",
            "age": 3,
            "name": "unwatched",
          }
    };
    expect(lib.findGuardValueForChild("c1", population, children)).toBe(1);
    expect(lib.findGuardValueForChild("unwatched", population, children)).toBe(0);
    expect(children["c1"].guardians).toBeTruthy();
    expect(Object.keys(children["c1"].guardians).length).toBe(1);
});

test("finds least watched", ()=>{
    var population = {
        "p1":{
            "name": "p1",
            "worked": false,
            "isInjured": false,
            "guarding": [
              "c1"
            ],
            "nursing": [
              "Ilima"
            ],
            "activity": "gather"
        },
        "p2":{
            "name": "p2",
            "worked": false,
            "isInjured": false,
            "guarding": [],
            "activity": "gather"
        }
    };
    var children = {
        "c1": {
            "mother": "p1",
            "father": "p2",
            "age": 3,
            "name": "c1",
          },
          "unwatched": {
            "mother": "p1",
            "father": "p2",
            "age": 2,
            "name": "unwatched",
          }
    };   
    expect(lib.findLeastGuarded( children, population)).toBe("unwatched is least watched. Watch score = 0");
})
test('babysitter', () =>{
  var population = {
      "p1":{
          "name": "p1",
          "worked": false,
          "isInjured": false,
          "guarding": [
            "c1"
          ],
          "nursing": [
            "Ilima"
          ],
          "activity": "gather"
      },
      "p2":{
          "name": "p2",
          "worked": false,
          "isInjured": false,
          "guarding": ["c1"],
          "activity": "gather"
      }
  };
  var children = {
      "c1": {
          "mother": "p1",
          "father": "p2",
          "age": 3,
          "name": "c1",
        },
        "sitter": {
          "mother": "p1",
          "father": "p2",
          "newAdult":true,
          "age": 15,
          "babysitting":"c1",
          "name": "sitter",
        }
  };
  expect(lib.findGuardValueForChild("c1", population, children)).toBe(3);
  expect(children["c1"].guardians).toBeTruthy();
  expect(Object.keys(children["c1"].guardians).length).toBe(3);
});

test('compiles', () =>{
  var gameState = {
    "population": {
      "p1":{
        "name": "p1",
        "worked": false,
        "isInjured": false,
        "guarding": [
          "c1"
        ],
        "nursing": [
          "Ilima"
        ],
        "activity": "gather"
    },
      "p2":{
          "name": "p2",
          "worked": false,
          "isInjured": false,
          "guarding": ["c1"],
          "activity": "gather"
      }
     },
     children : {
      "c1": {
          "mother": "p1",
          "father": "p2",
          "age": 3,
          "name": "c1",
        },
        "sitter": {
          "mother": "p1",
          "father": "p2",
          "newAdult":true,
          "age": 15,
          "babysitting":"c1",
          "name": "sitter",
        },
        "unwatched": {
          "mother": "p1",
          "father": "p2",
          "age": 2,
          "name": "unwatched",
        }
      },
    "round": "reproduction"
}
  var children = gameState["children"]
  var population = gameState["population"]
  response = lib.hyenaAttack(children, gameState)
  expect(lib.findGuardValueForChild("c1", population, children)).toBe(3);
  expect(children["c1"].guardians).toBeTruthy();
  expect(Object.keys(children["c1"].guardians).length).toBe(3);
  expect(lib.findGuardValueForChild("unwatched", population, children)).toBe(0);
  msgArray = response.split(' ')
  target = msgArray[3]
  expect(target).toBe("unwatched")
  devoured = response.indexOf("devoured")
  expect(devoured).toBeGreaterThan(0)
});