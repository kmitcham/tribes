const guardlib = require('./guardCode.js');
const textLib = require('./textprocess.js');
const populationLib = require('./population.js');

function getKeyByValue(object, value) {
  return Object.keys(object).find((key) => object[key] === value);
}

function kill(name, message, gameState) {
  console.log(
    'Killing ' +
      name +
      ' due to ' +
      message +
      ' at seasonCount ' +
      gameState.seasonCounter
  );
  const population = gameState.population;
  const children = gameState.children;
  const childName = textLib.capitalizeFirstLetter(name);
  if (!message || message == '') {
    message = 'unknown causes';
  }
  if (!('graveyard' in gameState)) {
    gameState.graveyard = {};
  }
  const isMotherDied = message === 'mother-died';
  const deathSummary = isMotherDied
    ? 'died in utero after mother died'
    : 'killed by ' + message;

  const person = populationLib.memberByName(name, gameState);
  let displayName = name;
  let isChildDeath = false;
  if (person) {
    displayName = person.name || name;
    const personKey = getKeyByValue(gameState.population, person);
    person.deathMessage = message;
    person.deathSeason = gameState.seasonCounter;
    if (person.isPregnant) {
      kill(person.isPregnant, 'mother-died', gameState);
    }
    if (person.nursing) {
      // Iterate over a snapshot because recursive child kills mutate nursing lists.
      var nursingChildren = person.nursing.slice();
      nursingChildren.forEach((childName) =>
        kill(childName, 'no-milk', gameState)
      );
    }
    gameState.graveyard[name] = person;
    delete population[personKey];
    removeNameFromAllRelationshipLists(name, gameState.population, false);
  } else if (childName in children) {
    isChildDeath = true;
    guardlib.unguardChild(childName, population);
    const child = children[childName];
    if (!child.name) {
      child.name = childName;
    }
    displayName = child.name || childName;
    child.deathMessage = message;
    child.deathSeason = gameState.seasonCounter;
    gameState.graveyard[childName] = child;
    delete children[childName];
    removeNameFromAllRelationshipLists(childName, gameState.population, true);
  } else {
    console.log('Tried to kill ' + name + ' but could not find them');
    return;
  }

  if (!gameState._foodRoundDeathEvents) {
    gameState._foodRoundDeathEvents = [];
  }

  const deathEventKey =
    String(displayName).toLowerCase() + '|' + String(message).toLowerCase();
  const hasEvent = gameState._foodRoundDeathEvents.some(
    (evt) => evt && evt.key === deathEventKey
  );
  if (!hasEvent) {
    gameState._foodRoundDeathEvents.push({
      key: deathEventKey,
      name: displayName,
      cause: message,
      isChild: isChildDeath,
    });
  }

  if (!gameState._suppressImmediateDeathMessages) {
    textLib.addMessage(gameState, 'tribe', displayName + ' ' + deathSummary);
  }
  populationLib.history(
    displayName,
    displayName + ' ' + deathSummary,
    gameState
  );
  return;
}
module.exports.kill = kill;

function removeNameFromArray(list, targetName) {
  if (!list || !Array.isArray(list)) {
    return;
  }
  var lowerTarget = String(targetName).toLowerCase();
  for (var i = list.length - 1; i >= 0; i--) {
    if (String(list[i]).toLowerCase() === lowerTarget) {
      list.splice(i, 1);
    }
  }
}

function removeNameFromAllRelationshipLists(
  targetName,
  population,
  isChild = false
) {
  if (!population) {
    return;
  }
  var lowerTargetName = String(targetName).toLowerCase();
  for (var personName in population) {
    var person = population[personName];
    if (!person) {
      continue;
    }
    removeNameFromArray(person.inviteList, targetName);
    removeNameFromArray(person.consentList, targetName);
    removeNameFromArray(person.declineList, targetName);
    // guarding arrays contain child names only; only clean up when the dead entity is a child
    // to avoid accidentally unguarding a child that shares a name with a dead adult
    if (isChild) {
      removeNameFromArray(person.guarding, targetName);
      removeNameFromArray(person.nursing, targetName);

      if (
        person.isPregnant &&
        String(person.isPregnant).toLowerCase() === lowerTargetName
      ) {
        person.isPregnant = '';
      }
    }

    if (person.consentDict && typeof person.consentDict === 'object') {
      for (var key in person.consentDict) {
        if (String(key).toLowerCase() === String(targetName).toLowerCase()) {
          delete person.consentDict[key];
        }
      }
      if (Object.keys(person.consentDict).length === 0) {
        delete person.consentDict;
      }
    }

    if (person.inviteList && person.inviteList.length === 0) {
      delete person.inviteList;
    }
    if (person.consentList && person.consentList.length === 0) {
      delete person.consentList;
    }
    if (person.declineList && person.declineList.length === 0) {
      delete person.declineList;
    }
    if (person.guarding && person.guarding.length === 0) {
      delete person.guarding;
    }
    if (person.nursing && person.nursing.length === 0) {
      delete person.nursing;
    }
  }
}
