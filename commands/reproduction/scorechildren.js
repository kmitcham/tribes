const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pop = require('../../libs/population');
const text = require('../../libs/textprocess');
const endGame = require('../../libs/endgame');

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
  message = endGame.scoreChildrenMessage(gameState);
  text.addMessage(gameState, actorName, message);
  return;
}
