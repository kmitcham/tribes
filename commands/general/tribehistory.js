const { SlashCommandBuilder, EmbedBuilder } = require('../../libs/command-builders.js');
const tribeHistory = require('../../libs/tribeHistory.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tribehistory')
    .setDescription('History of messages sent to the tribe'),
  async execute(interaction, gameState) {
    const playerName = interaction.member.displayName;
    tribeHistory.showTribeHistory(playerName, gameState);
  },
};

