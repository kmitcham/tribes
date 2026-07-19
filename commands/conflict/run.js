const { SlashCommandBuilder } = require('../../libs/command-builders.js');
const text = require('../../libs/textprocess.js');
const violence = require('../../libs/violence.js');
const access = require('../../libs/access.js');

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
  var player = access.requireTribeMember(gameState, actorName);
  if (!player) {
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
