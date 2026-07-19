const { SlashCommandBuilder } = require('../../libs/command-builders.js');

const text = require('../../libs/textprocess.js');
const pop = require('../../libs/population.js');
const guardValidation = require('../../libs/guardValidation.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ignore')
    .setDescription(
      'Remove a child from the list of children you are guarding.'
    )
    .addStringOption((option) =>
      option
        .setName('child1')
        .setDescription('one of children of the tribe')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('child2')
        .setDescription('another child of the tribe')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('child3')
        .setDescription('another child of the tribe')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('child4')
        .setDescription('another child of the tribe')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('child5')
        .setDescription('another child of the tribe')
        .setRequired(false)
    ),
  async execute(interaction, gameState) {
    var actorName = interaction.member.displayName;
    var cName = interaction.options.getString('child1');
    var cName2 = interaction.options.getString('child2');
    var cName3 = interaction.options.getString('child3');
    var cName4 = interaction.options.getString('child4');
    var cName5 = interaction.options.getString('child5');
    ignoreChildren(gameState, actorName, cName, cName2, cName3, cName4, cName5);
  },
};

function ignoreChildren(
  gameState,
  actorName,
  cName,
  cName2,
  cName3,
  cName4,
  cName5
) {
  const validation = guardValidation.validateGuardingChange(
    actorName,
    gameState
  );
  if (validation.error) {
    text.addMessage(gameState, actorName, validation.error);
    return;
  }
  let response = '';
  response += ignoreChild(gameState, actorName, cName) + '\n';
  if (cName2) {
    response += ignoreChild(gameState, actorName, cName2) + '\n';
  }
  if (cName3) {
    response += ignoreChild(gameState, actorName, cName3) + '\n';
  }
  if (cName4) {
    response += ignoreChild(gameState, actorName, cName4) + '\n';
  }
  if (cName5) {
    response += ignoreChild(gameState, actorName, cName5) + '\n';
  }
  if (response.includes('FAIL')) {
    text.addMessage(gameState, actorName, response);
  } else {
    text.addMessage(gameState, 'tribe', response);
    gameState.saveRequired = true;
  }
}

function ignoreChild(gameState, actorName, cName) {
  var person = pop.memberByName(actorName, gameState);
  const children = gameState.children;
  var response = '';
  if (!person) {
    return require('../../libs/access.js').NOT_IN_TRIBE_MESSAGE;
  }
  console.log(
    'inside ignore cName ' +
      text.capitalizeFirstLetter(cName) +
      ' actorName ' +
      actorName
  );
  if ('all' == cName.toLowerCase()) {
    if (person.guarding && person.guarding.length > 0) {
      response = actorName + ' stops guarding ' + person.guarding + '\n';
      delete person.guarding;
      return response;
    } else {
      return actorName + ' is not guarding anyone.\n';
    }
  }
  const childName = text.capitalizeFirstLetter(cName);
  const child = children[childName];
  if (!child) {
    return 'FAIL: Could not find child: ' + childName;
  } else if (!person.guarding || person.guarding.indexOf(childName) == -1) {
    return 'FAIL: You are not guarding ' + childName;
  } else {
    const childIndex = person.guarding.indexOf(childName);
    if (childIndex > -1) {
      person.guarding.splice(childIndex, 1);
      if (person.guarding.length === 0) {
        delete person.guarding;
      }
    }
    return actorName + ' stops guarding ' + childName + '\n';
  }
}
