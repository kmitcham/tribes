function removeSpecialChars(strVal) {
  if (!strVal || !(typeof strVal === 'string' || strVal instanceof String)) {
    console.log('empty or nonstring value to remove special chars:' + strVal);
    return '';
  }
  return strVal.replace(/[^!a-zA-Z0-9_]+/g, '').trim();
}
module.exports.removeSpecialChars = removeSpecialChars;

function addMessage(gameState, address, message) {
  if (!gameState['messages']) {
    gameState['messages'] = {};
  }
  if (!address) {
    console.log('Message with no address: ' + message);
    return;
  }
  const messages = gameState['messages'];
  if (messages[address]) {
    messages[address] += '\n' + message;
  } else {
    messages[address] = message;
  }

  // Record tribe-wide messages in a persistent history for this tribe
  if (address === 'tribe' && gameState) {
    if (!gameState.tribeHistory) {
      gameState.tribeHistory = [];
    }
    var entryMessage = message;
    if (typeof gameState.seasonCounter === 'number') {
      entryMessage = gameState.seasonCounter / 2 + ': ' + message;
    }
    gameState.tribeHistory.push({
      message: entryMessage,
      dateTime: new Date().toISOString(),
    });
  }
}
module.exports.addMessage = addMessage;

function capitalizeFirstLetter(string) {
  if (string == null || string === '') {
    return string;
  }
  return String(string).charAt(0).toUpperCase() + String(string).slice(1);
}
module.exports.capitalizeFirstLetter = capitalizeFirstLetter;

/**
 * Canonical player name for population keys / person.name:
 * strip special chars, capitalize first letter only (preserve the rest).
 * "ada" → "Ada"; "InjuredResting" stays "InjuredResting".
 * Case variants still collide via case-insensitive memberByName / join checks.
 */
function normalizePlayerName(name) {
  if (typeof name !== 'string') {
    return '';
  }
  const cleaned = removeSpecialChars(name.trim());
  if (!cleaned) {
    return '';
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}
module.exports.normalizePlayerName = normalizePlayerName;

function namesMatch(a, b) {
  return (
    String(a || '')
      .trim()
      .toLowerCase() ===
    String(b || '')
      .trim()
      .toLowerCase()
  );
}
module.exports.namesMatch = namesMatch;

/** Case-insensitive indexOf for name arrays (guarding, inviteList, etc.). */
function indexOfName(list, name) {
  if (!list || !Array.isArray(list) || name == null) {
    return -1;
  }
  const lower = String(name).trim().toLowerCase();
  for (var i = 0; i < list.length; i++) {
    if (String(list[i]).trim().toLowerCase() === lower) {
      return i;
    }
  }
  return -1;
}
module.exports.indexOfName = indexOfName;

function includesName(list, name) {
  return indexOfName(list, name) !== -1;
}
module.exports.includesName = includesName;
