const dice = require('./dice.js');
const pop = require('./population.js');
const childLib = require('./children.js');
const text = require('./textprocess.js');
const reproLib = require('./reproduction.js');
const killlib = require('./kill.js');

// unused is deprecated
function feed(unused, player, amount, inputChildList, gameState) {
  children = gameState.children;
  let message = player['name'] + ' goes to feed the children.  \n';
  const specialNotes = [];
  let feedDetails = '';
  var showErrors = true;
  if (amount == 0 || amount > 2) {
    text.addMessage(
      gameState,
      'tribe',
      player.name + ' fails to overfeed the children.'
    );
    return;
  }

  feedAtLeastOneChild = false;
  for (cName of inputChildList) {
    childName = text.capitalizeFirstLetter(cName);
    amount = Number(amount);
    if (!children[childName]) {
      if (cName.toLowerCase() == '!all') {
        showErrors = false;
        const allHungryNote = player.name + ' feeds all the hungry children.';
        if (!specialNotes.includes(allHungryNote)) {
          specialNotes.push(allHungryNote);
        }
        for (var childName in children) {
          var child = children[childName];
          if (
            !('newAdult' in child && child.newAdult == true) ||
            child.food >= 2
          ) {
            inputChildList.push(childName);
            console.log('adding to inputChildList:' + childName);
          }
        }
        continue;
      }
      // this seems to be feeding based on mother?
      var parent = pop.memberByName(cName, gameState);
      if (parent && parent.gender && parent.gender == 'female') {
        const parentNote =
          player.name + ' feeds all the children of ' + parent.name + '.';
        if (!specialNotes.includes(parentNote)) {
          specialNotes.push(parentNote);
        }
        for (var filterChildName in children) {
          var filterChild = children[filterChildName];
          if (filterChild.mother == parent.name) {
            if (
              !(filterChild.newAdult && filterChild.newAdult == true) ||
              filterChild.food < 2
            ) {
              inputChildList.push(filterChildName);
            }
          }
        }
        continue;
      }
      console.log('Feed did not find child ' + childName);
      text.addMessage(gameState, player.name, 'no such child as ' + childName);
      continue;
    }
    child = children[childName];
    if (Number(child.food) >= 2) {
      if (showErrors) {
        text.addMessage(
          gameState,
          player.name,
          childName + ' has enough food already.  '
        );
      }
      continue;
    }
    if (child.food + amount > 2) {
      if (showErrors) {
        text.addMessage(
          gameState,
          player.name,
          childName + ' can not need to eat that much.  '
        );
      }
    }
    if (child.newAdult && child.newAdult == true) {
      if (showErrors) {
        text.addMessage(
          gameState,
          player.name,
          childName + ' is all grown up and does not need food from you.  '
        );
      }
      continue;
    }
    var amountForThisChild =
      child.food + amount > 2 ? amount - child.food : amount;

    if (player['food'] + player['grain'] >= amountForThisChild) {
      if (player['food'] >= amountForThisChild) {
        player.food -= Number(amountForThisChild);
        feedAtLeastOneChild = true;
      } else {
        var foodExpended = player.food;
        player.food = 0;
        player['grain'] -= amountForThisChild - foodExpended;
        feedAtLeastOneChild = true;
      }
      feedDetails +=
        player.name +
        ' feeds ' +
        amountForThisChild +
        ' to ' +
        childName +
        '.  ';
      children[childName].food += Number(amountForThisChild);
      if (children[childName].food != 2) {
        feedDetails += childName + ' could eat more.  ';
      }
      feedDetails += '\n';
    } else {
      text.addMessage(
        gameState,
        player.name,
        'You do not have enough food or grain to feed ' + childName
      );
      break;
    }
  }
  if (!feedAtLeastOneChild) {
    feedDetails += 'No children were fed.';
  }
  if (specialNotes.length > 0) {
    message += specialNotes.join('\n') + '\n';
  }
  message += feedDetails;
  text.addMessage(gameState, 'tribe', message);
  return 0;
}
module.exports.feed = feed;

