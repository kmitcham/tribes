const fs = require('fs');

let code = fs.readFileSync('libs/reproduction.js', 'utf8');

const migrationFunc = `function migrateToResponseDict(person) {
  if (!person.responseDict) {
    person.responseDict = {};
  }
  if (person.consentList) {
    for (const name of person.consentList) {
      person.responseDict[name] = 'consent';
    }
    delete person.consentList;
  }
  if (person.declineList) {
    for (const name of person.declineList) {
      person.responseDict[name] = 'decline';
    }
    delete person.declineList;
  }
}`;

code = code.replace("function globalMatingCheck(gameState) {", migrationFunc + "\n\nfunction globalMatingCheck(gameState) {");

fs.writeFileSync('libs/reproduction.new.js', code);
