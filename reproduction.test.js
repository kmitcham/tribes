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

test("valid mates", () =>{
  var p1 ={
              "name": "p1",
              "gender": "female",
              "activity": "gather"
          };
  var p2 = {  "name": "p2",
            "gender": "male"
          };
  response = reproLib.matingObjections(p1,p2)
  expect(response).toBe("")
});
test("same gender mates", () =>{
  var p1 ={
              "name": "p1",
              "gender": "female",
              "activity": "gather"
          };
  var p2 = {  "name": "p2",
            "gender": "female"
          };
  response = reproLib.matingObjections(p1,p2)
  expect(response).toBe("p1 is the same gender as p2.\n");
});

test("pregnant mates", () =>{
  var p1 ={
              "name": "p1",
              "gender": "female",
              "isPregnant": true,
              "activity": "gather"
          };
  var p2 = {  "name": "p2",
            "gender": "male"
          };
  var response = reproLib.matingObjections(p1,p2)
  expect(response).toBe("p1 is pregnant.\n")
  var response = reproLib.matingObjections(p2,p1)
  expect(response).toBe("p1 is pregnant.\n")
});
test("Mating objections happy path", ()=> {
  p1 = {
    "name": "p1",
    "gender": "female"
}
  p2 = {
    "name": "p2",
    "gender": "male"
  }
  var response = reproLib.matingObjections(p1,p2);
  expect(response).toBe("");
  
})
test("Mating objections fail", ()=> {
  p1 = {
    "name": "p1",
    "gender": "female",
    "isPregnant":"someKid"
  }
  p2 = {
    "name": "p2",
    "gender": "male"
  }  
  p3 = {
    "name": "p3",
    "gender": "male"
  }
  var response = reproLib.matingObjections(p2,p3);
  expect(response).toBe("p2 is the same gender as p3.\n")
  response = reproLib.matingObjections(p1,p2);
  expect(response).toBe("p1 is pregnant.\n");
  response = reproLib.matingObjections(p2,p1);
  expect(response).toBe("p1 is pregnant.\n");
  response = reproLib.matingObjections(p1,p1);
  expect(response).toBe("p1 is pregnant.\np1 is pregnant.\np1 is the same gender as p1.\n");
})
test("make a consentList, happy path", () =>{
  var gameState = {
      "population": {
          "p1":{
              "name": "p1",
              "gender": "female"
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
  //function handleReproductionList(actorName, args, listName, gameState, bot){
  response = reproLib.handleReproductionList("p1", ["p2", "p4"],"consentList", gameState, {})
  expect(gameState["population"]["p1"]["consentList"]).toStrictEqual(["p2","p4"])
});
test("make a consentList, with pass", () =>{
  var gameState = {
      "population": {
          "p1":{
              "name": "p1",
              "gender": "female"
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
  //function handleReproductionList(actorName, args, listName, gameState, bot){
  response = reproLib.handleReproductionList("p1", ["p2", "p4", "!pass", "p3"],"consentList", gameState, {})
  expect(response).toBe(-1)
});
test("trigger end of mating", () =>{
  var gameState = {
    "name": "unitTest-tribe",
      "population": {
          "p1":{
              "name": "p1",
              "gender": "female",
              "inviteList":["p2","!pass"]
          },
          "p2":{
            "name": "p2",
            "gender": "male",
            "consentList":["p1"],
            "cannotInvite": true
          }
          , "p3":{
            "name": "p3",
            "gender": "male",
            "cannotInvite":true
          },
          "p4":{
              "name": "p4",
              "gender": "male",
              "cannotInvite":true
            }
       },
       "children":{},
      "reproductionRound": true
  }
  //function handleReproductionList(actorName, args, listName, gameState, bot){
  response = reproLib.globalMatingCheck( gameState, {})
  expect(gameState["population"]["p1"]["cannotInvite"]).toBeTruthy()
  expect(response).toBe(0)
});