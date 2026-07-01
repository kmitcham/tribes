const { SlashCommandBuilder } = require('../../libs/command-builders.js');
const pop = require('../../libs/population.js');
const text = require('../../libs/textprocess.js');
const violence = require('../../libs/violence.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('run')
    .setDescription('If a fight happens, you will try to run away.'),
  async execute(interaction, gameState) {
    var actorName = interaction.member.displayName;

    defend(gameState, actorName);
  },
};

function defend(gameState, actorName) {
  var player = pop.memberByName(actorName, gameState);
  if (!player) {
    text.addMessage(gameState, actorName, 'Not in the tribe');
    return;
  }
  text.addMessage(
    gameState,
    actorName,
    'If a fight happens, you will try to run away.'
  );
  player.strategy = 'run';
  delete player.attack_target;
  violence.resolveViolence(gameState);
  return;
}
