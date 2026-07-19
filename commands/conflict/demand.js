const { SlashCommandBuilder } = require('../../libs/command-builders.js');
const pop = require('../../libs/population.js');
const violencelib = require('../../libs/violence.js');
const text = require('../../libs/textprocess.js');
const access = require('../../libs/access.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('demand')
    .setDescription('Make a demand, something you will fight about if needed.')
    .addStringOption((option) =>
      option
        .setName('demand')
        .setDescription('Write the demand as the arguement')
        .setRequired(false)
    ),
  async execute(interaction, gameState, _bot) {
    var actorName = interaction.member.displayName;
    var demandText = interaction.options.getString('demand');

    demand(gameState, actorName, demandText);
  },
};

function demand(gameState, actorName, demandText) {
  var player = pop.memberByName(actorName, gameState);
  var currentDemand = '';
  if (gameState.ended) {
    text.addMessage(
      gameState,
      actorName,
      'The game is over.  Maybe you want to join to start a new game?'
    );
    return;
  }
  if (gameState.hasOwnProperty('demand')) {
    currentDemand = gameState['demand'];
  }
  if (!player) {
    text.addMessage(gameState, actorName, access.NOT_IN_TRIBE_MESSAGE);
    return;
  }
  if (currentDemand || gameState.violence) {
    text.addMessage(
      gameState,
      actorName,
      'The current demand is : ' + currentDemand
    );
    return;
  }
  // only get here if there is NOT a current demand
  if (!demandText || demandText.length < 1) {
    text.addMessage(
      gameState,
      actorName,
      'Syntax: demand <text of your demand here>'
    );
    return;
  }

  violencelib.demand(actorName, demandText, gameState);
  gameState.saveRequired = true;

  return;
}
