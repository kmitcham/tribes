const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require('../../libs/command-builders.js');
const worklib = require('../../libs/work.js');
const text = require('../../libs/textprocess.js');
const pop = require('../../libs/population.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('idle')
    .setDescription('do nothing this season'),
  async execute(interaction, gameState) {
    idle(interaction, gameState);
  },
};

function idle(interaction, gameState) {
  var sourceName = interaction.member.displayName;
  var player = pop.memberByName(sourceName, gameState);
  if (!player) {
    text.addMessage(gameState, sourceName, 'Only tribe members can idle.  Maybe !join');
    return;
  }

  if (gameState.workRound == false) {
    text.addMessage(gameState, sourceName, 'Can only idle during the work round');
    return;
  }

  if (player.worked == true) {
    text.addMessage(gameState, sourceName, 'You cannot idle (again) this round');
    return;
  }

  player.activity = 'idle';
  message = sourceName + ' does nothing for a whole season.';
  pop.history(sourceName, ' does nothing for a season.', gameState);
  player.worked = true;
  gameState.saveRequired = true;
  text.addMessage(gameState, 'tribe', message);
}

function onError(interaction, response) {
  interaction.user.send(response);
  const embed = new EmbedBuilder().setDescription(response);
  interaction
    .reply({ embeds: [embed], ephemeral: true }) // error message
    .catch(console.error);
  return;
}
