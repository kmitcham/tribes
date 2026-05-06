const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require('../../libs/command-builders.js');
const reproLib = require('../../libs/reproduction.js');
const text = require('../../libs/textprocess.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('decline')
    .setDescription(
      'For every possible partner in the tribe, indicate whether you consent to mate with them.'
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
      var sourceName = interaction.member.displayName;
      var rawList = interaction.options.getString('declinelist');

      // Handle array parameters from WebSocket interface
      if (Array.isArray(rawList)) {
        rawList = rawList.length > 0 ? rawList.join(',') : null;
      }

      // Call declinePrep with proper parameters
      var player = reproLib.memberByName
        ? reproLib.memberByName(sourceName, gameState)
        : require('../../libs/population.js').memberByName(
            sourceName,
            gameState
          );

      if (!rawList) {
        if (player && player.declineList && player.declineList.length > 0) {
          var message = 'Current declinelist: ' + player.declineList.join(' ');
          console.log(message);
          text.addMessage(gameState, sourceName, message);
          return message;
        } else {
          var message = 'No current declinelist';
          console.log(message);
          text.addMessage(gameState, sourceName, message);
          return message;
        }
      }

      let listAsArray = rawList.split(' ');
      if (rawList.includes(',')) {
        listAsArray = rawList.split(',');
      }

      // Trim whitespace from each item
      for (var i = 0; i < listAsArray.length; i++) {
        listAsArray[i] = listAsArray[i].trim();
      }

      console.log('applying decline list to mating for ' + sourceName);
      var response = reproLib.decline
        ? reproLib.decline(sourceName, listAsArray, gameState)
        : require('../../libs/reproduction.js').decline(
            sourceName,
            listAsArray,
            gameState
          );
      console.log('decline response:' + response);
      gameState.saveRequired = true;
    } catch (error) {
      console.error('decline error ' + error);
    }
  },
};
