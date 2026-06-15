const {
  SlashCommandBuilder,
} = require('../../libs/command-builders.js');
const worklib = require('../../libs/work.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('train')
    .setDescription('attempt to learn how to craft')
    .addIntegerOption((option) =>
      option
        .setName('force')
        .setDescription('referee can force a die roll value 2-12')
        .setRequired(false)
    ),
  async execute(interaction, gameState) {
    var sourceName = interaction.member.displayName;
    var forceRoll = interaction.options.getInteger('force');
    worklib.train(gameState, sourceName, forceRoll);
  },
};
