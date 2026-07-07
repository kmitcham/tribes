'use strict';

const genders = ['male', 'female'];
const allNames = require('./names.json');
const text = require('./textprocess.js');
const dice = require('./dice.js');
const pop = require('./population.js');
const feed = require('./feed.js');
const end = require('./endgame.js');

function eligibleMates(name, population, debug = false) {
  const matcher = population[name];
  const cleanName = name;
  var potentialMatches = [];
  var response = '';
  if (!matcher) {
    return 'could not find ' + cleanName + ' in the tribe';
  }
  for (var matchName in population) {
    if (debug) {
      console.log('checking ' + matchName);
    }
    const potentialMatch = population[matchName];
    if (!potentialMatch) {
      console.log('no record for ' + matchName);
      continue;
    }
    if (potentialMatch.gender == matcher.gender) {
      if (debug) {
        console.log('gender fail ');
      }
      continue;
    }
    if (potentialMatch.isPregnant) {
      if (debug) {
        console.log('pregnant ');
      }
      continue;
    }
    if (potentialMatch.isSick && potentialMatch.isSick > 0) {
      if (debug) {
        console.log('sick ');
      }
    }
    if (potentialMatch.isInjured && potentialMatch.isInjured > 0) {
      if (debug) {
        console.log('injured ');
      }
    }
    if (debug) {
      console.log('possible match!');
    }
    potentialMatches.push(matchName);
  }
  if (debug) {
    console.log('matched =' + potentialMatches);
  }
  if (potentialMatches.length > 0) {
    response = potentialMatches.join(' ');
  } else {
    response = 'No eligible partners-' + name + ' should pass.';
  }
  if (debug) {
    console.log('response:' + response);
  }
  return response;
}
module.exports.eligibleMates = eligibleMates;

function matingObjections(inviter, target) {
  let response = '';
  if (inviter.name === target.name) {
    return 'You cannot invite or consent to yourself.\n';
  }
  if (target.isPregnant) {
    // maybe check the age of the child; -2 is bad, but -1 is on the market
    //response += target.name+" is pregnant.\n"
  }
  if (inviter.gender == target.gender) {
    response += inviter.name + ' is the same gender as ' + target.name + '.\n';
  }
  return response;
}
module.exports.matingObjections = matingObjections;

function showMatingLists(actorName, gameState) {
  let response = '';
  const actor = pop.memberByName(actorName, gameState);
  if (!actor) {
    return actorName + ' not found';
  }
  if (
    'inviteList' in actor &&
    actor.inviteList &&
    actor.inviteList.length > 0
  ) {
    response += 'Your inviteList is:' + actor.inviteList + '\n';
  } else {
    actor.inviteList = [];
    response += 'Your inviteList is empty\n';
  }
  //"consentDict": {
  //      "Kevin": "consent",
  //      "nopwd": "consent"
  //    },
  if (!('consentDict' in actor) || !actor.consentDict) {
    actor.consentDict = {};
  }

  let consents = [];
  let declines = [];
  for (const [name, responseType] of Object.entries(actor.consentDict)) {
    if (responseType === 'consent') consents.push(name);
    else if (responseType === 'decline') declines.push(name);
  }

  if (consents.length > 0 || declines.length > 0) {
    response += 'Your romantic responses:\n';
    if (consents.length > 0)
      response += '  Consent: ' + consents.join(', ') + '\n';
    if (declines.length > 0)
      response += '  Decline: ' + declines.join(', ') + '\n';
  } else {
    response += 'Your romantic responses: none\n';
  }

  return response;
}
module.exports.showMatingLists = showMatingLists;

function canStillInvite(gameState) {
  const population = gameState.population;
  var canInvite = [];
  for (var personName in population) {
    const person = population[personName];
    if (person.cannotInvite) {
      // do nothing
    } else {
      canInvite.push(personName);
    }
  }
  return canInvite.join(' ');
}
module.exports.canStillInvite = canStillInvite;

function canStillInviteCount(gameState) {
  const population = gameState.population;
  if (!hasBothLivingSexes(population)) {
    return 0;
  }
  var count = 0;
  for (var personName in population) {
    const person = population[personName];
    if (!person.cannotInvite) {
      count++;
    }
  }
  return count;
}
module.exports.canStillInviteCount = canStillInviteCount;

function hasBothLivingSexes(population) {
  const livingSexes = new Set();
  for (const personName in population) {
    const person = population[personName];
    if (person && person.gender) {
      livingSexes.add(person.gender);
      if (livingSexes.size > 1) {
        return true;
      }
    }
  }
  return false;
}

