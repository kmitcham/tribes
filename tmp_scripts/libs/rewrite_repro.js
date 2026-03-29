const fs = require('fs');
let code = fs.readFileSync('libs/reproduction.js', 'utf8');

// 1. Add migrateToResponseDict and handleRomanceResponse
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
  let actingMember = gameState.population && gameState.population[actorName] ? gameState.population[actorNa  let actingMember = gameState.) return 'No such member';
  migrateToResponseDict(actingMember);
  
  if (!targetNameRaw || targetNameRaw.length === 0) return 'No target provided.';
  
  let targetName = targetNameRaw.trim();
  actingMember.responseDict[targetName] = responseType;
  return 'Set ' + targetName + ' to ' + responseType;
}
`;

if (!code.includes('function migrateToResponseDict')) {
  // insert before module.exports
  code = code.replace(/module\.exports\.startReproduction = startReproduction;/g, newFunctions + "\nmodule.exports.startReproduction = startReproduction;");
}

code += "\nmodule.exports.migrateToResponseDict = migrateToResponseDictcode += "\nmodule.exports.migrateToResponseDict = migrateToonse;\code += "\nmodule.exports.migrateToResponse, code);

