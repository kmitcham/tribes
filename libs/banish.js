const populationLib = require('./population.js');
const text = require('./textprocess');

function banish(gameState, targetName, reason) {
  const population = gameState.population;
  console.log('In banish lib for ' + targetName);
  const banishTarget = populationLib.memberByName(targetName, gameState);
  if (!reason) {
    reason = 'No reason supplied';
  }
  if (banishTarget) {
    if (!gameState.banished) {
      gameState.banished = {};
    }
    gameState.banished[targetName] = [banishTarget, reason];
    // removing the player from the banish list is a pain.
    targetKey = Object.keys(population).find(
      (key) => population[key] === banishTarget
    );
    delete population[targetKey];
    text.addMessage(
      gameState,
      'tribe',
      targetName + ' is banished from the tribe'
    );
    for (childName in gameState.children) {
      child = gameState.children[childName];
      console.log(childName + ' is getting checked');
      // remove the unborn children
      if (child.mother == targetName && child.age < 4) {
        gameState.banished[childName] = [child, 'banished in the womb'];
        delete gameState.children[childName];
      }
      if (
        banishTarget.guarding &&
        banishTarget.guarding.indexOf(childName) > -1
      ) {
        childIndex = banishTarget.guarding.indexOf(childName);
        if (childIndex > -1) {
          banishTarget.guarding.splice(childIndex, 1);
        }
        text.addMessage(
          gameState,
          'tribe',
          targetName + ' stops guarding ' + childName
        );
      }
    }
    // clean up inviteLists
    for (memberName in population) {
      if (memberName == targetName) {
        continue;
      }
      member = population[memberName];
      if (member.inviteList) {
        targetIndex = member.inviteList.indexOf(targetName);
        if (targetIndex > -1) {
          member.inviteList.splice(targetIndex, 1);
        }
      }
    }
    gameState.banished[targetName] = [banishTarget, reason];
    gameState.saveRequired = true;
    return;
  } else {
    console.log('Failed to get the person; banish fails');
    text.addMessage(
      gameState,
      'tribe',
      targetName + ' was not found in the tribe'
    );
  }
}
module.exports.banish = banish;

function banishAdmin(gameState, actorName, targetName, reason) {
  const actingMember = populationLib.memberByName(actorName, gameState);
  const targetMember = populationLib.memberByName(targetName, gameState);

  if (!actingMember) {
    text.addMessage(gameState, actorName, 'Are you even in a tribe?');
    return;
  }
  if (!actingMember.chief) {
    text.addMessage(gameState, actorName, 'banish requires chief priviliges');
    return;
  }
  if (gameState.demand || gameState.violence) {
    text.addMessage(
      gameState,
      actorName,
      'banish can not be used during a conflict'
    );
    return;
  }
  if (!targetMember) {
    text.addMessage(
      gameState,
      actorName,
      targetName + ' was not found in the tribe'
    );
    return;
  }
  if (gameState.ended) {
    text.addMessage(
      gameState,
      actorName,
      'The game is over.  Maybe you want to /join to start a new game?'
    );
    return;
  }
  return banish(gameState, targetName, reason);
}
module.exports.banishAdmin = banishAdmin;
