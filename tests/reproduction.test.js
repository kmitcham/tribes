var reproLib = require("../libs/reproduction.js");
const allNames = require('../libs/names.json');

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
  expect(response).toBe("p2 p3 p4")
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
  expect(response).toBe("")
  var response = reproLib.matingObjections(p2,p1)
  expect(response).toBe("")
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
  expect(response).toBe("");
  response = reproLib.matingObjections(p2,p1);
  expect(response).toBe("");
  response = reproLib.matingObjections(p1,p1);
  expect(response).toBe("p1 is the same gender as p1.\n");
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
              "gender": "female"
            }
       },
      "round": "reproduction"
  }
  //function handleReproductionList(actorName, args, listName, gameState, bot){
  response = reproLib.handleReproductionList("p1", ["p2", "p4", "!pass", "p3"],"consentList", gameState, {})
  expect(response).toContain("p1 is the same gender as p4")
  expect(response).toContain("!pass is only valid in the inviteList")

});
test("make a invitelist, with pass", () =>{
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
              "gender": "female"
            }
       },
      "round": "reproduction"
  }
  //function handleReproductionList(actorName, args, listName, gameState, bot){
  expectedList = ["p2", "p3","!pass"]
  response = reproLib.handleReproductionList("p1", expectedList ,"inviteList", gameState, {})
  exp = "Setting your inviteList list to:p2,p3,!pass\n"
  expect(response).toBe(exp)
  expect(gameState["population"]["p1"]["inviteList"]).toStrictEqual(expectedList)
});

test("make a invitelist, with Pass", () =>{
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
              "gender": "female"
            }
       },
      "round": "reproduction"
  }
  //function handleReproductionList(actorName, args, listName, gameState, bot){
  expectedList = ["p2", "p3","!Pass"]
  response = reproLib.handleReproductionList("p1", expectedList ,"inviteList", gameState, {})
  exp = "Setting your inviteList list to:p2,p3,!Pass\n"
  expect(response).toBe(exp)
  expect(gameState["population"]["p1"]["inviteList"]).toStrictEqual(expectedList)
});

test("make a inviteList, with pass error", () =>{
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
  expectedResponse = "Values after '!pass' must be removed.\n\nPlease try again to set your inviteList\n"
  response = reproLib.handleReproductionList("p1", ["p2", "p4", "!pass", "p3"],"inviteList", gameState, {})
  expect(response).toBe(expectedResponse)
});

test("make a inviteList, with pass happypath", () =>{
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
  response = reproLib.handleReproductionList("p1", ["p2", "p4", "!pass"],"inviteList", gameState, {})
  expect(response).toBe("Setting your inviteList list to:p2,p4,!pass\n")
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
  expect(response).toBe("this many people are done mating: 4")
});

test("sorting check", ()=>{
  
})

test("unique names",()=>{
  //getNextChildName(children, allNames, nextIndex, gameState){
    const fakeNames = {"names":[
      ["a1","a2","a3"],["b1","b2","b3"]
    ]}
    const children = {
      "a1": {
      "mother": "m1",
      "father": "f1",
      "age": 8, "name":"a1", "food": 2, 'gender':'male'
    },
    "b1": {
      "mother": "m2",
      "father": "f2",
      "age": 4, "name":"b1", "food": 2, 'gender':'male'
    },
    "a2": {
      "mother": "m1",
      "father": "f2",
      "age": -1,"name":"a2", "food": 2, 'gender':'male'
    }
  }
  result = reproLib.getNextChildName(children, fakeNames, 1,{})
  expect(result.indexOf("b")).toBe(0)
  expect(result.indexOf("a")).toBe(-1)
  expect(result.indexOf("1")).toBe(-1)
})

test("matingList tests", () =>{
  var gameState = {
    "name": "unitTest-tribe",
      "population": {
          "p1":{
              "name": "p1",
              "gender": "female",
              "inviteList":["p 2","!pass"],
              "consentList":["p 2"],
              "declineList":[]
          },
          "p2":{
            "name": "p 2",
            "gender": "male",
            "consentList":["p1"],
            "cannotInvite": true
          }
          , "p3":{
            "name": "p3",
            "gender": "male",
            "consentList":["p1"],
            "cannotInvite":true
          },
          "p4":{
              "name": "p4",
              "gender": "male",
              "declineList":[],
              "cannotInvite":true
            }
       },
       "children":{},
      "reproductionRound": true
  }
  //function handleReproductionList(actorName, args, listName, gameState, bot){
  response = reproLib.showMatingLists("p1", gameState, {})
  expect(response.indexOf("inviteList")).toBeGreaterThan(0)
  expect(response.indexOf("consentList")).toBeGreaterThan(0)
  expect(response.indexOf("declineList")).toBeGreaterThan(0)
  response = reproLib.showMatingLists("p2", gameState, {})
  expect(response.indexOf("inviteList")).toBeGreaterThan(0)
  expect(response.indexOf("consentList")).toBeGreaterThan(0)
  expect(response.indexOf("declineList")).toBeGreaterThan(0)
  canResponse = reproLib.canStillInvite(gameState)
  expect(canResponse).toBe("p1")
});

