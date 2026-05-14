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
  population = gameState.population;
  children = gameState.children;
  childName = textLib.capitalizeFirstLetter(name);
  if (!message || message == '') {
    message = 'unknown causes';
  }
  if ('graveyard' in gameState) {
  } else {
    gameState.graveyard = {};
  }
  const isMotherDied = message === 'mother-died';
  const deathSummary = isMotherDied
    ? 'died in utero after mother died'
    : 'killed by ' + message;

  person = populationLib.memberByName(name, gameState);
  let displayName = name;
  if (person) {
    displayName = person.name || name;
    person.deathMessage = message;
    person.deathSeason = gameState.seasonCounter;
    if (person.isPregnant) {
      kill(person.isPregnant, 'mother-died', gameState);
    }
    if (person.nursing) {
      person.nursing.forEach((childName) =>
        kill(childName, 'no-milk', gameState)
      );
    }
    personKey = getKeyByValue(gameState.population, person);
    gameState.graveyard[name] = person;
    delete population[personKey];
    removeNameFromAllRelationshipLists(name, gameState.population, false);
  } else if (childName in children) {
    guardlib.unguardChild(childName, population);
    clearNursingPregnant(childName, gameState.population);
    var child = children[childName];
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
  textLib.addMessage(gameState, 'tribe', displayName + ' ' + deathSummary);
  populationLib.history(displayName, displayName + ' ' + deathSummary, gameState);
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

function removeNameFromAllRelationshipLists(targetName, population, isChild = false) {
  if (!population) {
    return;
  }
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
  }
}

function clearNursingPregnant(childName, population) {
  for (personName in population) {
    person = population[personName];
    if (person.nursing && person.nursing.indexOf(childName) > -1) {
      childIndex = person.nursing.indexOf(childName);
      person.nursing.splice(childIndex, 1);
      console.log(person.name + ' is no longer nursing ' + childName);
      if (person.nursing.length == 0) {
        delete person.nursing;
      }
    }
    if (person.isPregnant && person.isPregnant == childName) {
      person.isPregnant = '';
      console.log(person.name + ' is no longer pregnant with ' + childName);
    }
  }
}
