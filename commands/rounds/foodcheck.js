const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const text = require('../../libs/textprocess');
const feed = require('../../libs/feed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('foodcheck')
    .setDescription(
      'examine the food situation for every adult and living child'
    ),
  async execute(interaction, gameState, bot) {
    onCommand(interaction, gameState, bot);
  },
};

function onCommand(interaction, gameState, bot) {
  var message = feed.checkFood(gameState, bot);
  var displayName = interaction.member.displayName;
  text.addMessage(gameState, displayName, message);
  return;
}