function handleReproductionList(actorName, arrayOfNames, listName, gameState) {
  console.log(
    'Building ' + listName + ' for ' + actorName + ' args ' + arrayOfNames
  );
  var actingMember = pop.memberByName(actorName, gameState);
  if (!arrayOfNames || arrayOfNames.length == 0) {
    delete actingMember[listName];
    // this may be dead code with the new discord API.
    console.log('DELETE in handle list actually called.  SURPRISE!');
    return 'Deleting your empty ' + listName;
  }
  const population = gameState.population;
  const errors = [];
  let list = [];
  let save = false;
  for (const rawTargetName of arrayOfNames) {
    console.log('arg: ' + rawTargetName);
    let localErrors = '';
    let targetName = text.removeSpecialChars(rawTargetName);
    targetName = targetName.trim();
    if (targetName.toLowerCase() == '!pass') {
      if (listName == 'inviteList') {
        if (arrayOfNames.indexOf(rawTargetName) != arrayOfNames.length - 1) {
          errors.push("Values after '!pass' must be removed.\n");
        }
        list.push(rawTargetName);
        break;
      } else {
        errors.push('!pass is only valid in the inviteList.');
      }
    } else if (targetName.toLowerCase() == '!none') {
      list = [];
      save = true;
      break;
    } else if (targetName.toLowerCase() == '!all') {
      if (listName == 'inviteList') {
        // get all the members of the tribe of the opposite gender as the actingMember
        for (var personName in population) {
          var person = population[personName];
          if (person.gender !== actingMember.gender) {
            list.push(personName);
          }
        }
        list.push('!pass');
      } else {
        errors.push('!all is only valid in the inviteList.');
      }
    } else {
      var targetMember = pop.memberByName(targetName, gameState);
      if (targetMember) {
        localErrors += matingObjections(actingMember, targetMember);
      } else {
        localErrors += rawTargetName + ' is not in the tribe.\n';
      }
      if (localErrors != '') {
        errors.push(localErrors);
      } else {
        list.push(targetMember.name.trim());
        console.log(
          '\t\t adding ' +
            targetMember.name +
            ' to consent for ' +
            actingMember.name
        );
      }
    }
  }
  let returnMessage = '';
  if (errors.length > 0) {
    console.log(actorName + ' ' + listName + ' has errors:' + errors);
    for (const error of errors) {
      returnMessage += error + '\n';
    }
    returnMessage += 'Please try again to set your ' + listName + '\n';
  } else {
    actingMember[listName] = list;
    returnMessage += 'Setting your ' + listName + ' list to:' + list + '\n';
    if (save) {
      if (gameState.reproductionRound) {
        returnMessage +=
          'Changing your list during the reproduction may cause secret informatio to leak.\n';
      } else {
        returnMessage +=
          'Saving your ' + listName + ' list be used in future rounds\n';
      }
    }
  }
  return returnMessage;
}
module.exports.handleReproductionList = handleReproductionList;

function invite(gameState, rawActorName, rawList) {
  console.log('invite raw actorName: ' + rawActorName);
  var player = pop.memberByName(rawActorName, gameState);
  var message = 'error in invite, message not set';
  if (!player) {
    text.addMessage(
      gameState,
      rawActorName,
      'You must be a member of the tribe to invite someone to mate.'
    );
    return;
  }
  if (!rawList) {
    if (player.inviteList) {
      text.addMessage(
        gameState,
        player.name,
        'Current invitelist: ' + player.inviteList.join(' ')
      );
      return;
    } else {
      text.addMessage(gameState, player.name, 'No current inviteList');
      return;
    }
  }
  var inviteNamesAsArray = pop
    .convertStringToArray(rawList)
    .map((value) =>
      typeof value === 'string' ? value.trim() : String(value || '').trim()
    )
    .filter((value) => value.length > 0);
  console.log(
    player.name +
      ' raw invitelist:' +
      rawList +
      ' as array:' +
      inviteNamesAsArray
  );
  if (gameState.reproductionRound == true && player.inviteIndex) {
    console.log(
      'Updateing inviteIndex for ' +
        player.name +
        ' since list updated during the round'
    );
    player.inviteIndex = 0;
  }

  message = handleReproductionList(
    player.name,
    inviteNamesAsArray,
    'inviteList',
    gameState
  );
  globalMatingCheck(gameState);
  console.log('message at end of reprolib invite:' + message);
  if (player.inviteList) {
    console.log('after update Invitelist: ' + player.inviteList.join(' '));
  }
  text.addMessage(gameState, player.name, message);
  gameState.saveRequired = true;
  return message;
}
module.exports.invite = invite;

function intersect(a, b) {
  var t;
  if (!a || !b) {
    return [];
  }
  if (b.length > a.length) (t = b), (b = a), (a = t); // indexOf to loop over shorter
  return a.filter(function (e) {
    return b.indexOf(e) > -1;
  });
}

function migrateToConsentDict(person) {
  if (!person) return null;
  if (!person.consentDict || typeof person.consentDict !== 'object') {
    person.consentDict = {};
  }
  return person.consentDict;
}

function getRomanceTargetsByResponse(person, responseType) {
  const consentDict = migrateToConsentDict(person);
  return Object.entries(consentDict)
    .filter(([, value]) => value === responseType)
    .map(([name]) => name);
}

function clearRomanceTargetsByResponse(person, responseType) {
  const consentDict = migrateToConsentDict(person);
  for (const [name, value] of Object.entries(consentDict)) {
    if (value === responseType) {
      delete consentDict[name];
    }
  }
}

