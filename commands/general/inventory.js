const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require('../../libs/command-builders.js');
const general = require('../../libs/general.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription(
      'Show the inventory a player or the whle tribe; default shows everyone'
    )
    .addUserOption((option) =>
      option
        .setName('target')
        .setDescription('Which tribe member to display')
        .setRequired(false)
    ),
  async execute(interaction, gameState) {
    var targetUser = interaction.options.getMember('target');
    var targetName = null;
    if (targetUser) {
      targetName = targetUser.displayName;
    }
    var actorName = interaction.member.displayName;
    general.inventory(gameState, targetName, actorName);
  },
};
