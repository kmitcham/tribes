const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const worklib = require('../../libs/work.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('secrets')
    .setDescription(
      'Allows you to toggle your willingness to teach others to craft.'
    )
    .addBooleanOption((option) =>
      option
        .setName('willtrain')
        .setDescription('You will train others')
        .setRequired(true)
    ),
  async execute(interaction, gameState, bot) {
    var actorName = interaction.member.displayName;
    var willTrain = interaction.options.getBoolean('willtrain');
    worklib.setSecrets(gameState, actorName, willTrain);
  },
};
