const fs = require('fs');
let content = fs.readFileSync('libs/reproduction.js', 'utf8');
if (!content.includes('module.exports.migrateToResponseDict')) {
  content += "\nmodule.exports.migrateToResponseDict = migrateToResponseDict;\nmodule.exports.handleRomanceResponse = handleRomanceResponse;\n";
  fs.writeFileSync('libs/reproduction.js', content);
}
