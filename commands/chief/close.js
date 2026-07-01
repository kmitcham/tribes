const { SlashCommandBuilder } = require('../../libs/command-builders.js');
const chief = require('../../libs/chief.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription(
      'Set the tribe so that only the chief can induct new members. (Chief only)'
    ),
  async execute(interaction, gameState, _bot) {
    var actorName = interaction.member.displayName;

    const response = chief.close(actorName, gameState);
    return response;
  },
};