// Side effect: if everyone has enough food, and it is foodRound, start reproduction round.
function checkFood(gameState, bot) {
  var message = '';
  hungryAdults = [];
  happyAdults = [];
  worriedAdults = [];
  hungryChildren = [];
  satedChildren = [];
  children = gameState.children;
  population = gameState.population;
  for (var targetName in population) {
    person = pop.memberByName(targetName, gameState);
    hunger = 4;
    if (
      person.gender == 'female' &&
      childLib.countChildrenOfParentUnderAge(children, targetName, 4) > 1
    ) {
      message +=
        person.name +
        ' needs 6 food due to having more than one child under 2\n';
      hunger = 6;
    }
    if (person.food >= hunger) {
      happyAdults.push(targetName);
    } else if (person.food + person.grain >= hunger) {
      worriedAdults.push(targetName);
    } else {
      hungryAdults.push(targetName);
    }
  }
  for (var childName in children) {
    var child = children[childName];
    if (child.newAdult && child.newAdult == true) {
      continue;
    }
    if (child.food >= 2) {
      satedChildren.push(childName);
    } else {
      hungryChildren.push(childName);
    }
  }
  message += 'Happy Adults: ' + happyAdults.join(', ');
  message += '\nHappy Children: ' + satedChildren.join(', ');
  message += '\nWorried adults: ' + worriedAdults.join(', ');
  message += '\nHungry adults: ' + hungryAdults.join(', ');
  message += '\nHungry children: ' + hungryChildren.join(', ');
  if (
    !worriedAdults.length &&
    !hungryAdults.length &&
    !hungryChildren.length &&
    gameState.foodRound
  ) {
    gameState.enoughFood = true;
    text.addMessage(
      gameState,
      'tribe',
      'Everyone has enough food, starting reproduction automatically.'
    );
    reproLib.startReproduction(gameState);
  }
  return message;
}
module.exports.checkFood = checkFood;

function consumeFoodChildren(gameState) {
  response = '';
  perishedChildren = [];
  population = gameState.population;
  children = gameState.children;

  console.log('children are eating');
  for (childName in children) {
    var child = children[childName];
    motherMember = pop.memberByName(child.mother, gameState);
    if (child.dead) {
      continue;
    }
    console.log(childName + ' object ' + child);
    child.age += 1;
    if (child.age < 24) {
      child.food -= 2;
      if (child.food < 0) {
        if (!gameState._suppressImmediateDeathMessages) {
          response += ' child:' + childName + ' has starved to death.\n';
        }
        child.dead = true;
        if (motherMember && motherMember.isPregnant) {
          delete motherMember.isPregnant;
        }
        perishedChildren.push(childName);
        continue;
      }
      if (child.age == 0) {
        birthRoll = dice.roll(3);
        birth(gameState, childName, child, motherMember, birthRoll);
      }
      // Sometimes we get bugs where pregnancy doesn't clear; this will fix it eventually
      if (child.age >= 0) {
        if (
          motherMember &&
          'isPregnant' in motherMember &&
          motherMember.isPregnant == childName
        ) {
          delete motherMember.isPregnant;
          console.log('Deleting extended pregnancy for ' + motherMember.name);
        }
      }
      if (4 > child.age && child.age >= 0 && motherMember) {
        if (!motherMember.nursing) {
          motherMember.nursing = [];
        }
        if (motherMember.nursing.indexOf(childName) == -1) {
          motherMember.nursing.push(childName);
        }
      }
      if (
        child.age >= 4 && // 2 years in SEASONS
        motherMember &&
        motherMember.nursing &&
        motherMember.nursing.indexOf(childName) > -1
      ) {
        childIndex = motherMember.nursing.indexOf(childName);
        motherMember.nursing.splice(childIndex, 1);
        response += childName + ' is weaned.\n';
        if (motherMember.nursing && motherMember.nursing.length == 0) {
          delete motherMember.nursing;
        }
      }
    }
    if (child.age >= 24 && !child.newAdult) {
      child.newAdult = true;
      response += '>> ' + childName + ' has reached adulthood!\n';
      // clear all guardians
      for (var name in population) {
        player = pop.memberByName(name, gameState);
        if (player.guarding && player.guarding.includes(childName)) {
          const index = player.guarding.indexOf(childName);
          if (index > -1) {
            player.guarding.splice(index, 1);
            response += name + ' stops watching the new adult.\n';
          }
        }
      }
      for (var sitterName in children) {
        sitter = children[sitterName];
        if (sitter.babysitting && sitter.babysitting == childName) {
          delete sitter.babysitting;
          response += sitterName + ' stops watching the new adult.\n';
        }
      }
      delete child.guardians;
    }
  }
  // clean up the dead
  perishedCount = perishedChildren.length;
  for (var i = 0; i < perishedCount; i++) {
    corpse = perishedChildren[i];
    killlib.kill(perishedChildren[i], 'starvation', gameState);
    console.log('removing child corpse ' + corpse);
  }
  if (perishedChildren.length == 0 && !gameState._suppressImmediateDeathMessages) {
    response += 'No children starved!';
  }
  return response;
}
module.exports.consumeFoodChildren = consumeFoodChildren;

