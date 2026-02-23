const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const repro = require('../../libs/reproduction');
const text = require('../../libs/textprocess');
const pop = require('../../libs/population');

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
