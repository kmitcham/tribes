const locations = require('./locations.json');
const dice = require('./dice.js');
const killlib = require('./kill.js');

function isChildGuardEligible(child) {
  return !!(
    child &&
    typeof child.age === 'number' &&
    child.age >= 0 &&
    child.age < 23
  );
}

function getEligibleGuardTargets(person, children) {
  if (!person || !Array.isArray(person.guarding)) {
    return [];
  }

  var eligibleTargets = [];
  for (var i = 0; i < person.guarding.length; i++) {
    var childName = person.guarding[i];
    var child = children ? children[childName] : null;
    if (
      isChildGuardEligible(child) &&
      eligibleTargets.indexOf(childName) === -1
    ) {
      eligibleTargets.push(childName);
    }
  }
  return eligibleTargets;
}

module.exports.normalizeGuardAssignments = (population, children) => {
  for (var personName in population) {
    var person = population[personName];
    if (!person || !Array.isArray(person.guarding)) {
      continue;
    }

    var eligibleTargets = getEligibleGuardTargets(person, children);
    if (eligibleTargets.length > 0) {
      person.guarding = eligibleTargets;
    } else {
      delete person.guarding;
    }
  }
};

module.exports.findGuardValueForChild = (childName, population, children) => {
  var guardValue = Number(0);
  var child = children[childName];

  module.exports.normalizeGuardAssignments(population, children);

  if (!child || !isChildGuardEligible(child)) {
    if (child) {
      child.guardians = {};
    }
    return 0;
  }

  child.guardians = {};
  for (var personName in population) {
    var person = population[personName];
    var guardTargets = getEligibleGuardTargets(person, children);
    if (guardTargets.includes(childName)) {
      var watchValue = 1 / guardTargets.length;
      guardValue = guardValue + watchValue;
      child.guardians[person.name] = guardTargets.length;
    }
  }
  // check for babysitters
  for (var name in children) {
    var babysitter = children[name];
    if (babysitter.age >= 23 && babysitter.babysitting == childName) {
      guardValue = guardValue + 1;
      child.guardians[name] = 1;
    }
  }
  //console.log( logMessage+'\t\t TOTAL: '+guardValue)
  // round to two decimals
  return Math.round(100 * guardValue) / 100;
};

function findLeastGuarded(children, population) {
  // guard score = 7 if unguarded; otherwise is the length of the guarders 'guarding' array
  var guardChildSort = [];
  var leastGuarded = [];
  if (Object.keys(children).length == 0) {
    console.log(
      Object.keys(children).length + ' count.  No children found: ' + children
    );
    return 'No children to sort';
  }
  for (var childName in children) {
    var child = children[childName];
    if (child.age < 0) {
      // unborn children should be skipped; 0 is born
      continue;
    }
    if (child.age >= 23) {
      continue;
    }
    var guardValue = module.exports.findGuardValueForChild(
      childName,
      population,
      children
    );
    guardChildSort.push({ name: childName, score: guardValue, age: child.age });
  }
  guardChildSort.sort((a, b) => parseFloat(a.score) - parseFloat(b.score));
  if (guardChildSort.length == 0) {
    console.log(' ERROR EMPTY LIST OF GUARD CHULDREN');
    return 'No children need guarding';
  }
  var lowGuardValue = guardChildSort[0].score;
  for (var i = 0; i < guardChildSort.length; i++) {
    if (guardChildSort[i].score == lowGuardValue) {
      leastGuarded.push(guardChildSort[i]);
    } else {
      // we are out of the tie, so ignore the rest
      break;
    }
  }
  var leastGuardedName;
  if (leastGuarded.length == 1) {
    leastGuardedName = leastGuarded[0].name;
  } else {
    // sort the least guarded by age
    leastGuarded.sort((a, b) => parseFloat(a.age) - parseFloat(b.age));
    var startAge = leastGuarded[0].age;
    var maxIndex = 0;
    for (var j = 1; j < leastGuarded.length; j++) {
      if (leastGuarded[j].age > startAge) break;
      maxIndex = j;
    }
    var unluckyIndex = Math.trunc(Math.random() * maxIndex);
    leastGuardedName = leastGuarded[unluckyIndex].name;
  }
  return leastGuardedName + ' is least watched. Watch score = ' + lowGuardValue;
}
module.exports.findLeastGuarded = findLeastGuarded;

module.exports.unguardChild = (childName, population) => {
  for (var personName in population) {
    var person = population[personName];
    if (person.guarding && person.guarding.indexOf(childName) != -1) {
      var childIndex = person.guarding.indexOf(childName);
      person.guarding.splice(childIndex, 1);
    }
  }
};

module.exports.hyenaAttack = (children, gameState) => {
  var population = gameState.population;
  var currentLocation = gameState['currentLocationName'];
  var predator = locations[currentLocation]['predator'] || 'vulture';
  if (!children || Object.keys(children).length == 0) {
    // this needs to check if children are born
    return 'No children, no predator problem ';
  }
  // get the least guarded message
  var leastGuardedMessageArray = findLeastGuarded(children, population).split(
    ' '
  );
  //  this is stupid and hacky; take the name from the start of the message, and the value from the last bit
  var leastGuardedName = leastGuardedMessageArray[0];
  if (leastGuardedName === 'No') {
    return 'All the children are safely unborn, so predators are not a worry.';
  }
  const predatorEmoji = predatorIcon(predator);
  var response =
    predatorEmoji + ' A ' + predator + ' attacks ' + leastGuardedName; // exclamation point breaks simple string splitting elsewhere
  var child = children[leastGuardedName];
  if (!child) {
    console.log(
      predator + ' did not find the child somehow ' + leastGuardedName
    );
    return response + ' but a bug saved the child.';
  }
  var guardians = child.guardians;
  for (var guardName in guardians) {
    var rollValue = dice.roll(1);
    var watchValue = guardians[guardName];
    //console.log(guardName+' rollValue '+rollValue+ ' watchValue '+watchValue)
    if (rollValue > watchValue) {
      response +=
        '\n\tFortunately, ' +
        guardName +
        '[' +
        rollValue +
        '] chases off the beast.';
      return response;
    } else {
      response +=
        '\n\tThe ' +
        predator +
        ' slips past ' +
        guardName +
        '[' +
        rollValue +
        ']';
    }
  }
  response += '\n\tThe poor child is devoured!';
  killlib.kill(leastGuardedName, predator + ' attack', gameState);
  return response;
};

function predatorIcon(predator) {
  const normalized = String(predator || '').toLowerCase();
  if (normalized.includes('hyena')) {
    return '🐕';
  }
  if (normalized.includes('leopard')) {
    return '🐆';
  }
  if (normalized.includes('bear')) {
    return '🐻';
  }
  if (normalized.includes('alligator')) {
    return '🐊';
  }
  if (normalized.includes('wolf')) {
    return '🐺';
  }
  if (normalized.includes('vulture')) {
    return '🦅';
  }
  return '🐾';
}