function birth(gameState, childName, child, motherMember, birthRoll) {
  // Backward compatibility: birth(gameState, child, motherMember, birthRoll)
  if (typeof childName === 'object' && childName !== null) {
    birthRoll = motherMember;
    motherMember = child;
    child = childName;
    childName = motherMember && motherMember.isPregnant ? motherMember.isPregnant : '';
  }
  response +=
    '\t' +
    motherMember.name +
    ' gives birth to a ' +
    child.gender +
    '-child, ' +
    childName;
  pop.history(
    motherMember.name,
    motherMember.name +
      ' gives birth to a ' +
      child.gender +
      '-child, ' +
      childName,
    gameState
  );
  if (birthRoll < 5) {
    response += ' but the child did not survive\n';
    child.dead = true;
    killlib.kill(childName, 'birth complications', gameState);
    console.log('removing stillborn ' + childName);
    return;
  } else {
    response += '\n';
  }
  delete motherMember.isPregnant;
  //Mothers start guarding their newborns
  motherGuard(motherMember, childName);
  if (birthRoll == 17) {
    twin = reproLib.addChild(child.mother, child.father, gameState);
    const twinName = motherMember.isPregnant;
    delete motherMember.isPregnant; // this gets set by addChild, but the child was just born.
    response +=
      motherMember.name +
      ' gives birth to a twin! Meet ' +
      twinName +
      ', a healthy young ' +
      twin.gender +
      '-child.\n';
    pop.history(
      motherMember.name,
      motherMember.name +
        ' gives birth to a twin! Meet ' +
        twinName +
        ', a healthy young ' +
        twin.gender +
        '-child',
      gameState
    );
    motherGuard(motherMember, twinName);
    twin.age = 0;
  }
}
module.exports.birth = birth;

function motherGuard(motherMember, childName) {
  if (!motherMember.guarding) {
    motherMember.guarding = [childName];
  } else {
    if (
      motherMember.guarding.indexOf(childName) == -1 &&
      motherMember.guarding.length < 5
    ) {
      motherMember.guarding.push(childName);
    } else {
      response +=
        '\t' +
        motherMember.name +
        ' is guarding too many children, and ' +
        childName +
        ' is unwatched.\n';
    }
  }
}
module.exports.motherGuard = motherGuard;

function consumeFood(gameState) {
  if (!gameState) {
    console.log('no game state; ERROR');
    return;
  }
  console.log('adults are eating');
  gameState._foodRoundDeathEvents = [];
  gameState._suppressImmediateDeathMessages = true;
  response = 'Food round results:\n';
  //console.log('food response is '+response)
  response += consumeFoodPlayers(gameState);
  //console.log('food response is '+response)
  response += consumeFoodChildren(gameState);
  response += summarizeFoodRoundDeaths(gameState);
  //console.log('food response is '+response)
  delete gameState._suppressImmediateDeathMessages;
  delete gameState._foodRoundDeathEvents;
  return response;
}
module.exports.consumeFood = consumeFood;

