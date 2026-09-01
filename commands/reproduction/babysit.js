const { SlashCommandBuilder } = require('../../libs/command-builders.js');
const text = require('../../libs/textprocess.js');
const childLib = require('../../libs/children.js');
const pop = require('../../libs/population.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('babysit')
    .setDescription('Command an adult child to watch a young child')
    .addStringOption((option) =>
      option
        .setName('babysitter')
        .setDescription('name of the child being assigned to babysit')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('child')
        .setDescription('name of the child to be watched')
        .setRequired(true)
    ),
  async execute(interaction, gameState) {
    var babysitterName = interaction.options.getString('babysitter');
    var childName = interaction.options.getString('child');
    var actorName = interaction.member.displayName;
    babysit(gameState, actorName, babysitterName, childName);
  },
};

function babysit(gameState, actorName, babysitterName, childName) {
  var children = gameState.children;
  const sitterKey = childLib.resolveChildKey(
    babysitterName,
    children,
    gameState
  );
  const wardKey = childLib.resolveChildKey(childName, children, gameState);

  if (!sitterKey || !children[sitterKey]) {
    text.addMessage(
      gameState,
      actorName,
      'Did not recognize babysitter ' + babysitterName + '.'
    );
    return;
  }
  if (!wardKey || !children[wardKey]) {
    text.addMessage(
      gameState,
      actorName,
      'Did not recognize child ' + childName + '.'
    );
    return;
  }

  var babysitter = children[sitterKey];
  var child = children[wardKey];
  babysitterName = sitterKey;
  childName = wardKey;

  const actorMember = pop.memberByName(actorName, gameState);
  const actorKey =
    (actorMember &&
      (pop.getPopulationKey(actorMember, gameState) || actorMember.name)) ||
    actorName;
  if (
    String(babysitter.mother || '').toLowerCase() !==
    String(actorKey).toLowerCase()
  ) {
    text.addMessage(
      gameState,
      actorName,
      'You are not the mother of ' + babysitterName + '.'
    );
    return;
  }

  console.log(
    ' babysitter age:' +
      babysitter.age +
      ' reproductionRound:' +
      gameState.reproductionRound
  );
  if (babysitter.age > 22) {
    if (child.newAdult) {
      text.addMessage(
        gameState,
        actorName,
        childName + ' does not need watching.'
      );
      return;
    }
    var response = '';
    if (babysitter.babysitting) {
      response +=
        babysitterName + ' stops watching ' + babysitter.babysitting + '.\n';
    }
    babysitter.babysitting = childName;
    response += babysitterName + ' starts watching ' + childName + '.';
    text.addMessage(gameState, 'tribe', response);
  } else {
    text.addMessage(
      gameState,
      actorName,
      babysitterName + ' is not old enough to watch children.'
    );
    return;
  }
  gameState.saveRequired = true;
  return;
}