test("make a invitelist, with commas, pass and save", () =>{
  var gameState = {
      "population": {
          "p1":{
              "name": "p1",
              "gender": "female"
          },
          "p2":{
            "name": "p 2",
            "gender": "male"
          }
          , "p3":{
            "name": "p3",
            "gender": "male"
          }
          , "p4":{
              "name": "p4",
              "gender": "female"
            }
       },
      "round": "reproduction"
  }
  //function handleReproductionList(actorName, args, listName, gameState, bot){
  expectedList = ["p 2", "p3","!pass"]
  inputList = ["p 2,", "p3,","!pass"]
  response = reproLib.handleReproductionList("p1", inputList ,"inviteList", gameState, {})
  exp = "Setting your inviteList list to:p 2,p3,!pass\n"
  expect(response).toBe(exp)
  expect(gameState["population"]["p1"]["inviteList"]).toStrictEqual(expectedList)
});

test("make a consent list with !all", () =>{
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
              "gender": "female"
            }
       },
      "round": "reproduction"
  }
  expectedList = ["p2", "p3", "!all"]
  inputList = ["p2,", "p3,", "!all,"]
  response = reproLib.handleReproductionList("p1", inputList ,"consentList", gameState, {})
  exp = "Setting your consentList list to:p2,p3,!all\n"
  expect(response).toBe(exp)
  expect(gameState["population"]["p1"]["consentList"]).toStrictEqual(expectedList)
});

test("make a consent list with !all and a declineList", () =>{
  var gameState = {
      "population": {
          "p1":{
              "name": "p1",
              "gender": "female",
              "declineList":["p3"]
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
              "gender": "female"
            }
       },
      "round": "reproduction"
  }
  expectedList = ["p2", "p3", "!all"];
  rawInputList = "p2, p3, !all";
  reproLib.consentPrep(gameState, "p1", rawInputList);
  response = gameState.messages["p1"];
  exp =  "Updated consentlist to p2,p3,!all"
  expect(response).toContain(exp);
  expect(response).toContain("will not override");
  expect(response).toContain("Updated");
  expect(gameState["population"]["p1"]["consentList"]).toStrictEqual(expectedList)
});

test("make a consent list with !none", () =>{
  var gameState = {
      "population": {
          "p1":{
              "name": "p1",
              "gender": "female",
              "consentList": ["p2"]
          },
          "p2":{
            "name": "p2",
            "gender": "male",
            "consentList": ["!all"]
          }
          , "p3":{
            "name": "p3",
            "gender": "male"
          }
          , "p4":{
              "name": "p4",
              "gender": "female"
            }
       },
      "round": "reproduction"
  }
  inputList = "!none"
  response = reproLib.consentPrep( gameState, "p1", inputList);
  member = gameState["population"]["p1"]
  hasList = ("consentList" in member);
  expect(!hasList);
});
test("make a consent list with !none", () =>{
  var gameState = {
      "population": {
          "p1":{
              "name": "p1",
              "gender": "female",
              "consentList": ["p2"]
          },
          "p2":{
            "name": "p2",
            "gender": "male",
            "consentList": ["!all"]
          }
          , "p3":{
            "name": "p3",
            "gender": "male"
          }
          , "p4":{
              "name": "p4",
              "gender": "female"
            }
       },
      "round": "reproduction"
  }
  inputList = "!none"
  response = reproLib.consentPrep( gameState, "p1", inputList);
  member = gameState["population"]["p1"]
  hasList = ("consentList" in member);
  expect(!hasList);
});

test("consent and decline collisions on all", () =>{
  var gameState = {
      "population": {
          "p1":{
              "name": "p1",
              "gender": "female",
              "consentList": ["!all"],
              "declineList": ["!all"]
          },
          "p2":{
              "name": "p2",
              "gender": "male",
              "consentList": ["!all"]
          }
       },
      "round": "reproduction"
  }
  inputList = "!all"
  //function decline(actorName, messageArray,  gameState){
  response = reproLib.decline(  "p1", inputList, gameState);
  member = gameState["population"]["p1"]
  expect(["p2"]).toStrictEqual(member.declineList);
});


