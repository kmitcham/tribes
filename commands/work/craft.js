const { SlashCommandBuilder } = require('../../libs/command-builders.js');
const worklib = require('../../libs/work.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('craft')
    .setDescription('craft a basket or spearhead')
    .addStringOption((option) =>
      option
        .setName('item')
        .setDescription('one of (basket,spearhead)')
        .addChoices(
          { name: 'basket', value: 'basket' },
          { name: 'spearhead', value: 'spearhead' }
        )
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('force')
        .setDescription('referee can force a die roll value 1-6')
        .setRequired(false)
    ),

  async execute(interaction, gameState) {
    var sourceName = interaction.member.displayName;
    var item = interaction.options.getString('item');
    var forceRoll = interaction.options.getInteger('force');
    worklib.craft(gameState, sourceName, item, forceRoll);
  },
};
