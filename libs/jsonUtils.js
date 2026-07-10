const fs = require('fs');
const path = require('path');
const { Buffer } = require('buffer');

function cloneDefault(defaultValue) {
  if (Array.isArray(defaultValue)) {
    return [...defaultValue];
  }
  if (defaultValue && typeof defaultValue === 'object') {
    return { ...defaultValue };
  }
  return defaultValue;
}

function loadJson(fileName, defaultValue = {}) {
  let rawData;
  try {
    rawData = fs.readFileSync(fileName, 'utf8');
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      return cloneDefault(defaultValue);
    }
    throw new Error(`Failed to read JSON file ${fileName}: ${err.message}`);
  }

  const jsonText = Buffer.isBuffer(rawData)
    ? rawData.toString('utf8')
    : String(rawData);

  if (!jsonText || jsonText.trim().length === 0) {
    return cloneDefault(defaultValue);
  }

  try {
    return JSON.parse(jsonText);
  } catch (err) {
    throw new Error(`Failed to parse JSON file ${fileName}: ${err.message}`);
  }
}

function fsyncFile(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    try {
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
  } catch (_err) {
    // Best-effort: some environments (tests, network FS) may not support fsync.
  }
}

/**
 * Atomically write JSON: temp file in the same directory, optional backup of the
 * previous file, then rename into place. Rename is atomic on POSIX filesystems.
 */
function writeJson(fileName, jsonData, spacing = 2) {
  const dir = path.dirname(fileName);
  if (dir && dir !== '.' && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const payload = JSON.stringify(jsonData, null, spacing);
  const tempFile = `${fileName}.${process.pid}.${Date.now()}.tmp`;

  try {
    fs.writeFileSync(tempFile, payload, 'utf8');
    fsyncFile(tempFile);

    if (fs.existsSync(fileName)) {
      const bakFile = `${fileName}.bak`;
      try {
        fs.copyFileSync(fileName, bakFile);
      } catch (_bakErr) {
        // Best-effort backup only.
      }
    }

    fs.renameSync(tempFile, fileName);
  } catch (err) {
    try {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    } catch (_cleanupErr) {
      // ignore cleanup failure
    }
    throw new Error(`Failed to write JSON file ${fileName}: ${err.message}`);
  }
}

module.exports = {
  loadJson,
  writeJson,
};
