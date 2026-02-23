const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const reproLib = require('../../libs/reproduction.js');
const text = require('../../libs/textprocess');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('romance')
    .setDescription('(show your current reproduction lists)'),
  async execute(interaction, gameState, bot) {
    var sourceName = interaction.member.displayName;
    response = onCommand(sourceName, gameState, bot);
  },
};

function onCommand(sourceName, gameState, bot) {
  var message = 'error in romance, message not set';
  message = reproLib.showMatingLists(sourceName, gameState);
  text.addMessage(gameState, sourceName, message);
  return message;
}
