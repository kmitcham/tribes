const fs = require('fs');
const path = require('path');

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

  const jsonText = Buffer.isBuffer(rawData) ? rawData.toString('utf8') : rawData;

  if (!jsonText || jsonText.trim().length === 0) {
    return cloneDefault(defaultValue);
  }

  try {
    return JSON.parse(jsonText);
  } catch (err) {
    throw new Error(`Failed to parse JSON file ${fileName}: ${err.message}`);
  }
}

function writeJson(fileName, jsonData, spacing = 2) {
  const dir = path.dirname(fileName);
  if (dir && dir !== '.' && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  try {
    fs.writeFileSync(fileName, JSON.stringify(jsonData, null, spacing), 'utf8');
  } catch (err) {
    throw new Error(`Failed to write JSON file ${fileName}: ${err.message}`);
  }
}

module.exports = {
  loadJson,
  writeJson,
};