const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const violencelib = require('../../libs/violence');
const text = require('../../libs/textprocess.js');
const pop = require('../../libs/population');

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
  player = pop.memberByName(actorName, gameState);

  if (side != 'for' && side != 'against' && side != 'neutral') {
    text.addMessage(
      gameState,
      actorName,
      'faction syntax is /faction <for|against|neutral>'
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
  player.faction = side;
  violencelib.getFactionResult(gameState);
  gameState.saveRequired = true;
  return;
}
