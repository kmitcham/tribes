const populationLib = require('./population.js');
const text = require('./textprocess.js');

/**
 * Move a living tribe member onto gameState.banished (same list for banished
 * and voluntary departures). reason is stored for graveyard/career display.
 * mode: 'banish' | 'depart'
 */
function removeFromTribe(gameState, targetName, reason, mode) {
  const population = gameState.population;
  const isDepart = mode === 'depart';
  console.log(
    'In removeFromTribe (' + mode + ') for ' + targetName + ' reason:' + reason
  );
  const banishTarget = populationLib.memberByName(targetName, gameState);
  if (!reason) {
    reason = isDepart ? 'left voluntarily' : 'No reason supplied';
  }
  if (!banishTarget) {
    console.log('Failed to get the person; removeFromTribe fails');
    text.addMessage(
      gameState,
      'tribe',
      targetName + ' was not found in the tribe.'
    );
    return false;
  }

  const wasChief = !!banishTarget.chief;
  const displayName = banishTarget.name || targetName;

  if (!gameState.banished) {
    gameState.banished = {};
  }
  gameState.banished[targetName] = [banishTarget, reason];

  const targetKey = Object.keys(population).find(
    (key) => population[key] === banishTarget
  );
  delete population[targetKey];

  if (isDepart) {
    text.addMessage(
      gameState,
      'tribe',
      displayName +
        ' has departed the tribe. They cannot rejoin this tribe for the rest of this game.'
    );
  } else {
    text.addMessage(
      gameState,
      'tribe',
      displayName +
        ' is banished from the tribe. They cannot rejoin this tribe for the rest of this game.'
    );
  }

  for (const childName in gameState.children) {
    const child = gameState.children[childName];
    console.log(childName + ' is getting checked');
    // remove the unborn children
    if (
      (child.mother == targetName || child.mother == displayName) &&
      child.age < 4
    ) {
      const childReason = isDepart
        ? 'departed with mother'
        : 'banished in the womb';
      gameState.banished[childName] = [child, childReason];
      delete gameState.children[childName];
    }
    if (
      banishTarget.guarding &&
      banishTarget.guarding.indexOf(childName) > -1
    ) {
      const childIndex = banishTarget.guarding.indexOf(childName);
      if (childIndex > -1) {
        banishTarget.guarding.splice(childIndex, 1);
      }
      text.addMessage(
        gameState,
        'tribe',
        displayName + ' stops guarding ' + childName + '.'
      );
    }
  }
  // clean up inviteLists
  for (const memberName in population) {
    if (memberName == targetName) {
      continue;
    }
    const member = population[memberName];
    if (member.inviteList) {
      const targetIndex = member.inviteList.indexOf(targetName);
      if (targetIndex > -1) {
        member.inviteList.splice(targetIndex, 1);
      }
      const displayIndex = member.inviteList.indexOf(displayName);
      if (displayIndex > -1) {
        member.inviteList.splice(displayIndex, 1);
      }
    }
  }
  gameState.banished[targetName] = [banishTarget, reason];
  gameState.saveRequired = true;

  const remainingAdults = Object.keys(population).length;
  if (remainingAdults === 0) {
    text.addMessage(
      gameState,
      'tribe',
      'The last adult has left the tribe. The game ends.'
    );
    const endGame = require('./endgame.js');
    endGame.endGame(gameState);
    return true;
  }

  // Chief departs or is banished (including self-banish by chief).
  if (wasChief) {
    text.addMessage(
      gameState,
      'tribe',
      'The tribe needs a new chief. Use vote to choose one.'
    );
    gameState.commandsNeedRefresh = true;
  }

  return true;
}

function banish(gameState, targetName, reason) {
  return removeFromTribe(gameState, targetName, reason, 'banish');
}
module.exports.banish = banish;
module.exports.removeFromTribe = removeFromTribe;

function conflictBlocksMembershipChange(gameState) {
  return !!(gameState.demand || gameState.violence);
}

function conflictBlockMessage(actionLabel, gameState) {
  const activeDemand = gameState.demand || gameState.violence;
  return (
    actionLabel +
    ' can not be used during a conflict (active demand or violence). Active conflict: ' +
    activeDemand +
    '.'
  );
}

function banishAdmin(gameState, actorName, targetName, reason) {
  const access = require('./access.js');
  const targetMember = populationLib.memberByName(targetName, gameState);

  if (!access.canActAsChief(actorName, gameState)) {
    text.addMessage(gameState, actorName, 'banish requires chief privileges.');
    return;
  }
  if (conflictBlocksMembershipChange(gameState)) {
    text.addMessage(
      gameState,
      actorName,
      conflictBlockMessage('Banish', gameState)
    );
    return;
  }
  if (!targetMember) {
    text.addMessage(
      gameState,
      actorName,
      targetName + ' was not found in the tribe.'
    );
    return;
  }
  if (gameState.ended) {
    text.addMessage(
      gameState,
      actorName,
      'The game is over. Maybe you want to join to start a new game?'
    );
    return;
  }
  return banish(gameState, targetName, reason);
}
module.exports.banishAdmin = banishAdmin;

/**
 * Voluntary leave. Same banished list as forced banish; different reason/messages.
 */
function depart(gameState, actorName) {
  const access = require('./access.js');
  const member = populationLib.memberByName(actorName, gameState);

  if (!member) {
    text.addMessage(gameState, actorName, access.NOT_IN_TRIBE_MESSAGE);
    return;
  }
  if (gameState.ended) {
    text.addMessage(
      gameState,
      actorName,
      'The game is over. Maybe you want to join to start a new game?'
    );
    return;
  }
  if (conflictBlocksMembershipChange(gameState)) {
    text.addMessage(
      gameState,
      actorName,
      conflictBlockMessage('Depart', gameState)
    );
    return;
  }

  const ok = removeFromTribe(
    gameState,
    member.name,
    'left voluntarily',
    'depart'
  );
  if (ok) {
    text.addMessage(
      gameState,
      actorName,
      'You have left this tribe voluntarily. You are no longer a member (not banished as punishment, not dead). You cannot rejoin this tribe for the rest of this game.'
    );
  }
}
module.exports.depart = depart;
