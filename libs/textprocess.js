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
  messages = gameState['messages'];
  if (messages[address]) {
    messages[address] += '\n' + message;
  } else {
    messages[address] = message;
  }
}
module.exports.addMessage = addMessage;

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
module.exports.capitalizeFirstLetter = capitalizeFirstLetter;