test("consent and decline collisions by name", () =>{
  var gameState = {
      "reproductionRound": true,
      "population": {
          "p1":{
              "name": "p1",
              "gender": "female",
              "cannotInvite": true,
              "inviteList":["!pass"],
              "consentList": ["p2"],
              "declineList": ["p2"]
          },
          "p2":{
              "name": "p2",
              "gender": "male",
              "inviteList":["p1"]
          }
       },
      "round": "reproduction"
  }
  response = reproLib.globalMatingCheck(gameState);
  p1 = gameState["population"]["p1"];
  p2 =  gameState["population"]["p2"];
  expect(gameState.messages);
  p1message = gameState.messages["p1"];
  p2message = gameState.messages["p2"];
  expect(p1message).toStrictEqual("p2 flirts with you, but you decline.");
  expect(p2message).toStrictEqual("p1 declines your invitation.");
});

test("mating with spaces in names", () =>{
  var gameState = {
      "reproductionRound":true,
      "population": {
          "p1":{
              "name": "p1",
              "gender": "female",
              "inviteList":["p 2"],
              "consentList":["!all"]
          },
          "p2":{
            "name": "p 2",
            "gender": "male",
            "inviteList":["p1", "p4"],
            "consentList":["p1"]
          }
          , "p3":{
            "name": "p3",
            "gender": "male",
            "inviteList":["!pass"]
          }
          , "p4":{
              "name": "p4",
              "gender": "female",
              "inviteList":["!pass"],
              "consentList":["p 2"]
            }
       },
       "children":{},
      "round": "reproduction"
  }
  //function handleReproductionList(actorName, args, listName, gameState, bot){
  response = reproLib.checkMating(gameState, "p1");
  messages = gameState.messages;

  expect("p 2" in messages);
  p2messages = messages["p 2"];
  expect(p2messages).toContain("p1 is impressed");
  expect(p2messages).toContain("You share good feelings with p1");
  expect(p2messages).toContain("p1 flirts with you, and you are interested.");
  expect("p1" in messages);
  p1messages = messages["p1"];
  expect(p1messages).toContain("Checking");
  expect(p1messages).toContain("p 2");
  expect(p1messages).toContain("over");
  expect(p1messages).toContain("done mating");
});
test("make a consentList, null in the array", () =>{
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
  response = reproLib.handleReproductionList("p1", ["p2", null],"consentList", gameState, {});
  expect(response).toContain("is not in the tribe");
});

test("pass when not in tribe", () => {
  var gameState = {
    "name": "test-tribe",
    "population": {}
  }
  reproLib.pass(gameState, "dummy");
  const message = gameState["messages"]["dummy"];
  expect(message).toContain("You are not in this tribe.")
});

test("pass when not in reproduction", () => {
  var gameState = {
    "name": "test-tribe",
    "reproductionRound": false,
    "population": {
      "dummy":{
        "username":"dummy",
        "handle":{"userid":7},
        "name":"dummy"
      }
    }
  }
  reproLib.pass(gameState, "dummy");
  const message = gameState["messages"]["dummy"];
  expect(message).toContain("round.")
});

test("pass happypath", () => {
  var gameState = {
    "name": "test-tribe",
    "reproductionRound": true,
    "population": {
      "dummy":{
        "username":"dummy",
        "handle":{"userid":7},
        "name":"dummy"
      }
    }
  }
  reproLib.pass(gameState, "dummy");
  const message = gameState["messages"]["tribe"];
  expect(message).toContain("complete")
});

test("handle mating with lists and decline", () =>{
  var gameState = {
    "name": "unitTest-tribe",
      "population": {
          "p1":{
              "name": "p1",
              "gender": "female",
              "inviteList":["p2","p3", "p4"]
          },
          "p2":{
            "name": "p2",
            "gender": "male",
            "declineList":["p1"],
            "cannotInvite": true
          }
          , "p3":{
            "name": "p3",
            "gender": "male",
            "consentList":["p1"],
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
  expect(gameState["population"]["p1"]["cannotInvite"]).toBeTruthy();
  const p1message = gameState["messages"]["p1"];
  expect(p1message).toContain("p2 declines");
  expect(p1message).toContain("You share good feelings with p3");
  const p2message = gameState["messages"]["p2"];
  expect(p2message).toContain("p1 flirts");
  expect(p2message).toContain("decline");
  const p3message = gameState["messages"]["p3"];
  expect(p3message).toContain("p1 flirts");
  expect(p3message).toContain("feelings");
  expect(response).toBe("this many people are done mating: 4")
});