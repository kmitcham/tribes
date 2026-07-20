const fs = require('fs');
const pathSafety = require('./pathSafety.js');

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
  const dirs = fs
    .readdirSync('./tribe-data', { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  const registry = dirs.reduce((acc, dir) => {
    acc[dir] = { name: dir, hidden: false };
    return acc;
  }, {});

  // Add default options if empty
  if (Object.keys(registry).length === 0) {
    [
      'bear',
      'flounder',
      'bug',
      'vashon',
      'mib',
      'sloth',
      'wolf',
      'bat',
      'loon',
      'yak',
      'zebra',
    ].forEach((t) => {
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
  pathSafety.assertSafeTribeName(tribeName);
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
  pathSafety.assertSafeTribeName(tribeName);
  const reg = initRegistry();
  if (!reg[tribeName]) {
    reg[tribeName] = { name: tribeName, hidden: false };
    saveRegistry(reg);
  }
  return reg;
}

/**
 * Remove a tribe from the registry and delete its tribe-data directory.
 * @returns {{ registry: object, deletedDir: boolean }}
 */
function deleteTribe(tribeName) {
  pathSafety.assertSafeTribeName(tribeName);
  const reg = initRegistry();
  const existedInRegistry = !!reg[tribeName];
  if (existedInRegistry) {
    delete reg[tribeName];
    saveRegistry(reg);
  }

  const dir = pathSafety.tribeDir(tribeName);
  let deletedDir = false;
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    deletedDir = true;
  }

  if (!existedInRegistry && !deletedDir) {
    const err = new Error(`Tribe '${tribeName}' was not found in the registry or on disk.`);
    err.code = 'TRIBE_NOT_FOUND';
    throw err;
  }

  return { registry: reg, deletedDir };
}

module.exports = {
  getTribes,
  setTribeHidden,
  createTribe,
  deleteTribe,
};
