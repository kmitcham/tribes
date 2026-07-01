const { SlashCommandBuilder } = require('../../libs/command-builders.js');
const worklib = require('../../libs/work.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gather')
    .setDescription('gather food')
    .addIntegerOption((option) =>
      option
        .setName('force')
        .setDescription('referee can force a die roll value 3-18')
        .setRequired(false)
    ),
  async execute(interaction, gameState) {
    var sourceName = interaction.member.displayName;
    var forceRoll = interaction.options.getInteger('force');
    worklib.gather(gameState, sourceName, forceRoll);
  },
};
