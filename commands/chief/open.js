const { SlashCommandBuilder } = require('../../libs/command-builders.js');
const pop = require('../../libs/population.js');
const text = require('../../libs/textprocess.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('open')
    .setDescription('Set the tribe so that anyone can join. (Chief only'),
  async execute(interaction, gameState, _bot) {
    var actorName = interaction.member.displayName;
    close(actorName, gameState);
  },
};

function close(actorName, gameState) {
  var player = pop.memberByName(actorName, gameState);
  if (!player || !player.chief) {
    text.addMessage(gameState, actorName, 'open requires chief privileges');
    return;
  }
  if (gameState.ended) {
    text.addMessage(
      gameState,
      actorName,
      'The game is over.  Maybe you want to join to start a new game?'
    );
    return;
  }
  gameState.open = true;
  gameState.saveRequired = true;
  text.addMessage(gameState, 'tribe', 'The tribe is open to all');
  return;
}
