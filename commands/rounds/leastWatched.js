const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const text = require('../../libs/textprocess.js');
const guardlib = require('../../libs/guardCode.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leastguarded')
    .setDescription('Show the least protected child.'),
  async execute(interaction, gameState) {
    onCommand(interaction, gameState);
  },
};

function onCommand(interaction, gameState) {
  children = gameState.children;
  var displayName = interaction.member.displayName;
  response = guardlib.findLeastGuarded(children, gameState.population);
  text.addMessage(gameState, displayName, response);
  return;
}
