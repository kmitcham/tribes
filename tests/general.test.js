const general = require("../libs/general.js");
const pop = require("../libs/population.js")
const dice = require("../libs/dice.js");
const referees = require("../libs/referees.json")


describe('give function', () => {
  let gameState;

  beforeEach(() => {
      // Reset mocks and set up a default gameState
      gameState = {
          ended: false,
          round: 'work',
          saveRequired: false,
          messages: {},
          "population": {
              "player1": {
                "name": "player1",
                "gender": "female",
                "food": 10,
                "grain": 10,
                "basket": 2,
                "spearhead": 2,
                "history": [
                ],
              },
              "player2": {
                "name": "player2",
                "gender": "male",
                "food": 10,
                "grain": 10,
                "basket": 2,
                "spearhead": 2,
                "history": [
                ]
              }
          },
    };
  });
  var refname = "test-ref-9675309";
  test('should allow non-member ref to give negative amount', () =>{
    general.give(gameState, refname, 'player2', -1, 'grain');
    var expectedMessage = messages["tribe"];
    expect(expectedMessage).toContain("-1 grain");
    expect(gameState.population.player2.grain).toBe(9);
  });

  test('should not allow giving if game has ended', () => {
      gameState.ended = true;
      general.give(gameState, 'player1', 'player2', 1, 'grain');
      var messages = gameState.messages;
      var expectedMessage = messages["player1"];
      expect(expectedMessage).toContain("game is over");
  });

  test('should handle self-giving', () => {
      general.give(gameState, 'player1', 'player1', 1, 'grain');
      var messages = gameState.messages;
      var expectedMessage = messages["player1"];
      expect(expectedMessage).toContain("self-care");
  });

  test('should normalize item starting with "g" to "grain"', () => {
      general.give(gameState, 'player1', 'player2', 1, 'gold');
      var messages = gameState.messages;
      var expectedMessage = messages["tribe"];
      expect(expectedMessage).toContain("1 grain");
  });

  test('should normalize item starting with "f" to "food"', () => {
      general.give(gameState, 'player1', 'player2', 1, 'fish');
      var messages = gameState.messages;
      var expectedMessage = messages["tribe"];
      expect(expectedMessage).toContain("1 food");
  });

  test('should normalize item starting with "b" to "basket"', () => {
      general.give(gameState, 'player1', 'player2', 1, 'box');
      var messages = gameState.messages;
      var expectedMessage = messages["tribe"];
      expect(expectedMessage).toContain("1 basket");
  });

  test('should normalize item starting with "s" to "spearhead"', () => {
      general.give(gameState, 'player1', 'player2', 1, 'sword');
      var messages = gameState.messages;
      var expectedMessage = messages["tribe"];
      expect(expectedMessage).toContain("1 spearhead");
  });

  test('should reject invalid item', () => {
      general.give(gameState, 'player1', 'player2', 1, 'rock');
      var messages = gameState.messages;
      var expectedMessage = messages["player1"];
      expect(expectedMessage).toContain("Unrecognized");
  });

  test('should fail if target person not in tribe', () => {
      general.give(gameState, 'player1', 'notaplayer', 1, 'grain');
      var messages = gameState.messages;
      var expectedMessage = messages["player1"];
      expect(expectedMessage).toContain("not found");
  });

  test('should fail if source person not in tribe and not a referee', () => {
      general.give(gameState, 'notaplayer', 'player2', 1, 'grain');
      var messages = gameState.messages;
      var expectedMessage = messages["notaplayer"];
      expect(expectedMessage).toContain("not a member");
  });

  test('should fail if source does not have enough items and is not a referee', () => {
      general.give(gameState, 'player1', 'player2', 100, 'grain');
      var messages = gameState.messages;
      var expectedMessage = messages["player1"];
      expect(expectedMessage).toContain("not have 100 grain");
  });

  test('should fail if source hunted with spearhead in work round', () => {
      gameState.population.player1.activity = "hunt";
      general.give(gameState, 'player1', 'player2', 1, 'spearhead');
      var messages = gameState.messages;
      var expectedMessage = messages["player1"];
      expect(expectedMessage).toContain("already hunted");
  });

  test('should fail if amount is negative and source is not a referee', () => {
      general.give(gameState, 'player1', 'player2', -1, 'grain');
      var messages = gameState.messages;
      var expectedMessage = messages["player1"];
      expect(expectedMessage).toContain("not valid");

  });

  test('should succeed for non-referee giving', () => {
      general.give(gameState, 'player1', 'player2', 2, 'grain');
      var messages = gameState.messages;
      var expectedMessage = messages["tribe"];
      expect(expectedMessage).toContain("player1 gives player2 2 grain");
      expect(gameState.population.player1.grain).toBe(8);
      expect(gameState.population.player2.grain).toBe(12);
      expect(gameState.saveRequired).toBe(true);
  });

});