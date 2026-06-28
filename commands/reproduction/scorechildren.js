const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require('../../libs/command-builders.js');
const text = require('../../libs/textprocess.js');
const endGame = require('../../libs/endgame.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('scorechildren')
    .setDescription(
      'Report the number of children for each mother (and father, after game ends)'
    ),
  async execute(interaction, gameState, bot) {
    var actorName = interaction.member.displayName;
    scoreChildren(actorName, gameState);
  },
};

function scoreChildren(actorName, gameState) {
  const message = endGame.scoreChildrenMessage(gameState);
  text.addMessage(gameState, actorName, message);
  return;
}
