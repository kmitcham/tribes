const { SlashCommandBuilder } = require('../../libs/command-builders.js');
const text = require('../../libs/textprocess.js');
const career = require('../../libs/career.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('incarnations')
    .setDescription(
      'Show your lifetime results across finished games (private)'
    ),
  async execute(interaction, gameState) {
    const playerName = interaction.member.displayName;
    const user = career.getUserRecord(playerName);
    const message = career.formatIncarnationsMessage(user, playerName);
    text.addMessage(gameState, playerName, message);
  },
};
