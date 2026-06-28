const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require('../../libs/command-builders.js');
const repro = require('../../libs/reproduction');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('startreproduction')
    .setDescription('Start the reproduction round. (Chief only)'),
  async execute(interaction, gameState, bot) {
    var actorName = interaction.member.displayName;

    repro.startReproductionChecks(gameState, actorName);
    gameState.saveRequired = true;
  },
};
