const fs = require('fs');
let code = fs.readFileSync('libs/reproduction.js', 'utf8');

// Replacement for globalMatingCheck logic!
let codeToReplace = `      var targetName = actingMember.inviteList[index];
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

let newCodeLogic = `      var targetName = actingMember.inviteList[index];
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

code = code.replace(codeToReplace, newCodeLogic);

fs.writeFileSync('libs/reproduction.js', code);
