const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require('../../libs/command-builders.js');
const worklib = require('../../libs/work.js');
const text = require('../../libs/textprocess.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ready')
    .setDescription('Show which tribe members are ready to work'),
  async execute(interaction, gameState) {
    var displayName = interaction.member.displayName;
    onCommand(displayName, gameState);
  },
};

function onCommand(displayName, gameState) {
  var message = 'Nobody seems ready to work since it is not the work round.';
  if (gameState.workRound) {
    message =
      'People available to work: ' +
      worklib.listReadyToWork(gameState.population);
  }
  text.addMessage(gameState, displayName, message);
  return;
}
