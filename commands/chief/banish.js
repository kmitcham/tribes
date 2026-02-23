const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const { banish, banishAdmin } = require('../../libs/banish.js');
const text = require('../../libs/textprocess');
const pop = require('../../libs/population');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('banish')
    .setDescription('Remove a tribe member from the tribe. (Chief only)')
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
  async execute(interaction, gameState, bot) {
    targetObject = interaction.options.getMember('target');
    var targetName = targetObject.displayName;
    var sourceName = interaction.member.displayName;
    var reason = interaction.options.getString('reason');
    banishAdmin(gameState, sourceName, targetName, reason);
  },
};
