const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const reproLib = require('../../libs/reproduction.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pass')
    .setDescription('skip your chance to invite others to mate this round.'),
  async execute(interaction, gameState) {
    try {
      var displayName = interaction.member.displayName;
      response = reproLib.pass(gameState, displayName);
    } catch (error) {
      // And of course, make sure you catch and log any errors!
      console.error('pass' + error);
    }
  },
};