function summarizeFoodRoundDeaths(gameState) {
  var events = (gameState && gameState._foodRoundDeathEvents) || [];
  if (!events.length) {
    return '  No adults starved.\nNo children starved.\n';
  }

  var adultsStarved = [];
  var childrenStarved = [];
  var childrenNoMilk = [];
  var otherDeaths = [];

  for (var i = 0; i < events.length; i++) {
    var evt = events[i];
    if (!evt || !evt.name) {
      continue;
    }
    if (!evt.isChild && evt.cause === 'starvation') {
      adultsStarved.push(evt.name);
      continue;
    }
    if (evt.isChild && evt.cause === 'starvation') {
      childrenStarved.push(evt.name);
      continue;
    }
    if (evt.isChild && evt.cause === 'no-milk') {
      childrenNoMilk.push(evt.name);
      continue;
    }
    otherDeaths.push(evt.name + ' (' + evt.cause + ')');
  }

  var summary = '';
  if (adultsStarved.length) {
    summary += '  Adults starved: ' + adultsStarved.join(', ') + '.\n';
  } else {
    summary += '  No adults starved.\n';
  }

  if (childrenStarved.length) {
    summary += '  Children starved: ' + childrenStarved.join(', ') + '.\n';
  } else if (childrenNoMilk.length) {
    summary += '  No children starved from hunger.\n';
  } else {
    summary += 'No children starved.\n';
  }

  if (childrenNoMilk.length) {
    summary +=
      '  Children died from no-milk: ' + childrenNoMilk.join(', ') + '.\n';
  }

  if (otherDeaths.length) {
    summary += '  Other deaths: ' + otherDeaths.join(', ') + '.\n';
  }

  return summary;
}

function consumeFoodPlayers(gameState) {
  perished = [];
  population = gameState.population;
  children = gameState.children;
  var response = '';
  for (var target in population) {
    var hunger = 4;
    const person = pop.memberByName(target, gameState);
    console.log(target + ' f:' + person.food + ' g:' + person.grain);
    person.food = person.food - hunger;
    if (person.food < 0) {
      // food is negative, so just add it to grain here
      person.grain = person.grain + person.food;
      person.food = 0;
      if (person.grain < 0) {
        if (!gameState._suppressImmediateDeathMessages) {
          response += '  ' + person.name + ' has starved to death.\n';
        }
        person.grain = 0;
        perished.push(target);
      }
    }
    if (
      person.gender == 'female' &&
      childLib.countChildrenOfParentUnderAge(children, target, 4) > 1
    ) {
      // extra food issues here; mom needs 2 more food, or the child will die.
      const mom = person;
      console.log(
        mom.name + ' eats extra food due to multiple children under 2.  '
      );
      response +=
        mom.name + ' eats extra food due to multiple children under 2.  ';
      mom.food -= 2;
      if (mom.food < 0) {
        // food is negative, so just add it to grain here
        mom.grain = mom.grain + mom.food;
        mom.food = 0;
        if (mom.grain < 0) {
          const childName = mom.isPregnant;
          response +=
            target + ' lost her child ' + childName + ' due to lack of food\n';
          killlib.kill(childName, 'prenatal starvation', gameState);
          delete mom.isPregnant;
          mom.grain = 0;
        }
      }
    }
    console.log(
      target + ' ' + person.name + ' f:' + person.food + ' g:' + person.grain
    );
  }
  var perishedCount = perished.length;
  for (var i = 0; i < perishedCount; i++) {
    corpse = perished[i];
    console.log('removing corpse ' + corpse);
    killlib.kill(perished[i], 'starvation', gameState);
  }
  if (perished.length == 0 && !gameState._suppressImmediateDeathMessages) {
    response += 'No adults starved! \n';
  }
  return response;
}
module.exports.consumeFoodPlayers = consumeFoodPlayers;
