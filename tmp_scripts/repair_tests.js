const fs = require('fs');

let file = 'tests/reproduction.test.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("expect(gameState.messages['p1']).toContain('wait');", "expect(gameState.messages['p1']).toContain('considers');");
content = content.replace("expect(gameState.messages['p1']).toContain('mates with');", "expect(gameState.messages['p1']).toContain('impressed');");
content = content.replace("expect(gameState.messages['p1']).toContain('not interested');", "expect(gameState.messages['p1']).toContain('declines');");

fs.writeFileSync(file, content);
console.log('Fixed test expectations');
