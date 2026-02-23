const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pop = require('../../libs/population');
const text = require('../../libs/textprocess');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription(
      'Remove a players chance to breed for the current reproduction round. (Chief only)'
    )
    .addUserOption((option) =>
      option
        .setName('target')
        .setDescription('Player to skip')
        .setRequired(true)
    ),

  async execute(interaction, gameState, bot) {
    var actorName = interaction.member.displayName;
    var targetObject = interaction.options.getMember('target');
    var targetName = targetObject.displayName;

    skip(gameState, actorName, targetName);
  },
};

function skip(gameState, actorName, targetName) {
  var actor = pop.memberByName(actorName, gameState);
  if (!actor.chief) {
    text.addMessage(
      gameState,
      actorName,
      command + ' requires chief priviliges'
    );
    return;
  }
  target = pop.memberByName(targetName, gameState);
  if (!target) {
    text.addMessage(
      gameState,
      actorName,
      targetName + ' was not found in the tribe'
    );
    return;
  }
  target.cannotInvite = true; // for secret mating
  gameState.open = false;
  text.addMessage(
    gameState,
    'tribe',
    'Chief ' + actorName + ' cancels ' + targetName + "'s chance to reproduce"
  );
  gameState.saveRequired = true;
  return;
}
