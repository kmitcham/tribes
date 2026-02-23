const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const worklib = require('../../libs/work.js');
const text = require('../../libs/textprocess.js');
const pop = require('../../libs/population.js');
const dice = require('../../libs/dice.js');
const referees = require('../../libs/referees.json');

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

function onError(interaction, response) {
  interaction.user.send(response);
  const embed = new EmbedBuilder().setDescription(response);
  interaction
    .reply({ embeds: [embed], ephemeral: true }) // error message
    .catch(console.error);
  return;
}
