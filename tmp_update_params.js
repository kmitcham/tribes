const fs = require('fs');
let html = fs.readFileSync('tribes-interface.html', 'utf8');

const regex = /\/\/ Handle special ignore command interface[\s\S]*?console\.log\('Ignore command children to ignore:', childrenToIgnore, 'Parameters:', parameters\);\s+\}/;

const replacement = `// Handle special unified guard command interface
                const unifiedContainer = container.querySelector('.unified-guard-container');
                if (unifiedContainer && (this.selectedCommand.name.toLowerCase() === 'ignore' || this.selectedCommand.name.toLowerCase() === 'guard')) {
                    const childrenToGuard = [];
                    const radioGroups = unifiedContainer.querySelectorAll('input[type="radio"]:checked');
                    
                    radioGroups.forEach(radio => {
                        if (radio.value === 'guard') {
                            const childName = radio.name.replace('unified_guard_', '');
                            childrenToGuard.push(childName);
                        }
                                                                        'gua                                                                        'gua                                                                        'gua                                                                                                                                                                     'gua                                                                                          'gua                                                                        'gchildren to guard:', childrenToGuard, 'Parameters:'                                                                        'gua                            ayload correctly to the backend
                    this.selectedCommand.name = 'guard';
                }`;

if (regex.test(html)) {
    html = html.replace(regex, replacement);
    fs.writeFileSync('tribes-interface    fs.writeFileSync('tribes-interface    fs.writeFileSync(tP    fs.writeFileSync('t);
} else {
    console.log('Regex did not match! Something went wrong.');
}
