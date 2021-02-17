var reproLib = require("./reproduction.js");


test("excludes people", () =>{
    var gameState = {
        "population": {
            "p1":{
                "name": "p1",
                "gender": "male",
                "activity": "gather"
            },
            "p2":{
              "name": "p2",
              "gender": "female"
            }
            , "p3":{
              "name": "p3",
              "gender": "male"
            }
            , "p4":{
                "name": "p4",
                "gender": "female",
                "isPregnant": "anyChild"
              }
         },
        "round": "reproduction"
    }
    response = reproLib.eligibleMates("p1", gameState.population, false);
    expect(response).toBe("p2")
});
test("makes a list", () =>{
  var gameState = {
      "population": {
          "p1":{
              "name": "p1",
              "gender": "female",
              "activity": "gather"
          },
          "p2":{
            "name": "p2",
            "gender": "male"
          }
          , "p3":{
            "name": "p3",
            "gender": "male"
          }
          , "p4":{
              "name": "p4",
              "gender": "male"
            }
       },
      "round": "reproduction"
  }
  response = reproLib.eligibleMates("p1", gameState.population, false);
  expect(response).toBe("p2, p3, p4")
});
test("cleans the name", () =>{
  var gameState = {
      "population": {
          "p1":{
              "name": "p1",
              "gender": "female",
              "activity": "gather"
          },
          "p2":{
            "name": "p2",
            "gender": "male"
          }
          , "p3":{
            "name": "p3",
            "gender": "male"
          }
          , "p4":{
              "name": "p4",
              "gender": "male"
            }
       },
      "round": "reproduction"
  }
  response = reproLib.eligibleMates("p1(male)", gameState.population, false);
  expect(response).toBe("p2, p3, p4")
});