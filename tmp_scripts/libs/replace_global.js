const fs = require('fs');

let code = fs.readFileSync('libs/reproduction.js', 'utf8');

const migrationFunc = `function migrateToResponseDict(person) {
  if (!person) return false;
  if (!person.responseDict) {
    person.responseDict = {};
  }
  let modified = false;
  
  if (person.consentList) {
    for (const name of person.consentList) {
      person.responseDict[name] = 'consent';
    }
    delete person.consentList;
    modified = true;
  }
  
  if (person.declineList) {
    for (const name of person.declineList) {
      person.responseDict[name] = 'decline';
    }
    delete person.declineList;
    modified = true;
  }
  return modified;
}
module.exports.migrateToResponseDict = migrateToResponseDict;
`;

code = code.replace("const end = require('./endgame');", "const end = require('./endgame');\n\n" + migrationFunc);

fs.writeFileSync('libs/reproduction.js', code);
