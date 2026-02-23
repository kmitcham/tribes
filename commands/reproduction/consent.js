const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const reproLib = require('../../libs/reproduction.js');
const pop = require('../../libs/population.js');
const text = require('../../libs/textprocess.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('consent')
    .setDescription(
      'Comma seperated list of people you will mate with given an invitation.'
    )
    .addStringOption((option) =>
      option
        .setName('consentlist')
        .setDescription(
          'list of names.  !all is an option for the less discriminating, !none is also available'
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
