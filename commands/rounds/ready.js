const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const reproLib = require('../../libs/reproduction.js');
const worklib = require('../../libs/work.js');
const text = require('../../libs/textprocess.js');
const pop = require('../../libs/population.js');

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
  var message = 'Nobody seems ready for much of anything right now.';
  if (gameState.workRound) {
    message =
      'People available to work: ' +
      worklib.listReadyToWork(gameState.population);
  }
  // this may just be an artifact of non-secret mating?
  if (gameState.reproductionRound) {
    if (gameState.reproductionList && gameState.reproductionList[0]) {
      message =
        'The mating invitation order is ' +
        gameState.reproductionList.join(', ') +
        '\n';
      var cleanName = gameState.reproductionList[0];
      if (cleanName.indexOf('(') > 0) {
        startParen = cleanName.indexOf('(');
        cleanName = cleanName.substring(0, startParen);
      }
      message +=
        'Available partners: ' +
        reproLib.eligibleMates(cleanName, gameState.population);
      for (personName in population) {
        member = pop.memberByName(personName, gameState);
        if (member.invite) {
          message +=
            '\n' + personName + ' is awaiting a response from ' + member.invite;
        }
      }
    }
  }
  text.addMessage(gameState, displayName, message);
  return;
}
