const { SlashCommandBuilder } = require('../../libs/command-builders.js');
const endLib = require('../../libs/endgame.js');
const pop = require('../../libs/population.js');
const text = require('../../libs/textprocess.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('endgame')
    .setDescription(
      'End the game.  Score the remaining children. (Chief only)'
    ),
  async execute(interaction, gameState, bot) {
    const actorName = interaction.member.displayName;
    const player = pop.memberByName(actorName, gameState);
    if (!player || !player.chief) {
      text.addMessage(
        gameState,
        actorName,
        'endgame requires chief privileges'
      );
      return;
    }

    const response = endLib.endGame(gameState, bot);
    gameState.saveRequired = true;
    gameState.archiveRequired = true;
    return response;
  },
};
