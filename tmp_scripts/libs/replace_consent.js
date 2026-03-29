const fs = require('fs');

let code = fs.readFileSync('libs/reproduction.js', 'utf8');

const newConsent = `function consentPrep(gameState, sourceName, rawList) {
  var member = pop.memberByName(sourceName, gameState);
  migrateToResponseDict(member);

  if (!rawList) {
    console.log('no rawList for consent');
    let consentArr = [];
    if (member.responseDict) {
      for (const [name, resp] of Object.entries(member.responseDict)) {
        if (resp === 'consent') consentArr.push(name);
      }
    }
    if (consentArr.length > 0) {
      text.addMessage(gameState, sourceName, 'Current consentList: ' + consentArr.join(' '));
      return 'Current consentList: ' + consentArr.join(' ');
    } else {
      text.addMessage(gameState, sourceName, 'No current consentList.');
      return 'No current consentList.';
    }
  }
  let messageArray = rawList.split(' ');
  if (rawList.includes(',')) {
    messageArray = rawList.split(',');
    console.log('splitting consent on commas');
  }
  if (messageArray.length < 1) {
    text.addMessage(    text.addMessage(    text.addMessage(    text.addMessagLis    text.addMessage(    text.addMessage(    text.addMessage(    text.addMra    text.addMessage(    text.addMessage(    text.addMein    text.addMessage(    text.adping is resolved by r    text.addMessage(    text.addMessage(ent    text.addMessage(  );
  consent(sourceName, messageArray, gameState);
  
  let finalConsentArr = [];
  if (member.responseDict) {
    for (const [name, resp] of Object.entries(member.responseDict)) {
      if (resp === 'consent') finalConsentArr.push(name);
    }
  }
  return finalConsentArr;
}
module.exports.consentPrep = consentPrep;

function consent(actorName, arrayOfNames, gameState) {
  var member = pop.memberByName(actorName, gameState);
  if (!member) {
    console.log(actorName + ' not found in tribe for consent');
    text.addMessage(gameState, actorName, 'You are not in the tribe');
    return;
  }
  migrateToResponseDict(member);
  
  var handleMessage = handleRomanceResponse(
    actorName,
    arrayOfNames,
    'consent',
    gameState
  );
  text.addMessage(gameState, member.name, handleMessage);
  
  gameState.saveRequired = true;
  return globalMatingCheck(gameState);
}
module.exports.consent = consent;`;

// Find consentPrep and consent
const r = /function consentPrep[\s\S]*?module\.exports\.consent = consent;/;
code = code.replace(r, newConsent);

fs.writeFileSync('libs/reproduction.js', code);
