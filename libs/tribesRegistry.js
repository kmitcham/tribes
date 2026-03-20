const fs = require('fs');
const path = require('path');

const REGISTRY_FILE = './tribe-data/tribesRegistry.json';

function initRegistry() {
    if (!fs.existsSync('./tribe-data')) {
        fs.mkdirSync('./tribe-data', { recursive: true });
    }
    
    if (fs.existsSync(REGISTRY_FILE)) {
        try {
            const data = fs.readFileSync(REGISTRY_FILE);
            return JSON.parse(data);
        } catch (e) {
            console.error('Error reading tribes registry', e);
        }
    }
    
    // Discover from dirs
    const dirs = fs.readdirSync('./tribe-data', { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    
    const registry = dirs.reduce((acc, dir) => {
        acc[dir] = { name: dir, hidden: false };
        return acc;
    }, {});
    
    // Add default options if empty
    if (Object.keys(registry).length === 0) {
        ['bear', 'flounder', 'bug', 'vashon', 'mib', 'sloth', 'wolf'].forEach(t => {
            registry[t] = { name: t, hidden: false };
        });
    }

    saveRegistry(registry);
    return registry;
}

function saveRegistry(registry) {
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2));
}

function getTribes() {
    return initRegistry();
}

function setTribeHidden(tribeName, hidden) {
    const reg = initRegistry();
    if (!reg[tribeName]) {
        reg[tribeName] = { name: tribeName, hidden: hidden };
    } else {
        reg[tribeName].hidden = hidden;
    }
    saveRegistry(reg);
    return reg;
}

function createTribe(tribeName) {
    const reg = initRegistry();
    if (!reg[tribeName]) {
        reg[tribeName] = { name: tribeName, hidden: false };
        saveRegistry(reg);
    }
    return reg;
}

module.exports = {
    getTribes,
    setTribeHidden,
    createTribe
};
