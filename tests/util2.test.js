var util = require("../libs/util.js");

test("person by ignoresCase", ()=>{
  var gameState = {
      "population": {
          "demander": {
              "name": "demander",
              "faction":"for",
              "handle":{
                "id":7
              }
            },
            "pro1": {
              "name": "pro1",
              "faction":"for"
            }
                      },
      "round": "work"
  }
  expectName = 'demander'
  player = util.personByName('DEMANDER', gameState);
  expect(player).toBeTruthy();
  actualName = player.name;
  expect(actualName).toEqual(expectName);
})