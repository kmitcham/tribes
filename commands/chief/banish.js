const { SlashCommandBuilder } = require('../../libs/command-builders.js');

const { banishAdmin } = require('../../libs/banish.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('banish')
    .setDescription(
      'Remove a tribe member from the tribe (chief only). No return: they cannot rejoin this tribe for the rest of this game.'
    )
    .addUserOption((option) =>
      option
        .setName('target')
        .setDescription('Member of the tribe to banish')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('note about why the person is to be banished')
        .setRequired(false)
    ),
  async execute(interaction, gameState, _bot) {
    const targetObject = interaction.options.getMember('target');
    var targetName = targetObject.displayName;
    var sourceName = interaction.member.displayName;
    var reason = interaction.options.getString('reason');
    banishAdmin(gameState, sourceName, targetName, reason);
  },
};
