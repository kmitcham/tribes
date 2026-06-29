const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require('../../libs/command-builders.js');
const general = require('../../libs/general.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('give')
    .setDescription('give items to another player')
    .addStringOption((option) =>
      option
        .setName('item')
        .setDescription('one of (food,grain,basket,spearhead)')
        .addChoices(
          { name: 'food', value: 'food' },
          { name: 'grain', value: 'grain' },
          { name: 'basket', value: 'basket' },
          { name: 'spearhead', value: 'spearhead' }
        )
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription('amount to give')
        .setRequired(true)
    )
    .addUserOption((option) =>
      option
        .setName('player')
        .setDescription('Which tribe member to give to')
        .setRequired(true)
    ),
  async execute(interaction, gameState) {
    const targetMember =
      interaction.options.getMember('player') ||
      interaction.options.getMember('target');
    var targetName = targetMember ? targetMember.displayName : null;
    var sourceName = interaction.member.displayName;
    var amount = interaction.options.getInteger('amount');
    var item = interaction.options.getString('item');
    general.give(gameState, sourceName, targetName, amount, item);
  },
};
