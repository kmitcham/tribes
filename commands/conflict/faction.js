const { SlashCommandBuilder } = require('../../libs/command-builders.js');
const violencelib = require('../../libs/violence.js');
const text = require('../../libs/textprocess.js');
const pop = require('../../libs/population.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('faction')
    .setDescription(
      'Your stance on the demand: fight FOR, fight AGAINST, or not worth fighting over'
    )
    .addStringOption((option) =>
      option
        .setName('faction')
        .setDescription('<for|against|neutral>')
        .addChoices(
          { name: 'for', value: 'for' },
          { name: 'against', value: 'against' },
          { name: 'neutral', value: 'neutral' }
        )
        .setRequired(true)
    ),
  async execute(interaction, gameState) {
    var actorName = interaction.member.displayName;
    var faction = interaction.options.getString('faction');
    console.log(actorName + ' faction ' + faction);
    setFaction(gameState, actorName, faction);
  },
};

function setFaction(gameState, actorName, side) {
  const player = pop.memberByName(actorName, gameState);

  if (!player) {
    text.addMessage(gameState, actorName, 'Not in the tribe');
    return;
  }
  if (side != 'for' && side != 'against' && side != 'neutral') {
    text.addMessage(
      gameState,
      actorName,
      'faction syntax is faction <for|against|neutral>'
    );
    return;
  }
  if (gameState['violence']) {
    text.addMessage(
      gameState,
      actorName,
      'The time for factions has past; it has come to violence.  You must attack, defend or run.'
    );
    return;
  }
  if (!gameState['demand']) {
    text.addMessage(
      gameState,
      actorName,
      'There is no demand to have a faction about'
    );
    return;
  }
  if (player.faction === side) {
    text.addMessage(
      gameState,
      actorName,
      'You are already in the ' + side + ' faction.'
    );
    return;
  }
  const previousSide = player.faction;
  player.faction = side;
  if (side !== 'neutral') {
    const breakdown = violencelib.getMemberFactionValueBreakdown(player);
    const detail = breakdown.parts.join(', ');
    text.addMessage(
      gameState,
      actorName,
      `You bring ${breakdown.score} point${breakdown.score !== 1 ? 's' : ''} to the ${side.toUpperCase()} faction (${detail}).`
    );
  }
  announceAffectedSideScores(gameState, previousSide, side);
  violencelib.getFactionResult(gameState);
  gameState.saveRequired = true;
  return;
}

function announceAffectedSideScores(gameState, previousSide, newSide) {
  const trackedSides = ['for', 'against'];
  const affected = [];
  if (trackedSides.includes(previousSide)) {
    affected.push(previousSide);
  }
  if (trackedSides.includes(newSide) && !affected.includes(newSide)) {
    affected.push(newSide);
  }
  if (affected.length === 0) {
    return;
  }

  const scores = violencelib.getFactionScores(gameState);
  for (const side of affected) {
    const label = side === 'for' ? 'FOR' : 'AGAINST';
    text.addMessage(
      gameState,
      'tribe',
      `${label} side score is now ${scores[side]}.`
    );
  }
}
module.exports.setFaction = setFaction;
