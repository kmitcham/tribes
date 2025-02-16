var util = require("../libs/util.js");

test("Numbers stay in range", () =>{
    for (var i=0; i < 100; i++){
        value = util.roll(1);
        expect(value).toBeLessThan(6.1);
        expect(value).toBeGreaterThan(0.9);
    }
});

test("Name with @", ()=>{
    var gameState = {
        "population": {
            "demander": {
                "name": "demander",
                "faction":"for"
              },
              "pro1": {
                "name": "pro1",
                "faction":"for"
              },
              "con1": {
                "name": "con1",
                "faction":"against"
              },
              "abstain": {
                "name": "abstain"
              },
              "illegal": {
                "name": "illegal",
                "faction":"elephant"
              },
              "neutral1": {
                "name": "neutral1",
                "faction":"neutral"
              }
                        },
        "round": "work"
    }
    expectName = 'demander'
    player = util.personByName('@demander', gameState);
    expect(player).toBeTruthy();
    actualName = player.name;
    expect(actualName).toEqual(expectName);
})

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

test("Remove special chars",()=>{
  expect(util.removeSpecialChars("Has Spaces")).toEqual("HasSpaces")
  expect(util.removeSpecialChars("Has(Paren)")).toEqual("HasParen")
  expect(util.removeSpecialChars("Has/Slashes/")).toEqual("HasSlashes")
})