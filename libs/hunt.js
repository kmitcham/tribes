const locations = require('./locations.json');
const dice = require('./dice.js');
const text = require('./textprocess.js');
const pop = require('./population.js');
const career = require('./career.js');

const locationDecay = [
  30, // arrays count from 0 so add extra item
  30,
  30,
  30,
  17,
  17,
  15,
  15,
  14,
  14,
  13,
  13,
  12,
  12,
  11,
  11,
  10,
  10,
  9,
  9,
  8,
];
module.exports.locationDecay = locationDecay;

module.exports.hunt = (playername, player, rollValue, gameState) => {
  // Build modifiers first so they appear ahead of the roll in the message.
  let modifiers = '';
  let strMod = 0;
  if (player.strength && player.strength.toLowerCase() == 'strong'.valueOf()) {
    strMod = 1;
    modifiers += ' (+1 strong)';
  }
  var modifier = Number(strMod);
  if (player.strength && player.strength.toLowerCase() == 'weak'.valueOf()) {
    modifier -= 1;
    modifiers += ' (-1 weak)';
  }
  if (gameState.seasonCounter % 2 == 0) {
    modifiers += ' (-1 season)';
    modifier -= 1;
  }
  if (!('profession' in player) || !player.profession.startsWith('h')) {
    modifiers += ' (-3 skill)';
    modifier -= 3;
  }
  if (player.spearhead > 0 && rollValue >= 9) {
    modifier += 3;
    modifiers += ' (+3 spearhead)';
  }
  let netRoll = Number(rollValue) + modifier;
  const gameTrack = gameState.gameTrack[gameState.currentLocationName];
  const hunt_cap = locationDecay[gameTrack];
  const huntData = locations[gameState.currentLocationName]['hunt'];
  if (netRoll > hunt_cap) {
    const gameTrackPenalty = netRoll - hunt_cap;
    netRoll = hunt_cap;
    modifiers += ' (-' + gameTrackPenalty + ' game track)';
    console.log(
      ' hunt with netRoll ' +
        netRoll +
        ' capped at ' +
        hunt_cap +
        ' since the gameTrack was ' +
        gameTrack
    );
  }
  if (netRoll > 18) {
    netRoll = 18;
  }
  let message =
    playername + ' goes hunting.' + modifiers + ' [roll ' + rollValue + '].';
  if (
    rollValue + strMod < 6 ||
    (rollValue + strMod < 7 && player.profession != 'hunter')
  ) {
    if (rollValue + strMod == 3) {
      message += '\nSevere Injury!\n';
      if (player.strength && player.strength == 'strong') {
        delete player.strength;
        message += player.name + ' is reduced to average strength.';
      } else {
        player.strength = 'weak';
        message += player.name + ' becomes weak.';
      }
    } else {
      message += '\nInjury!';
    }
    pop.applyInjury(player, gameState);
  } else if (netRoll <= 8) {
    message += '\n🚫🦌 No game.';
  } else {
    const huntRow = huntDataFor(huntData, netRoll);
    const huntIcon = huntResultIcon(huntRow[2]);
    message +=
      '\n\t' +
      (huntIcon ? huntIcon + ' ' : '') +
      huntRow[2] +
      ' +' +
      huntRow[1] +
      ' food.';
    player.food += huntRow[1];
    gameState.foodAcquired += huntRow[1];
    career.addFoodProduced(player, huntRow[1]);
  }
  // check for spearhead loss
  const breakRoll = dice.roll(1);
  if (player.spearhead > 0 && breakRoll <= 2) {
    player.spearhead -= 1;
    message += '\n𓐬💥 The spearhead broke! (roll ' + breakRoll + ').';
  }

  player.worked = true;
  // update the game track
  gameState.gameTrack[gameState.currentLocationName] += 1;
  message +=
    '\nThe game track goes from ' +
    gameTrack +
    ' to ' +
    gameState.gameTrack[gameState.currentLocationName] +
    '.';

  player.activity = 'hunted';
  player.worked = true;
  gameState.saveRequired = true;
  text.addMessage(gameState, 'tribe', message);
  pop.history(player.name, message, gameState);
  return message;
};

const huntDataFor = (huntData, netRoll) => {
  for (var i = 0; i < huntData.length; i++) {
    if (netRoll <= huntData[i][0]) {
      return huntData[i];
    }
  }
  return huntData[huntData.length - 1];
};

function huntResultIcon(resultText) {
  const normalized = String(resultText || '').toLowerCase();
  if (
    normalized.includes('rabbit') ||
    normalized.includes('hare') ||
    normalized.includes('small game')
  ) {
    return '🐇';
  }
  if (
    normalized.includes('rodent') ||
    normalized.includes('squirrel') ||
    normalized.includes('mouse')
  ) {
    return '🐿️';
  }
  if (normalized.includes('elk')) {
    return '🫎';
  }
  if (normalized.includes('fish') || normalized.includes('sturgeon')) {
    return '🐟';
  }
  if (
    normalized.includes('deer') ||
    normalized.includes('antelope') ||
    normalized.includes('gazelle') ||
    normalized.includes('buck') ||
    normalized.includes('doe') ||
    normalized.includes('stag') ||
    normalized.includes('hart') ||
    normalized.includes('moose')
  ) {
    return '🦌';
  }
  if (normalized.includes('buffalo') || normalized.includes('bison')) {
    return '🦬';
  }
  if (normalized.includes('bear')) {
    return '🐻';
  }
  if (normalized.includes('wolf')) {
    return '🐺';
  }
  if (normalized.includes('alligator')) {
    return '🐊';
  }
  if (normalized.includes('bird') || normalized.includes('hornbill')) {
    return '🐦';
  }
  return '';
}
module.exports.huntDataFor = huntDataFor;

function getScoutMessage(otherLocation, gameState) {
  let locationName = gameState.currentLocationName;
  if (otherLocation) {
    locationName = otherLocation;
  }
  var season = 'warm season.';
  if (gameState.seasonCounter % 2 == 0) {
    season = 'cold season.';
  }
  let response = 'The ' + locationName + ' ' + season + ' resources are:\n';
  const locationData = locations[locationName];
  if (!locationData) {
    return 'Valid locations are: ' + Object.keys(locations);
  }
  response += '\tGather:\n';
  for (const index in locationData['gather']) {
    const entry = locationData['gather'][index];
    response +=
      '\t\t' +
      entry[3] +
      '(' +
      (Number(entry[1]) + Number(entry[2])) +
      ') \t\t(roll ' +
      entry[0] +
      ')\n';
  }
  response +=
    '\tHunt:  Game Track: ' + gameState.gameTrack[locationName] + '\n';
  for (const index in locationData['hunt']) {
    const entry = locationData['hunt'][index];
    const capValue = locationDecay[gameState.gameTrack[locationName]];
    //console.log(' index is '+index+" entry is "+entry+' capValue is '+capValue+' trackValue was '+gameState.gameTrack[locationName]  )
    if (entry[0] > capValue) {
      response += '\t\t (game track capped)\n';
      break;
    }
    response +=
      '\t\t' + entry[2] + '(' + entry[1] + ') \t\t(roll ' + entry[0] + ')\n';
  }
  return response;
}
module.exports.getScoutMessage = getScoutMessage;
