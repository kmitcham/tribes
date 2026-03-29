const fs = require('fs');
let file = 'tests/reproduction.test.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/messages: \{ p1: '', p2: '' \},/g, "messages: { p1: '', p2: '' }, reproductionRound: true,");

fs.writeFileSync(file, content);
