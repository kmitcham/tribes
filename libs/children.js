const guardlib = require('./guardCode.js');
const pop = require('./population.js');
const text = require('./textprocess.js');

function showChildrenPrep(
  gameState,
  displayName,
  onlyHungry,
  filterParentName
) {
  var children = gameState.children;
  var response = [];
  if (onlyHungry) {
    response.push('These children need food:');
    response.push(
      ...showChildren(children, gameState, 'hungry', gameState.secretMating)
    );
  } else if (filterParentName) {
    var parentPerson = pop.memberByName(filterParentName, gameState);
    if (!parentPerson) {
      text.addMessage(
        gameState,
        displayName,
        'Could not find ' + filterParentName
      );
    } else {
      if (parentPerson.gender == 'male') {
        response.push(
          'It is impossible to know who the father of a child is until the game ends.'
        );
      } else {
        response.push('The descendants of ' + filterParentName + ' are:');
        response.push(
          ...showChildren(
            children,
            gameState,
            filterParentName,
            gameState.secretMating
          )
        );
      }
    }
  } else {
    response.push(
      ...showChildren(children, gameState, '', gameState.secretMating)
    );
  }
  for (const part of response) {
    text.addMessage(gameState, displayName, part);
  }
  return;
}
module.exports.showChildrenPrep = showChildrenPrep;

// returns an array of strings instead of directly updated the messages
function showChildren(
  children,
  gameState,
  filterName = '',
  hideFathers = true
) {
  const population = gameState.population;
  const responseMessages = [];
  const childNames = Object.keys(children);
  var notPrintedNewAdultHeader = true;
  var notStartedMiddleChildren = true;
  var notStartedYoungChildren = true;
  var notStartedUnborn = true;
  var sortedChildrenNames = Object.keys(children);
  sortedChildrenNames.sort(function (a, b) {
    if (children[a].age == children[b].age) {
      if (a < b) {
        return 1;
      } else {
        return -1;
      }
    }
    return children[a].age - children[b].age;
  });
  for (const childName of sortedChildrenNames) {
    var child = children[childName];
    if (filterName) {
      if (filterName == child.mother) {
        // do nothing
      } else if (filterName == child.father && !hideFathers) {
        // also do nothing
      } else if (filterName == 'hungry') {
        if (child.food >= 2) {
          // skip this child, they are not hungry
          continue;
        } else {
          // do nothing
        }
      } else {
        // skip this child, since it does not match the parent filter
        continue;
      }
    }
    if (child.dead) {
      //response += '('+childName+' is dead)\n';
      // skip the dead
    } else {
      var childMessage = '';
      if (child.age < 0 && notStartedUnborn) {
        responseMessages.push('### -----> Unborn <----- ###');
        notStartedUnborn = false;
      } else if (0 <= child.age && child.age < 4 && notStartedYoungChildren) {
        responseMessages.push('### -----> Nursing Children <----- ###');
        notStartedYoungChildren = false;
      } else if (4 <= child.age && child.age < 24 && notStartedMiddleChildren) {
        responseMessages.push('### -----> Children <----- ###');
        notStartedMiddleChildren = false;
      } else if (child.age >= 24 && notPrintedNewAdultHeader) {
        responseMessages.push('### -----> New Adults <----- ###');
        notPrintedNewAdultHeader = false;
      }
      childMessage +=
        (childName + ': ' + child.gender).padEnd(30, ' ') +
        'age:' +
        child.age / 2;
      if (child.newAdult) {
        childMessage += 'Full grown!'.padStart(16, ' ');
      } else {
        if (child.food < 2) {
          childMessage += '  needs ' + (2 - child.food) + ' food';
        } else {
          childMessage += '  not hungry'.padStart(16, ' ');
        }
      }
      const motherMember = pop.memberByName(child.mother, gameState);
      const fatherMember = pop.memberByName(child.father, gameState);
      childMessage += ' mother:' + motherMember.name;
      if (!hideFathers) {
        childMessage += ' father:' + fatherMember.name;
      }
      if (child.age < 24) {
        var guardVal = guardlib.findGuardValueForChild(
          childName,
          population,
          children
        );
        childMessage += ' guard value:' + guardVal;
        if (child.guardians && Object.keys(child.guardians).length > 0) {
          childMessage +=
            ' guarded by:' + Object.keys(child.guardians).join(',');
        }
      }
      if (child.babysitting) {
        childMessage += ' watching:' + child.babysitting + ' ';
      }
      responseMessages.push(childMessage);
    }
  }
  responseMessages.push(
    'There are ' + childNames.length + ' children in total.'
  );
  return responseMessages;
}
module.exports.showChildren = showChildren;

function countChildrenOfParentUnderAge(children, parentName, age) {
  var count = 0;
  for (var childName in children) {
    var child = children[childName];
    if (child.mother == parentName || child.father == parentName) {
      if (child.age < age) {
        count++;
      }
    }
  }
  return count;
}
module.exports.countChildrenOfParentUnderAge = countChildrenOfParentUnderAge;