function parseRomanceInput(rawList) {
  if (!rawList) {
    return [];
  }

  const rawString = String(rawList);
  const entries = rawString.includes(',')
    ? rawString.split(',')
    : rawString.split(' ');

  return entries
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function applyRomanceResponseUpdates(
  gameState,
  actorName,
  entries,
  defaultResponseType
) {
  const member = pop.memberByName(actorName, gameState);
  if (!member) {
    console.log(actorName + ' not found in tribe for ' + defaultResponseType);
    text.addMessage(gameState, actorName, 'You are not in the tribe');
    return [];
  }

  if (entries.includes('!none')) {
    clearRomanceTargetsByResponse(member, defaultResponseType);
    gameState.saveRequired = true;
    return [];
  }

  const hasExplicitStatuses = entries.some(
    (entry) => typeof entry === 'string' && entry.includes(':')
  );

  if (!hasExplicitStatuses) {
    clearRomanceTargetsByResponse(member, defaultResponseType);
  }

  for (const entry of entries) {
    if (!entry) {
      continue;
    }

    if (entry.includes(':')) {
      const parts = entry.split(':');
      handleRomanceResponse(
        gameState,
        actorName,
        parts[0].trim(),
        parts[1].trim().toLowerCase()
      );
    } else {
      handleRomanceResponse(gameState, actorName, entry, defaultResponseType);
    }
  }

  gameState.saveRequired = true;
  return getRomanceTargetsByResponse(member, defaultResponseType);
}

function consentPrep(gameState, sourceName, rawList) {
  var member = pop.memberByName(sourceName, gameState);

  if (!rawList) {
    console.log('no rawList for consent');
    const currentConsentTargets = getRomanceTargetsByResponse(
      member,
      'consent'
    );
    if (currentConsentTargets.length > 0) {
      text.addMessage(
        gameState,
        sourceName,
        'Current consentList: ' + currentConsentTargets.join(' ')
      );
      return 'Current consentList: ' + currentConsentTargets.join(' ');
    } else {
      text.addMessage(gameState, sourceName, 'No current consentList.');
      return 'No current consentList.';
    }
  }
  const messageArray = parseRomanceInput(rawList);
  if (messageArray.length < 1) {
    text.addMessage(
      gameState,
      sourceName,
      'No values parsed from that consentList: ' + rawList
    );
    return 'No values parsed from that consentList: ' + rawList;
  }
  console.log('updating consentlist: ' + messageArray);
  consent(sourceName, messageArray, gameState);
  return getRomanceTargetsByResponse(member, 'consent');
}
module.exports.consentPrep = consentPrep;

function consent(actorName, arrayOfNames, gameState) {
  var member = pop.memberByName(actorName, gameState);
  if (!member) {
    console.log(actorName + ' not found in tribe for consent');
    text.addMessage(gameState, actorName, 'You are not in the tribe');
    return;
  }
  const priorConsentList = getRomanceTargetsByResponse(member, 'consent');
  const priorDeclineList = getRomanceTargetsByResponse(member, 'decline');
  var intersectList = intersect(priorConsentList, priorDeclineList);
  if (intersectList && intersectList.length > 0) {
    text.addMessage(
      gameState,
      actorName,
      'Your consent and decline lists have overlaps.  Decline has priority.'
    );
  }
  const updatedConsentTargets = applyRomanceResponseUpdates(
    gameState,
    actorName,
    arrayOfNames,
    'consent'
  );
  if (updatedConsentTargets.length > 0) {
    text.addMessage(
      gameState,
      actorName,
      'Updated consentlist to ' + updatedConsentTargets
    );
  } else {
    text.addMessage(
      gameState,
      actorName,
      'You will not consent to mating with anyone.'
    );
  }
  return globalMatingCheck(gameState);
}
module.exports.consent = consent;

function declinePrep(interaction, gameState) {
  var sourceName = interaction.member.displayName;
  var rawList = interaction.options.getString('declinelist');

  var player = pop.memberByName(sourceName, gameState);
  if (!rawList) {
    const currentDeclineTargets = getRomanceTargetsByResponse(player, 'decline');
    if (currentDeclineTargets.length > 0) {
      text.addMessage(
        gameState,
        sourceName,
        'Current declinelist: ' + currentDeclineTargets.join(' ')
      );
      return 'Current declinelist: ' + currentDeclineTargets.join(' ');
    } else {
      text.addMessage(gameState, sourceName, 'No current declinelist');
      return 'No current declinelist';
    }
  }
  const listAsArray = parseRomanceInput(rawList);
  console.log('applying decline list to mating for ' + sourceName);
  const response = decline(sourceName, listAsArray, gameState);
  console.log('decline response:' + response);
  return;
}
module.exports.declinePrep = declinePrep;

function decline(actorName, messageArray, gameState) {
  const person = pop.memberByName(actorName, gameState);
  const updatedDeclineTargets = applyRomanceResponseUpdates(
    gameState,
    actorName,
    messageArray,
    'decline'
  );
  const consentTargets = getRomanceTargetsByResponse(person, 'consent');
  const intersectList = intersect(consentTargets, updatedDeclineTargets);
  if (intersectList && intersectList.length > 0) {
    text.addMessage(
      gameState,
      actorName,
      'Your consent and decline lists have overlaps.  Decline has priority.'
    );
  }
  if (updatedDeclineTargets.length > 0) {
    text.addMessage(gameState, actorName, 'Updated your decline responses.');
  } else {
    text.addMessage(gameState, actorName, 'Emptying your declineList');
  }
  return globalMatingCheck(gameState);
}
module.exports.decline = decline;

function clearReproduction(gameState) {
  const population = gameState.population;
  for (var personName in population) {
    const person = population[personName];
    delete person.cannotInvite;
    person.inviteIndex = 0;
  }
}
module.exports.clearReproduction = clearReproduction;

function _sortCommitFirst(a, b) {
  if (a.commit && !b.commit) {
    return 1;
  }
  if (b.commit && !a.commit) {
    return -1;
  }
  return Math.random() - 0.5;
}

function globalMatingCheck(gameState) {
  console.log('In the global mating check');
  var infinite_loop_count = 0;
  if (!gameState.reproductionRound) {
    return 'It is not the mating round';
  }
  const population = gameState.population;
  const canStillMate = hasBothLivingSexes(population);
  var inviteCheck = canStillMate ? canStillInvite(gameState) : '';
  var allDone = true;
  var actionableInvites = canStillMate && inviteCheck.length > 0;
  var doneMating = canStillMate ? [] : Object.keys(population);
  var whoNeedsToGiveAnAnswer = [];
  while (actionableInvites) {
    infinite_loop_count += 1;
    if (infinite_loop_count > 10) {
      console.log(
        '----------------------------infinite loop count error: ' +
          infinite_loop_count
      );
      console.log('gameState:\n' + gameState);
      return 'Infinite loop error.  oops.';
    }
    actionableInvites = false;
    var randomOrderForProcessingInvites = Object.keys(population);
    randomOrderForProcessingInvites.sort(function () {
      return Math.random() - 0.5;
    });
    doneMating = [];
    whoNeedsToGiveAnAnswer = [];
    console.log('a sexlist ' + randomOrderForProcessingInvites);
    for (const invitingMemberKey of randomOrderForProcessingInvites) {
      const invitingMember = pop.memberByName(invitingMemberKey, gameState);
      const inviterDisplayName = invitingMember.name;
      console.log(
        'working ' + invitingMemberKey + ' named ' + invitingMember.name
      );
      let index = randomOrderForProcessingInvites.indexOf(invitingMemberKey);
      if (hasReasontoNotInvite(gameState, invitingMember)) {
        doneMating.push(invitingMemberKey);
        continue;
      } else if (
        invitingMember.inviteList &&
        invitingMember.inviteList.length > 0 &&
        !invitingMember.cannotInvite
      ) {
        // the person is eligible to mate, and has an invitelist
        index = 0;
        if ('inviteIndex' in invitingMember && invitingMember.inviteIndex) {
          index = invitingMember.inviteIndex;
        }
        if (index + 1 > invitingMember.inviteList.length) {
          console.log(
            '\t inviteIndex is longer than invite list. index:' +
              index +
              ' list:' +
              invitingMember.inviteList.join()
          );
        }
        let targetName = invitingMember.inviteList[index];
        console.log(' inviting ' + targetName + ' index ' + index);
        if (!targetName) {
          console.log(
            'member ' +
              invitingMember.name +
              ' had a false value for target ' +
              index +
              ' in inviteList:' +
              targetName
          );
          text.addMessage(
            gameState,
            'tribe',
            inviterDisplayName +
              ' has a troublesome problem flirting, and will not mate this round.'
          );
          doneMating.push(invitingMemberKey);
          continue;
        }
        if (targetName.trim() == '!pass') {
          invitingMember.cannotInvite = true;
          //text.addMessage(gameState, "tribe", inviterDisplayName+" is done mating this round.");
          doneMating.push(invitingMemberKey);
          continue;
        }
        if (targetName.trim() == '!save') {
          // this is legacy code since it used to be a valid option
          console.log(' skipping save for ' + inviterDisplayName);
          continue;
        }
        var attemptFailed = false;
        const targetMember = pop.memberByName(targetName, gameState);
        if (!targetMember) {
          console.log(
            'Could not find ' +
              targetName +
              ' in tribe for ' +
              invitingMember.name +
              ' to invite them.'
          );
          continue;
        }
        const targetDisplayName = targetMember.name;
        const targetPopulationKey =
          pop.getPopulationKey(targetMember, gameState) || targetName;
        migrateToConsentDict(invitingMember);
        migrateToConsentDict(targetMember);

        let targetResponse;
        if (targetMember.consentDict) {
          if (targetMember.consentDict[invitingMemberKey]) {
            targetResponse = targetMember.consentDict[invitingMemberKey];
          } else if (targetMember.consentDict[invitingMember.name]) {
            targetResponse = targetMember.consentDict[invitingMember.name];
          } else if (targetMember.consentDict['!all']) {
            targetResponse = targetMember.consentDict['!all'];
          }
        }

        if (targetResponse === 'decline') {
          text.addMessage(
            gameState,
            invitingMemberKey,
            targetDisplayName + ' declines your invitation.'
          );
          text.addMessage(
            gameState,
            targetPopulationKey,
            inviterDisplayName + ' flirts with you, but you decline.'
          );
          console.log('\t declines  ');
          attemptFailed = true;
        } else if (targetMember.isPregnant) {
          text.addMessage(
            gameState,
            invitingMemberKey,
            targetDisplayName + ' is visibly pregnant.'
          );
          text.addMessage(
            gameState,
            targetPopulationKey,
            inviterDisplayName + ' flirts with you, but you are pregnant.'
          );
          console.log('\t is pregnant  ');
          attemptFailed = true;
        } else if (targetMember.isSick || targetMember.isInjured) {
          text.addMessage(
            gameState,
            targetPopulationKey,
            inviterDisplayName +
              ' flirts with you, but you are not healthy enough to respond.'
          );
          text.addMessage(
            gameState,
            invitingMemberKey,
            targetDisplayName +
              ' is not healthy enough to enjoy your attention.'
          );
          console.log('\t sick or injured');
          attemptFailed = true;
        } else if (targetResponse === 'consent') {
          text.addMessage(
            gameState,
            invitingMemberKey,
            targetDisplayName + ' is impressed by your flirtation.'
          );
          text.addMessage(
            gameState,
            targetPopulationKey,
            inviterDisplayName + ' flirts with you, and you are interested.'
          );
          makeLove(targetName, inviterDisplayName, gameState);
          invitingMember.cannotInvite = true;
          doneMating.push(invitingMemberKey);
          console.log('\t consents ');
          continue;
        } else {
          // this will get spammy, if the function is called every time anyone updates.
          text.addMessage(
            gameState,
            targetPopulationKey,
            inviterDisplayName +
              ' has invited you to mate- update your romance lists to include them (consent or decline) '
          );
          text.addMessage(
            gameState,
            invitingMemberKey,
            targetDisplayName + ' considers your invitation.'
          );
          whoNeedsToGiveAnAnswer.push(targetPopulationKey);
          doneMating.push(invitingMemberKey);
          console.log(
            '\t no response found with ' +
              targetDisplayName +
              ' so allDone is false'
          );
        }
        if (attemptFailed) {
          if ('inviteIndex' in invitingMember) {
            invitingMember.inviteIndex = invitingMember.inviteIndex + 1;
          } else {
            invitingMember.inviteIndex = 1;
          }
          // can't lose your invite power just because of rejection
          if (invitingMember.inviteList.length > invitingMember.inviteIndex) {
            actionableInvites = true;
            console.log('\t more invitations exist');
          } else {
            console.log(
              'allDone is false, since no invites to try, and no resolution.'
            );
          }
        }
      } else {
        // person has no invites pending
        console.log(
          '\t No invites found for ' +
            invitingMemberKey.name +
            ' so allDone is false'
        );
      }
    }
  }
  if (whoNeedsToGiveAnAnswer && whoNeedsToGiveAnAnswer.length > 0) {
    for (var personName of whoNeedsToGiveAnAnswer) {
      text.addMessage(
        gameState,
        personName,
        'You have not responded to an invitation'
      );
    }
  }
  inviteCheck = canStillMate ? canStillInvite(gameState) : '';
  const inviteCount = canStillMate ? canStillInviteCount(gameState) : 0;
  console.log('After mating checks, inviteCheck is: ' + inviteCheck);
  if (inviteCount > 0) {
    text.addMessage(
      gameState,
      'tribe',
      '(awaiting invitations or pass from ' +
        inviteCount +
        ' player' +
        (inviteCount === 1 ? '' : 's') +
        ')'
    );
    allDone = false;
  } else {
    allDone = true;
  }
  if (allDone) {
    text.addMessage(
      gameState,
      'tribe',
      '---> Reproductive activites are complete for the season <---'
    );
    let noPregnancies = true;
    for (const personName in population) {
      const invitingMember = pop.memberByName(personName, gameState);
      text.addMessage(
        gameState,
        personName,
        'Reproduction round activities are over.'
      );
      if (invitingMember.hiddenPregnant) {
        const fatherName = invitingMember.hiddenPregnant;
        addChild(invitingMember.name, fatherName, gameState);
        delete invitingMember.hiddenPregnant;
        noPregnancies = false;
        text.addMessage(
          gameState,
          'tribe',
          invitingMember.name +
            ' has been blessed with a child: ' +
            invitingMember.isPregnant
        );
        text.addMessage(
          gameState,
          personName,
          'You have been blessed with the child ' + invitingMember.isPregnant
        );
      }
    }
    if (noPregnancies) {
      text.addMessage(
        gameState,
        'tribe',
        'No one has become pregnant this season.'
      );
    }
    if (gameState.needChanceRoll !== false) {
      text.addMessage(gameState, 'tribe', 'Time for chance.');
    }
    gameState.doneMating = true;
    gameState.matingComplete = true;
    gameState.saveRequired = true;
  } else {
    text.addMessage(
      gameState,
      'tribe',
      'Reproduction round activities are not complete.'
    );
  }
  return 'this many people are done mating: ' + doneMating.length;
}
module.exports.globalMatingCheck = globalMatingCheck;

function hasReasontoNotInvite(gameState, invitingMember) {
  if (!invitingMember) {
    console.log('\t NULL person may not invite anyone');
    return true;
  } else if (invitingMember.cannotInvite) {
    console.log('\t cannotInvite. ' + invitingMember.name);
    return true;
  } else if (invitingMember.golem) {
    invitingMember.cannotInvite = true;
    console.log('\t Skipping golem ' + invitingMember.name);
    return true;
  } else if (invitingMember.isPregnant) {
    console.log('\t inviter was pregnant');
    const inviterKey =
      pop.getPopulationKey(invitingMember, gameState) || invitingMember.name;
    text.addMessage(
      gameState,
      inviterKey,
      'Your pregnancy prevents you from mating.'
    );
    text.addMessage(
      gameState,
      'tribe',
      invitingMember.name + ' is too pregnant for mating this round.'
    );
    invitingMember.cannotInvite = true;
    return true;
  } else if (invitingMember.isInjured && invitingMember.isInjured > 0) {
    console.log('\t inviter is injured');
    const inviterKey =
      pop.getPopulationKey(invitingMember, gameState) || invitingMember.name;
    text.addMessage(
      gameState,
      inviterKey,
      'Your injury prevents you from mating.'
    );
    text.addMessage(
      gameState,
      'tribe',
      invitingMember.name + ' is too injured for mating this round.'
    );
    invitingMember.cannotInvite = true;
    return true;
  } else if (invitingMember.isSick && invitingMember.isSick > 0) {
    console.log('\t inviter is sick');
    const inviterKey =
      pop.getPopulationKey(invitingMember, gameState) || invitingMember.name;
    text.addMessage(
      gameState,
      inviterKey,
      'Your illness prevents you from mating.'
    );
    text.addMessage(
      gameState,
      'tribe',
      invitingMember.name + ' is too sick for mating this round.'
    );
    invitingMember.cannotInvite = true;
    return true;
  }
  return false;
}

function makeLove(targetName, inviterName, gameState, force = false) {
  var parent1 = pop.memberByName(targetName, gameState);
  var parent2 = pop.memberByName(inviterName, gameState);
  var mother = parent2;
  var father = parent1;
  if (parent1.gender == 'female') {
    mother = parent1;
    father = parent2;
  }
  const motherName = mother.name;
  const fatherName = father.name;
  const motherKey = pop.getPopulationKey(mother, gameState) || motherName;
  const fatherKey = pop.getPopulationKey(father, gameState) || fatherName;
  console.log('mother:' + motherName + ' father:' + fatherName);
  let spawnChance = 9;
  if (mother.nursing && mother.nursing.length > 0) {
    spawnChance = 10;
  }
  const roll1 = dice.roll(1);
  const roll2 = dice.roll(1);
  console.log('secret mating rolls [' + roll1 + '][' + roll2 + ']');
  if (force != false || roll1 + roll2 >= spawnChance) {
    if (mother.hiddenPregnant) {
      console.log(
        motherName + ' is secretly already pregnant by ' + mother.hiddenPregnant
      );
    } else {
      mother.hiddenPregnant = fatherName;
    }
  }
  const motherMessage =
    'You share good feelings with ' + fatherName + ' [roll ' + roll1 + ']';
  const fatherMessage =
    'You share good feelings with ' + motherName + ' [roll ' + roll2 + ']';
  const inviterMessage =
    'You share good feelings with ' + targetName + ' [roll ' + roll1 + ']';
  const targetMessage =
    inviterName + ' invites you to share good feelings [roll ' + roll2 + ']';
  pop.history(inviterName, inviterMessage, gameState);
  pop.history(targetName, targetMessage, gameState);
  text.addMessage(gameState, motherKey, motherMessage);
  text.addMessage(gameState, fatherKey, fatherMessage);
  detection(mother, father, roll1 + roll2, gameState);
  return;
}
module.exports.makeLove = makeLove;

function detection(mother, father, reproRoll, gameState) {
  const OBSERVER_THRESHOLD = 17;
  var observerName = dice.randomMemberName(gameState.population);
  var observer = pop.memberByName(observerName, gameState);

  if (!observer) return false;

  var obsName = (observer.name || observerName).toLowerCase();
  var mName = (mother.name || '').toLowerCase();
  var fName = (father.name || '').toLowerCase();

  if (
    observer === mother ||
    observer === father ||
    obsName === mName ||
    obsName === fName ||
    observerName.toLowerCase() === mName ||
    observerName.toLowerCase() === fName
  ) {
    console.log('self observation is discarded');
    return false;
  }
  var netRoll;
  var baseRoll = dice.roll(2);
  netRoll = baseRoll + reproRoll;
  // if the observer has more in common with either parent, harder to avoid observation
  if (
    observer.profession == mother.profession ||
    observer.profession == father.profession
  ) {
    netRoll = netRoll + 1;
  }
  console.log(
    'Detection: obv:' + observerName + ' base:' + baseRoll + ' net:' + netRoll
  );
  if (netRoll >= OBSERVER_THRESHOLD) {
    console.log('should send a message to ' + observerName);

    text.addMessage(
      gameState,
      observerName,
      'You observe ' +
        mother.name +
        ' and ' +
        father.name +
        ' sharing good feelings.'
    );
    return true;
  }
  return false;
}

function getNextChildName(children, childNames, nextIndex, gameState) {
  var currentNames = Object.keys(children);
  if (!nextIndex === null) {
    nextIndex = gameState.conceptionCounter % 26;
    console.log('getNextChild with default index ' + nextIndex);
  }
  var possibles = childNames['names'][nextIndex];
  if (!possibles || possibles.lenght < 1) {
    console.log('Unpossible name  possibles:' + possibles);
    return 'Unpossible';
  }
  var counter = 0;
  let possibleName = possibles[Math.trunc(Math.random() * possibles.length)];
  while (counter < 10 && currentNames.indexOf(possibleName) != -1) {
    possibleName = possibles[Math.trunc(Math.random() * possibles.length)];
    counter = counter + 1;
  }
  if (counter == 10) {
    console.log(
      'could not get a unique child name. ' +
        currentNames.join() +
        ' last tried:' +
        possibleName
    );
    possibleName = 'Overfull' + nextIndex;
  }
  if (!possibleName) {
    console.log(
      'Failed to get a possible name.  counter:' +
        counter +
        ' nextIndex=' +
        nextIndex
    );
    possibleName = 'Bug';
  }
  return possibleName;
}
module.exports.getNextChildName = getNextChildName;

function addChild(mother, father, gameState) {
  var child = Object();
  child.mother = mother;
  child.father = father;
  child.age = -2;
  child.food = 0;
  child.gender = genders[Math.trunc(Math.random() * genders.length)];
  const nextIndex = gameState.conceptionCounter % 26;
  const childName = getNextChildName(gameState.children, allNames, nextIndex);
  gameState.children[childName] = child;
  console.log('added child ' + childName);
  const motherAsMember = pop.memberByName(mother, gameState);
  motherAsMember.isPregnant = childName;
  if (gameState.reproductionList) {
    const indexOfPreggers = gameState.reproductionList.indexOf(mother);
    if (indexOfPreggers > -1) {
      gameState.reproductionList.splice(indexOfPreggers, 1);
      console.log('attempting to remove pregnant woman from reproduction list');
    }
  }
  gameState.conceptionCounter++;
  return child;
}
module.exports.addChild = addChild;

function validateDrone(gameState, actorName, args) {
  const population = gameState.population;
  // is actorname Chief
  const player = population[actorName];
  if (!player || !player.chief) {
    text.addMessage(
      gameState,
      actorName,
      'You need to be chief of the tribe to add a drone.'
    );
    return;
  }
  // is tribe too big?
  if (Object.keys(population).length > 7) {
    text.addMessage(
      gameState,
      actorName,
      'The tribe is too full to add another drone.'
    );
    return;
  }
  if (!args[3]) {
    text.addMessage(
      gameState,
      actorName,
      'Syntax: <gender> <profession> <name> '
    );
    return;
  }
  const gender = args[1];
  let profession = args[2];
  const droneName = args[3];
  let message = '';
  let fail = false;
  // is args valid gender
  if (
    !(
      gender &&
      (gender === 'male' ||
        gender === 'm' ||
        gender === 'female' ||
        gender === 'f')
    )
  ) {
    message += gender + ' is not a valid gender in the game.\n';
    fail = true;
  }
  // is args valid profession
  profession = profession.toLowerCase();
  if (
    !(
      profession &&
      ('g' === profession ||
        'gatherer' === profession ||
        'h' === profession ||
        'hunter' === profession ||
        'c' === profession ||
        'crafter' === profession)
    )
  ) {
    message += profession + ' is not a valid profession\n';
    fail = true;
  }
  if (profession.toLowerCase() === 'h') {
    profession = 'hunter';
  }
  if (profession.toLowerCase() === 'c') {
    profession = 'crafter';
  }
  if (profession.toLowerCase() === 'g') {
    profession = 'gatherer';
  }
  // is args name unique
  if (!droneName || droneName in population) {
    fail = true;
    message += 'Drones need a name that is not already in the tribe.\n';
  }
  const cleanName = droneName;
  if (
    !cleanName === droneName ||
    droneName === 'chief' ||
    droneName === 'vote'
  ) {
    fail = true;
    message += 'Drones need a name that is not a command or hard to parse.\n';
  }
  if (fail) {
    text.addMessage(gameState, actorName, message);
    return false;
  }
  return true;
}
module.exports.validateDrone = validateDrone;

function addDrone(gameState, gender, profession, droneName) {
  //
  const droneData = {
    gender: gender,
    golem: true,
    food: 10,
    grain: 4,
    basket: 0,
    spearhead: 0,
    profession: profession,
    obeyList: ['hunt', 'gather', 'give', 'guard', 'ignore', 'feed', 'babysit'],
    name: droneName,
    history: [],
    worked: false,
    guarding: [],
  };
  text.addMessage(
    gameState,
    'tribe',
    'Adding ' + droneName + ' to the tribe as a drone.'
  );
  gameState.population[droneName] = droneData;
}
module.exports.addDrone = addDrone;

function pass(gameState, actorName) {
  const person = pop.memberByName(actorName, gameState);
  if (!person) {
    text.addMessage(gameState, actorName, 'You are not in this tribe.');
    return;
  }
  if (gameState.reproductionRound) {
    if (person.cannotInvite) {
      text.addMessage(
        gameState,
        person.name,
        'You do not have a invite left to pass on.'
      );
      return;
    }
    person.cannotInvite = true;
    const result = globalMatingCheck(gameState);
    text.addMessage(gameState, 'tribe', result);
    return;
  } else {
    text.addMessage(
      gameState,
      person.name,
      'You can only pass during reproduction round.'
    );
    return;
  }
}
module.exports.pass = pass;

function startReproductionChecks(gameState, actorName) {
  var player = pop.memberByName(actorName, gameState);
  if (gameState.demand || gameState.violence) {
    const activeDemand = gameState.demand || gameState.violence;
    text.addMessage(
      gameState,
      actorName,
      'You cannot start a new round while there is an active demand. Active demand: ' +
        activeDemand
    );
    return;
  }
  if (!player.chief) {
    text.addMessage(
      gameState,
      actorName,
      'startreproduction requires chief priviliges'
    );
    return;
  }
  if (gameState.ended) {
    text.addMessage(
      gameState,
      actorName,
      'The game is over.  Maybe you want to join to start a new game?'
    );
    return;
  }
  if (gameState.reproductionRound == true) {
    text.addMessage(gameState, actorName, 'already in the reproductionRound');
    return;
  }
  if (gameState.foodRound == false) {
    text.addMessage(
      gameState,
      actorName,
      'Can only go to reproduction round from food round'
    );
    return;
  }
  startReproduction(gameState);
  var d = new Date();
  var saveTime = d.toISOString();
  saveTime = saveTime.replace(/\//g, '-');
  console.log(
    saveTime + ' start reproduction round  season:' + gameState.seasonCounter
  );
}
module.exports.startReproductionChecks = startReproductionChecks;

function startReproduction(gameState) {
  // actually consume food here
  gameState.needChanceRoll = true; // this magic boolean prevents starting work until we did chance roll
  gameState.workRound = false;
  gameState.foodRound = false;
  gameState.reproductionRound = true;
  delete gameState.enoughFood;
  let foodMessage = feed.consumeFood(gameState);
  if (Object.keys(gameState.population).length == 0) {
    text.addMessage(
      gameState,
      'tribe',
      'All the players are dead-- game should end.'
    );
    end.endGame(gameState);
    return;
  }
  foodMessage +=
    '==> Starting the Reproduction round; invite other tribe members to reproduce.<==';
  foodMessage +=
    'After chance, the tribe can decide to move to a new location, but the injured and children under 2 will need 2 food';
  text.addMessage(gameState, 'tribe', foodMessage);

  gameState.doneMating = false;
  globalMatingCheck(gameState);
  pop.decrementSickness(gameState.population, gameState, 'food');
  gameState.saveRequired = true;
  gameState.archiveRequired = true;

  return;
}

function handleRomanceResponse(
  gameState,
  actorName,
  targetNameRaw,
  responseType
) {
  let actingMember =
    gameState.population && gameState.population[actorName]
      ? gameState.population[actorName]
      : null;
  if (!actingMember) return 'No such member';
  migrateToConsentDict(actingMember);

  if (!targetNameRaw || targetNameRaw.length === 0)
    return 'No target provided.';

  let targetName = targetNameRaw.trim();
  if (actorName === targetName) {
    return 'You cannot choose yourself.';
  }
  actingMember.consentDict[targetName] = responseType;
  return 'Set ' + targetName + ' to ' + responseType;
}

module.exports.startReproduction = startReproduction;

function checkMating(gameState, displayName) {
  if (gameState.reproductionRound == false) {
    text.addMessage(
      gameState,
      displayName,
      'checkMating is only relevant in the reproduction round.'
    );
  }
  text.addMessage(
    gameState,
    displayName,
    'Checking on the mating status, in case it can be resolved.'
  );
  var message = globalMatingCheck(gameState);
  if (message) {
    text.addMessage(gameState, displayName, message);
  }
  return;
}
module.exports.checkMating = checkMating;

module.exports.migrateToConsentDict = migrateToConsentDict;
module.exports.handleRomanceResponse = handleRomanceResponse;
