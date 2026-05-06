const fs = require('fs');
let text = fs.readFileSync('tribes-interface.html', 'utf8');

text = text.replace(/opt.textContent = \`\$\{childName\} \(age \$\{age\}\)\`;/g, 
    "opt.textContent = \`\$\{childName\} (age \$\{age / 2\})\`;");
text = text.replace(/opt.textContent = \`\$\{childName\} \(age \$\{age\}, food \$\{food\}\) \$\{status\}\`;/g, 
    "opt.textContent = \`\$\{childName\} (age \$\{age / 2\}, food \$\{food\}) \$\{status\}\`;");
text = text.replace(/childLabel.textContent = \`\$\{child.name\} \(age \$\{child.age\}\)\`;/g, 
    "childLabel.textContent = \`\$\{child.name\} (age \$\{child.age / 2\})\`;");

text = text.replace(/cell\.textContent = Object\.keys\(value\)\.join\(\', \'\);\n                        \} else \{\n                            cell\.textContent = value \|\| \'\'/,
`} else if (key === 'age' && typeof value === 'number') {
                            cell.textContent = value / 2;
                        } else {
                            cell.textContent = value || ''`);

fs.wrfs.wrfs.wrfs.wrfs.wrfs.wrface.html', text);
