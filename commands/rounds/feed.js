const { SlashCommandBuilder } = require('../../libs/command-builders.js');
const pop = require('../../libs/population.js');
const feedlib = require('../../libs/feed.js');
const text = require('../../libs/textprocess.js');
const access = require('../../libs/access.js');
const logger = require('../../libs/logger.js');

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
  var amount = interaction.options.getInteger('amount') ?? 2;
  var rawList = interaction.options.getString('child');
  const player = pop.memberByName(sourceName, gameState);

  if (amount < 0 && !access.isReferee(sourceName)) {
    text.addMessage(
      gameState,
      sourceName,
      'Only the referee can reduce amounts.'
    );
    return;
  }
  if (!player) {
    // this makes sure the author is in the tribe
    text.addMessage(gameState, sourceName, access.NOT_IN_TRIBE_MESSAGE);
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
  // Comma separates multiple targets; do NOT split on spaces — unborn keys
  // are like "Ursa's unborn" and must stay one name.
  const childList = parseFeedChildArgument(rawList);
  const message = feedlib.feed(
    interaction,
    player,
    amount,
    childList,
    gameState
  );
  logger.accessLog.info('return ' + message);
  gameState.saveRequired = true;
  return;
}

/**
 * Parse the feed `child` parameter into one or more target names.
 * - Arrays (from UI) are used as-is
 * - Comma-separated strings → multiple targets
 * - Otherwise the whole string is one target (supports "Mother's unborn")
 */
function parseFeedChildArgument(rawList) {
  if (rawList == null) {
    return [];
  }
  if (Array.isArray(rawList)) {
    return rawList
      .map((entry) => String(entry == null ? '' : entry).trim())
      .filter((entry) => entry.length > 0);
  }
  const asString = String(rawList).trim();
  if (!asString) {
    return [];
  }
  if (asString.includes(',')) {
    return asString
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  return [asString];
}
module.exports.parseFeedChildArgument = parseFeedChildArgument;
