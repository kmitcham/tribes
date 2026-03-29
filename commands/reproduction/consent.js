const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require('../../libs/command-builders.js');
const reproLib = require('../../libs/reproduction.js');
const pop = require('../../libs/population.js');
const text = require('../../libs/textprocess.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('consent')
    .setDescription(
      'For every possible partner in the tribe, indicate whether you consent to mate with them.'
    )
    .addStringOption((option) =>
      option
        .setName('consentlist')
        .setDescription(
          'List of names and whether you consent status (e.g., "Alice: consent, Sally: decline")'
        )
    ),
  async execute(interaction, gameState, bot) {
    try {
      var sourceName = interaction.member.displayName;
      var rawList = interaction.options.getString('consentlist');

      // Handle array parameters from WebSocket interface
      if (Array.isArray(rawList)) {
        rawList = rawList.length > 0 ? rawList.join(',') : null;
      }

      var response = reproLib.consentPrep(gameState, sourceName, rawList);
      console.log('consent updated: ' + response);
      gameState.saveRequired = true;
    } catch (error) {
      console.error('consent error ' + error);
    }
  },
};
