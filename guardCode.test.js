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