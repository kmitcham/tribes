const { SlashCommandBuilder } = require('../../libs/command-builders.js');
const text = require('../../libs/textprocess.js');
const pop = require('../../libs/population.js');
const guardValidation = require('../../libs/guardValidation.js');
const guardlib = require('../../libs/guardCode.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('guard')
    .setDescription(
      'Add a child to the list of children you are guarding.  Use name "none" to stop guarding'
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
    )
    .addStringOption((option) =>
      option
        .setName('child6')
        .setDescription('another child of the tribe')
        .setRequired(false)
    ),
  async execute(interaction, gameState) {
    onCommand(interaction, gameState);
  },
};

function onCommand(interaction, gameState) {
  var actorName = interaction.member.displayName;
  var c1Name = interaction.options.getString('child1');
  var c2Name = interaction.options.getString('child2');
  var c3Name = interaction.options.getString('child3');
  var c4Name = interaction.options.getString('child4');
  var c5Name = interaction.options.getString('child5');
  var c6Name = interaction.options.getString('child6');

  const validation = guardValidation.validateGuardingChange(
    actorName,
    gameState
  );
  if (validation.error) {
    text.addMessage(gameState, actorName, validation.error);
    return;
  }
  const person = validation.person;
  const previousGuarding = Array.isArray(person.guarding)
    ? person.guarding.slice()
    : [];

  let response = '';
  response += guardChild(actorName, gameState, c1Name) + '\n';

  if (c2Name) response += guardChild(actorName, gameState, c2Name) + '\n';
  if (c3Name) response += guardChild(actorName, gameState, c3Name) + '\n';
  if (c4Name) response += guardChild(actorName, gameState, c4Name) + '\n';
  if (c5Name) response += guardChild(actorName, gameState, c5Name) + '\n';
  if (c6Name) response += guardChild(actorName, gameState, c6Name) + '\n';
  if (response.includes('FAIL')) {
    text.addMessage(gameState, actorName, response);
  } else {
    const summary = summarizeGuardChange(
      actorName,
      previousGuarding,
      person.guarding
    );
    text.addMessage(gameState, 'tribe', summary);
    console.log('Saving gameState');
    gameState.saveRequired = true;
  }
}

function formatChildList(names) {
  if (!names || names.length === 0) {
    return '';
  }
  if (names.length === 1) {
    return names[0];
  }
  if (names.length === 2) {
    return names[0] + ' and ' + names[1];
  }
  return names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1];
}

/**
 * Build a tribe message that reflects what actually changed when the UI
 * resets guards via child1=none then re-adds the kept set.
 */
function summarizeGuardChange(actorName, previousGuarding, nextGuarding) {
  const before = Array.isArray(previousGuarding) ? previousGuarding : [];
  const after = Array.isArray(nextGuarding) ? nextGuarding : [];
  const beforeSet = new Set(before);
  const afterSet = new Set(after);

  const stopped = before.filter((name) => !afterSet.has(name));
  const started = after.filter((name) => !beforeSet.has(name));
  const continued = after.filter((name) => beforeSet.has(name));

  const parts = [];
  if (stopped.length > 0) {
    parts.push(actorName + ' stops guarding ' + formatChildList(stopped));
  }
  if (started.length > 0) {
    parts.push(actorName + ' starts guarding ' + formatChildList(started));
  }
  if (continued.length > 0 && (stopped.length > 0 || started.length > 0)) {
    parts.push(actorName + ' continues guarding ' + formatChildList(continued));
  } else if (
    continued.length > 0 &&
    stopped.length === 0 &&
    started.length === 0
  ) {
    parts.push(actorName + ' continues guarding ' + formatChildList(continued));
  }

  if (parts.length === 0) {
    return actorName + ' is not guarding any children';
  }
  return parts.join('. ') + '.';
}
module.exports.summarizeGuardChange = summarizeGuardChange;

function guardChild(actorName, gameState, cName) {
  var person = pop.memberByName(actorName, gameState);
  const children = gameState.children;
  var response = '';
  if (!person) {
    return 'FAIL: you are not a person';
  }
  if (person.worked == true || gameState.workRound == false) {
    return 'FAIL You can not change guard status after having worked, or outside the work round';
  }
  if (text.capitalizeFirstLetter(cName) == 'None') {
    if (person.guarding) {
      response += actorName + ' stops watching ' + person.guarding;
    }
    delete person.guarding;
    return response;
  }
  if (person.guarding && person.guarding.length > 4) {
    return 'FAIL You are already guarding enough children: ' + person.guarding;
  }
  if (person.isSick && person.isSick > 0) {
    return 'FAIL You are too sick to watch children';
  }
  const childName = text.capitalizeFirstLetter(cName);
  console.log('checking ' + childName);
  const child = children[childName];
  if (!child) {
    return 'FAIL Could not find child: ' + childName;
  } else if (!guardlib.isChildGuardAssignable(child)) {
    // Work-round assignment: years -0.5..11.5 (seasons -1..23). Food ages +1
    // before reproduction threats.
    return (
      'FAIL ' +
      childName +
      ' is age ' +
      Number(child.age || 0) / 2 +
      ' and cannot be guarded this work round (only ages -0.5 to 11.5)'
    );
  } else if (person.guarding && person.guarding.indexOf(childName) != -1) {
    console.log(person.guarding);
    return 'FAIL You are already guarding ' + childName;
  } else {
    console.log('valid guard ' + childName);
    if (person.guarding) {
      person.guarding.push(childName);
    } else {
      person.guarding = [childName];
    }
    return 'You start guarding ' + childName;
  }
}
