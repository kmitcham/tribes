const { SlashCommandBuilder } = require('../../libs/command-builders.js');
const repro = require('../../libs/reproduction.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('startreproduction')
    .setDescription('Start the reproduction round. (Chief only)'),
  async execute(interaction, gameState, _bot) {
    var actorName = interaction.member.displayName;

    repro.startReproductionChecks(gameState, actorName);
    gameState.saveRequired = true;
  },
};
