const { SlashCommandBuilder } = require('../../libs/command-builders.js');
const general = require('../../libs/general.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('law')
    .setDescription('Show all of the laws, as set down by the chief'),
  async execute(interaction, gameState) {
    var displayName = interaction.member.displayName;
    general.law(displayName, gameState);
  },
};
