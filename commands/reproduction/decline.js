const { SlashCommandBuilder } = require('../../libs/command-builders.js');
const reproLib = require('../../libs/reproduction.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('decline')
    .setDescription(
      'Record decline for one or more partners (web UI: use the Romance panel). Format: "Alice: decline, Bob: consent".'
    )
    .addStringOption((option) =>
      option
        .setName('declinelist')
        .setDescription(
          'List of names and whether you consent status (e.g., "Alice: consent, Sally: decline")'
        )
    ),
  async execute(interaction, gameState) {
    try {
      const sourceName = interaction.member.displayName;
      let rawList = interaction.options.getString('declinelist');

      // Handle array parameters from WebSocket interface
      if (Array.isArray(rawList)) {
        rawList = rawList.length > 0 ? rawList.join(',') : null;
      }

      const response = reproLib.declinePrep(gameState, sourceName, rawList);
      console.log('decline updated: ' + response);
      gameState.saveRequired = true;
    } catch (error) {
      console.error('decline error ' + error);
    }
  },
};
