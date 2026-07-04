const { SlashCommandBuilder } = require('../../libs/command-builders.js');
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
          'name of child to feed, parent name to feed all their children, !all for all hungry children, or !under2 for hungry children under age two'
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
  const player = pop.memberByName(sourceName, gameState);

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
  if (amount == 0 || amount > 2) {
    text.addMessage(gameState, sourceName, 'Amount must be between 1 and 2.');
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
  const childList = rawList.split(' ');
  const message = feedlib.feed(
    interaction,
    player,
    amount,
    childList,
    gameState
  );
  console.log('return ' + message);
  gameState.saveRequired = true;
  return;
}
