const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const chief = require('../../libs/chief.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('startwork')
    .setDescription('Start the work round. (Chief only)'),
  async execute(interaction, gameState) {
    var actorName = interaction.member.displayName;
    response = chief.startWork(actorName, gameState);
    gameState.saveRequired = true;
  },
};
