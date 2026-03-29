const fs = require('fs');

let code = fs.readFileSync('libs/reproduction.js', 'utf8');

// 1. Ensure `migrateToResponseDict` and `handleRomanceResponse` exist
const newFunctions = `
function migrateToResponseDict(person) {
  if (!person) return;
  if (!person.responseDict) person.responseDict = {};
  
  if (person.consentList && Array.isArray(person.consentList)) {
    for (let target of person.consentList) {
      if (target !== '!none' && target !== '!pass' && target !== '!all') {
         person.responseDict[target] = 'consent';
      } else if (target === '!all') {
         person.responseDict['!all'] = 'consent';
      }
    }
  }
  if (person.declineList && Array.isArray(person.declineList)) {
    for (let target of person.declineList) {
      person.responseDict[target] = 'decline';
    }
  }
}

function handleRomanceResponse(gameState, actorName, targetNameRaw, responseType) {
  let actingMember = gameState.population && gameState.population[actorName] ? gameState.population[actorName] : null;
  if (!actingMember) return 'No such member';
  migrateToResponseDict(actingMember);
  
  if (!targetNameRaw || targetNameRaw.length === 0) return 'No target provided.';
  
  let targetName = targetNameRaw.trim();
  actingMember.responseDict[targetName] = responseType;
  return 'Set ' + targetName + ' to ' + responseType;
}
`;

if (!code.includes('function migrateToResponseDict(person)')) {
    code = code.replace(/module\.exports\.startReproduction = startReproduction;/g, newFunctions + "\nmodule.exports.startReproduction = startReproduction;");
}

// 2. Ensure they are exported properly at the bottom
const exportsString = `
module.exports.migrateToResponseDict = migrateToResponseDict;
module.exports.handleRomanceResponse = handleRomanceResponse;
`;
if (!code.includes('module.exports.migrateToResponseDict = migrateToResponseDict;')) {
    code += "\n" + exportsString;
}

// 3. Fix globalMatingCheck core logic using regex/split-join
const codeToReplaceOld = `      var targetName = actingMember.inviteList[index];
      console.log('trying to match ' + actorName + ' to ' + targetName);
      if (
        !targetName ||
        targetName.trim() == '!pass' ||
        targetName.trim() == '!none'
      ) {
        processPassEmptyOrNone(gameState, actingMember);
        actionableInvites = true;
        break;
      }
      var targetMember = population[targetName];
      if (!targetMember) {
        console.log('target member is not valid!');
        actingMember.inviteList.splice(index, 1);
        actionableInvites = true;
        break;
      }

      var matingObjFlag = matingObjections(actingMember, targetMember);
      if (typeof matingObjFlag == 'string' && matingObjFlag.length > 0) {
        text.addMessage(
          gameState,
          actingMember.name,
          'You try to mate with ' + targetMember.name + ', but ' + matingObjFlag
        );
        actingMember.inviteList.splice(index, 1);
        actionableInvites = true;
        break;
      }

      var resolved = false;

      // if it is on the other declineList
      if (
        targetMember.declineList &&
        targetMember.declineList.includes(actingMember.name)
      ) {
        text.addMessage(
          gameState,
          actingMember.name,
          'You invite ' + targetName + ' but finds they are not interested'
        );
        actingMember.inviteList.splice(index, 1);
        resolved = true;
        actionableInvites = true;
        break;
      }

      if (
        (targetMember.consentList &&
          targetMember.consentList.includes('!all')) ||
        (targetMember.consentList &&
          targetMember.consentList.includes(actingMember.name)) ||
        (targetMember.inviteList &&
          targetMember.inviteList.includes(actingMember.name))
      ) {`;

const newCodeLogic = `      var targetName = actingMember.inviteList[index];
      console.log('trying to match ' + actorName + ' to ' + targetName);
      if (
        !targetName ||
        targetName.trim() == '!pass' ||
        targetName.trim() == '!none'
      ) {
        processPassEmptyOrNone(gameState, actingMember);
        actionableInvites = true;
        break;
      }
      var targetMember = population[targetName];
      if (!targetMember) {
        console.log('target member is not valid!');
        actingMember.inviteList.splice(index, 1);
        actionableInvites = true;
        break;
      }

      var matingObjFlag = matingObjections(actingMember, targetMember);
      if (typeof matingObjFlag == 'string' && matingObjFlag.length > 0) {
        text.addMessage(
          gameState,
          actingMember.name,
          'You try to mate with ' + targetMember.name + ', but ' + matingObjFlag
        );
        actingMember.inviteList.splice(index, 1);
        actionableInvites = true;
        break;
      }

      migrateToResponseDict(actingMember);
      migrateToResponseDict(targetMember);

      let targetResponse = targetMember.responseDict ? targetMember.responseDict[actorName] : undefined;
      // also check !all
      if (!targetResponse && targetMember.responseDict && targetMember.responseDict['!all']) {
         targetResponse = targetMember.responseDict['!all'];
      }
      
      // Implicitly check if they invited us back, treating mutual invite as consent
      if (!targetResponse && targetMember.inviteList && targetMember.inviteList.includes(actorName)) {
         targetResponse = 'consent';
      }

      var resolved = false;

      if (targetResponse === 'decline') {
        text.addMessage(
          gameState,
          actingMember.name,
          'You invite ' + targetName + ' but finds they are not interested'
        );
        actingMember.inviteList.splice(index, 1);
        resolved = true;
        actionableInvites = true;
        break;
      }

      if (targetResponse === 'consent') {`;

if (code.includes('if (\n        (targetMember.consentList &&')) {
  code = code.replace(codeToReplaceOld, newCodeLogic);
}

fs.writeFileSync('libs/reproduction.js', code);
console.log('Successfully updated libs/reproduction.js');
