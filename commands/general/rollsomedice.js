const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const dice = require('../../libs/dice.js');
const text = require('../../libs/textprocess.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rollsomedice')
    .setDescription('roll at least one die')
    .addIntegerOption((option) =>
      option
        .setName('number')
        .setDescription('number of dice')
        .setRequired(false)
    ),
  async execute(interaction, gameState, bot) {
    var count = interaction.options.getInteger('number') || 1;
    console.log('number of dice = ' + count);
    message =
      'the result of rolling ' + count + ' dice was ' + dice.roll(count);
    text.addMessage(gameState, interaction.member.displayName, message);
  },
};
