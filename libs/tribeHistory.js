const text = require('./textprocess.js');
const pop = require('./population.js');

function showTribeHistory(playerName, gameState) {
  if (!gameState) {
    console.warn('showTribeHistory called with no gameState');
    text.addMessage(
      gameState,
      playerName,
      'No tribe in this channel.  Do you want to /join and create one?'
    );
    return;
  }

  // Require that the player has or had membership in this tribe,
  // similar to personal history.
  var player = pop.memberByName(playerName, gameState);
  if (!player) {
    player = pop.deadOrBanishedByName(playerName, gameState);
    if (!player) {
      text.addMessage(
        gameState,
        playerName,
        'You have no history with this tribe'
      );
      return;
    }
  }

  var messages = gameState.tribeHistory;
  if (!messages || messages.length === 0) {
    text.addMessage(
      gameState,
      playerName,
      'The tribe has no recorded history yet.'
    );
    return;
  }

  for (const message of messages) {
    text.addMessage(gameState, playerName, message);
  }
}

module.exports.showTribeHistory = showTribeHistory;
