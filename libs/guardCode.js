const locations = require('./locations.json');
const dice = require('./dice.js');
const killlib = require('./kill.js');

// Age is in seasons; years shown as age/2.
// Adulthood / newAdult at age 24 (12 years).
//
// Guard/ignore is chosen in the *work* round. Children age +1 in *food*,
// then predators threaten in *reproduction*. So:
//   - Assignable at work: years -0.5..11.5 → seasons -1..23 (unborn through 11.5)
//   - Threat / scores after aging: born children still under 24 seasons (0..23)
//   - Drop from guard lists at adulthood (age >= 24)

const GUARD_ASSIGN_MIN_AGE = -1; // -0.5 years (unborn, ages to 0 in food)
const GUARD_ASSIGN_MAX_AGE = 23; // 11.5 years inclusive
const GUARD_THREAT_MIN_AGE = 0;
const GUARD_THREAT_MAX_EXCLUSIVE = 24; // age 24 = adult

function hasNumericAge(child) {
  return !!(child && typeof child.age === 'number' && Number.isFinite(child.age));
}

/** Work-round selection: years -0.5 to 11.5 (seasons -1..23). */
function isChildGuardAssignable(child) {
  return (
    hasNumericAge(child) &&
    child.age >= GUARD_ASSIGN_MIN_AGE &&
    child.age <= GUARD_ASSIGN_MAX_AGE
  );
}
module.exports.isChildGuardAssignable = isChildGuardAssignable;

/**
 * Reproduction-time protection (after food aging): born, not yet adult.
 * Seasons 0..23 (years 0..11.5).
 */
function isChildGuardThreatEligible(child) {
  return (
    hasNumericAge(child) &&
    child.age >= GUARD_THREAT_MIN_AGE &&
    child.age < GUARD_THREAT_MAX_EXCLUSIVE
  );
}
module.exports.isChildGuardThreatEligible = isChildGuardThreatEligible;

/**
 * May remain on an adult's guarding list (not yet adult, includes unborn).
 * Seasons -1..23.
 */
function isChildGuardListMember(child) {
  return isChildGuardAssignable(child);
}
module.exports.isChildGuardListMember = isChildGuardListMember;

/** @deprecated Use isChildGuardThreatEligible or isChildGuardAssignable */
function isChildGuardEligible(child) {
  return isChildGuardThreatEligible(child);
}
module.exports.isChildGuardEligible = isChildGuardEligible;

function getEligibleGuardTargets(person, children) {
  if (!person || !Array.isArray(person.guarding)) {
    return [];
  }

  var eligibleTargets = [];
  for (var i = 0; i < person.guarding.length; i++) {
    var childName = person.guarding[i];
    var child = children ? children[childName] : null;
    // Keep anyone still assignable/list-eligible (includes unborn through 11.5y).
    if (
      isChildGuardListMember(child) &&
      eligibleTargets.indexOf(childName) === -1
    ) {
      eligibleTargets.push(childName);
    }
  }
  return eligibleTargets;
}
module.exports.getEligibleGuardTargets = getEligibleGuardTargets;

/**
 * Drop adults/missing kids from every adult's guarding list. Mutates population.
 */
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

  if (children) {
    for (var childName in children) {
      var child = children[childName];
      if (child && !isChildGuardThreatEligible(child) && child.guardians) {
        delete child.guardians;
      }
    }
  }
};

/**
 * Remove a child from every adult's guarding list and tidy empty arrays.
 */
module.exports.releaseChildFromAllGuards = (childName, population) => {
  if (!childName || !population) {
    return;
  }
  for (var personName in population) {
    var person = population[personName];
    if (!person || !Array.isArray(person.guarding)) {
      continue;
    }
    var index = person.guarding.indexOf(childName);
    if (index > -1) {
      person.guarding.splice(index, 1);
    }
    if (person.guarding.length === 0) {
      delete person.guarding;
    }
  }
};

module.exports.findGuardValueForChild = (childName, population, children) => {
  var guardValue = Number(0);
  var child = children[childName];

  module.exports.normalizeGuardAssignments(population, children);

  if (!child || !isChildGuardThreatEligible(child)) {
    if (child) {
      child.guardians = {};
    }
    return 0;
  }

  child.guardians = {};
  for (var personName in population) {
    var person = population[personName];
    var guardTargets = getEligibleGuardTargets(person, children);
    // Only count toward score if this child is currently threat-eligible;
    // unborn on a list don't dilute scores for born kids until after birth.
    var scoreTargets = guardTargets.filter(function (name) {
      return isChildGuardThreatEligible(children[name]);
    });
    if (scoreTargets.includes(childName) && scoreTargets.length > 0) {
      var watchValue = 1 / scoreTargets.length;
      guardValue = guardValue + watchValue;
      child.guardians[person.name] = scoreTargets.length;
    }
  }
  // Near-adults / new adults can babysit (age >= 23 seasons).
  for (var name in children) {
    var babysitter = children[name];
    if (babysitter.age >= 23 && babysitter.babysitting == childName) {
      guardValue = guardValue + 1;
      child.guardians[name] = 1;
    }
  }
  return Math.round(100 * guardValue) / 100;
};

function findLeastGuarded(children, population) {
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
    // Predators only hit born, non-adult children (after food aging).
    if (!isChildGuardThreatEligible(child)) {
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
      break;
    }
  }
  var leastGuardedName;
  if (leastGuarded.length == 1) {
    leastGuardedName = leastGuarded[0].name;
  } else {
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
  module.exports.releaseChildFromAllGuards(childName, population);
};

module.exports.hyenaAttack = (children, gameState) => {
  var population = gameState.population;
  var currentLocation = gameState['currentLocationName'];
  var predator = locations[currentLocation]['predator'] || 'vulture';
  if (!children || Object.keys(children).length == 0) {
    return 'No children, no predator problem ';
  }
  var leastGuardedMessageArray = findLeastGuarded(children, population).split(
    ' '
  );
  var leastGuardedName = leastGuardedMessageArray[0];
  if (leastGuardedName === 'No') {
    return 'All the children are safely unborn, so predators are not a worry.';
  }
  const predatorEmoji = predatorIcon(predator);
  var response =
    predatorEmoji + ' A ' + predator + ' attacks ' + leastGuardedName;
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

module.exports.GUARD_ASSIGN_MIN_AGE = GUARD_ASSIGN_MIN_AGE;
module.exports.GUARD_ASSIGN_MAX_AGE = GUARD_ASSIGN_MAX_AGE;
module.exports.GUARD_THREAT_MAX_EXCLUSIVE = GUARD_THREAT_MAX_EXCLUSIVE;
