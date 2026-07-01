const { SlashCommandBuilder } = require('../../libs/command-builders.js');
const pop = require('../../libs/population.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('graveyard')
    .setDescription('Show the dead of the tribe'),
  async execute(interaction, gameState) {
    var displayName = interaction.member.displayName;
    pop.graveyard(displayName, gameState);
  },
};
