const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require('../../libs/command-builders.js');
const reproLib = require('../../libs/reproduction.js');
const pop = require('../../libs/population.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription(
      'Set your invite list (web UI: use the Romance panel). Comma-separated names in priority order; append !pass to give up if all decline.'
    )
    .addStringOption((option) =>
      option
        .setName('invitelist')
        .setDescription(
          'If the list ENDS with !pass, give up if the listed players decline.'
        )
    ),
  async execute(interaction, gameState, bot) {
    try {
      var displayName = interaction.member.displayName;
      var rawList = interaction.options.getString('invitelist');
      var cleanArray = pop.convertStringToArray(rawList);
      if (true) {
        var processedList = [];
        for (const value of cleanArray) {
          processedList.push(pop.nameFromAtNumber(value, bot));
        }
        const response = reproLib.invite(gameState, displayName, processedList);
        console.log('invite response was ' + response);
      } else {
        const response = reproLib.invite(gameState, displayName, rawList);
        console.log('invite response was ' + response);
      }
    } catch (error) {
      console.error('invite error ' + error);
    }
  },
};
