const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pop = require('../../libs/population.js');
const feedlib = require('../../libs/feed.js');
const text = require('../../libs/textprocess.js');
const referees = require('../../libs/referees.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('feed')
    .setDescription(
      'feed food (or grain, if that is all you have) to a child. '
    )
    .addStringOption((option) =>
      option
        .setName('child')
        .setDescription(
          'name of child to feed, or parent name to feed all their children, or !all for all hungry children'
        )
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription(
          'amount to feed (default is until the child is no longer hungery)'
        )
        .setRequired(false)
    ),
  async execute(interaction, gameState) {
    feed(interaction, gameState);
  },
};

function feed(interaction, gameState) {
  var sourceName = interaction.member.displayName;
  var amount = interaction.options.getInteger('amount') || 2;
  var rawList = interaction.options.getString('child');
  player = pop.memberByName(sourceName, gameState);

  if (amount < 0 && !referees.includes(sourceName)) {
    text.addMessage(
      gameState,
      sourceName,
      'Only the referee can reduce amounts'
    );
    return;
  }
  if (!player) {
    // this makes sure the author is in the tribe
    text.addMessage(
      gameState,
      sourceName,
      'Children do not take food from strangers'
    );
    return;
  }
  if (gameState.reproductionRound && gameState.needChanceRoll) {
    text.addMessage(
      gameState,
      sourceName,
      'Must wait until after chance to feed the children.'
    );
    return;
  }
  childList = rawList.split(' ');
  message = feedlib.feed(interaction, player, amount, childList, gameState);
  console.log('return ' + message);
  gameState.saveRequired = true;
  return;
}

function onError(interaction, response) {
  interaction.user.send(response);
  const embed = new EmbedBuilder().setDescription(response);
  interaction
    .reply({ embeds: [embed], ephemeral: true }) // error message
    .catch(console.error);
  return;
}
