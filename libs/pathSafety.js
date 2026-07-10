const path = require('path');
const fs = require('fs');

// Tribe names become directory segments. Keep them simple and traversal-proof.
const TRIBE_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;

const IMAGE_BASENAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(png|jpe?g|gif)$/i;

function isSafeTribeName(tribeName) {
  return typeof tribeName === 'string' && TRIBE_NAME_RE.test(tribeName);
}

function assertSafeTribeName(tribeName) {
  if (!isSafeTribeName(tribeName)) {
    const err = new Error(
      `Invalid tribe name '${tribeName}'. Use 1-64 chars: letters, numbers, _ or - only.`
    );
    err.code = 'INVALID_TRIBE_NAME';
    throw err;
  }
  return tribeName;
}

function tribeDataRoot(baseDir = process.cwd()) {
  return path.resolve(baseDir, 'tribe-data');
}

function assertPathInsideRoot(rootDir, candidatePath) {
  const root = path.resolve(rootDir);
  const resolved = path.resolve(candidatePath);
  if (resolved === root) {
    return resolved;
  }
  const prefix = root.endsWith(path.sep) ? root : root + path.sep;
  if (!resolved.startsWith(prefix)) {
    const err = new Error('Path escapes allowed directory');
    err.code = 'PATH_ESCAPE';
    throw err;
  }
  return resolved;
}

function tribeDir(tribeName, baseDir = process.cwd()) {
  assertSafeTribeName(tribeName);
  const root = tribeDataRoot(baseDir);
  return assertPathInsideRoot(root, path.join(root, tribeName));
}

function tribeMainFile(tribeName, baseDir = process.cwd()) {
  const dir = tribeDir(tribeName, baseDir);
  return path.join(dir, `${tribeName}.json`);
}

function tribeSnapshotFile(tribeName, fileName, baseDir = process.cwd()) {
  assertSafeTribeName(tribeName);
  // fileName must be a single path segment (no traversal).
  if (
    typeof fileName !== 'string' ||
    fileName.includes('..') ||
    fileName.includes('/') ||
    fileName.includes('\\') ||
    path.basename(fileName) !== fileName ||
    !fileName.endsWith('.json')
  ) {
    const err = new Error('Invalid snapshot file name');
    err.code = 'INVALID_SNAPSHOT_NAME';
    throw err;
  }
  return path.join(tribeDir(tribeName, baseDir), fileName);
}

function archiveDirForTribe(tribeName, baseDir = process.cwd()) {
  assertSafeTribeName(tribeName);
  const root = path.resolve(baseDir, 'archive');
  return assertPathInsideRoot(root, path.join(root, tribeName));
}

/**
 * Resolve an image request to a file under appRoot or appRoot/png only.
 * Uses basename only so ../ cannot escape.
 * Returns null if the request is unsafe or the file does not exist.
 */
function resolveSafeImagePath(appRoot, requestUrl) {
  if (!requestUrl || typeof requestUrl !== 'string') {
    return null;
  }
  const pathname = requestUrl.split('?')[0].split('#')[0];
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch (_err) {
    return null;
  }
  const base = path.basename(decoded);
  if (!IMAGE_BASENAME_RE.test(base)) {
    return null;
  }

  const roots = [path.resolve(appRoot), path.resolve(appRoot, 'png')];
  for (const root of roots) {
    const candidate = path.resolve(root, base);
    try {
      assertPathInsideRoot(root, candidate);
    } catch (_err) {
      continue;
    }
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

module.exports = {
  TRIBE_NAME_RE,
  isSafeTribeName,
  assertSafeTribeName,
  tribeDataRoot,
  tribeDir,
  tribeMainFile,
  tribeSnapshotFile,
  archiveDirForTribe,
  assertPathInsideRoot,
  resolveSafeImagePath,
};
