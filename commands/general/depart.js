const { SlashCommandBuilder } = require('../../libs/command-builders.js');
const banish = require('../../libs/banish.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('depart')
    .setDescription(
      'Leave this tribe voluntarily (not banished as punishment, not dead). No return: you cannot rejoin this tribe for the rest of this game.'
    ),
  async execute(interaction, gameState) {
    const actorName = interaction.member.displayName;
    banish.depart(gameState, actorName);
  },
};
