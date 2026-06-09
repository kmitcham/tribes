const { execSync } = require('child_process');

function hasEnvValue(name) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim().length > 0;
}

function setEnvIfMissing(name, value) {
  if (!hasEnvValue(name) && typeof value === 'string' && value.trim().length > 0) {
    process.env[name] = value.trim();
  }
}

function runGit(command) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch (error) {
    return '';
  }
}

function hydrateBuildMetadataFromGit() {
  if (hasEnvValue('TRIBES_LAST_COMMIT_DATE')) {
    return;
  }

  const isRepo = runGit('git rev-parse --is-inside-work-tree');
  if (isRepo !== 'true') {
    return;
  }

  setEnvIfMissing('TRIBES_LAST_COMMIT_DATE', runGit('git log -1 --format=%cI'));
  setEnvIfMissing('TRIBES_LAST_COMMIT_DATE_SHORT', runGit('git log -1 --format=%cs'));
  setEnvIfMissing('TRIBES_LAST_COMMIT_HASH', runGit('git rev-parse --short HEAD'));
}

hydrateBuildMetadataFromGit();

require('../websocket-server.js');
