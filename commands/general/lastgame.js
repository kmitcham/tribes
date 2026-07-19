const { SlashCommandBuilder } = require('../../libs/command-builders.js');
const text = require('../../libs/textprocess.js');
const career = require('../../libs/career.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lastgame')
    .setDescription(
      'Re-read the full end report from your most recently finished game (private)'
    ),
  async execute(interaction, gameState) {
    const playerName = interaction.member.displayName;
    const user = career.getUserRecord(playerName);
    const message = career.formatLastGameMessage(user, playerName);
    text.addMessage(gameState, playerName, message);
  },
};
