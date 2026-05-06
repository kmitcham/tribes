const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = content.replace(/consentDict/g, 'consentDict');
    if (content !== updated) {
        fs.writeFileSync(filePath, updated, 'utf8');
        console.log('Updated', filePath);
    }
}

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
        const fullPath = path.join(dir, f);
        if (fs.statSync(fullPath).isDirectory()) {
            if (f !== 'node_modules' && f !== '.git' && f !== 'archive') {
                processDir(fullPath);
            }
        } else {
            if (fullPath.endsWith('.js') || fullPath.endsWith('.html') || fullPath.endsWith('.json')) {
                replaceInFile(fullPath);
            }
        }
    }
}

processDir(__dirname);