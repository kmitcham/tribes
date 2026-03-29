const fs = require('fs');

let file = 'tests/reproduction.test.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("activity: 'reproduction'", "reproductionRound: true");

fs.writeFileSync(file, content);
