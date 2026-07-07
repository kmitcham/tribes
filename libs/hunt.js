const locations = require('./locations.json');
const dice = require('./dice.js');
const text = require('./textprocess.js');
const pop = require('./population.js');

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
  let message = playername + ' goes hunting. [roll ' + rollValue + ']';
  // injury check
  let strMod = 0;
  if (player.strength && player.strength.toLowerCase() == 'strong'.valueOf()) {
    strMod = 1;
    message += ' +strong ';
  }
  var modifier = Number(strMod);
  if (player.strength && player.strength.toLowerCase() == 'weak'.valueOf()) {
    modifier -= 1;
    message += ' -weak ';
  }
  if (gameState.seasonCounter % 2 == 0) {
    message += '-season ';
    modifier -= 1;
  }
  if (!('profession' in player) || !player.profession.startsWith('h')) {
    message += '-skill ';
    modifier -= 3;
  }
  if (player.spearhead > 0 && rollValue >= 9) {
    modifier += 3;
    message += '+spearhead ';
  }
  let netRoll = Number(rollValue) + modifier;
  const gameTrack = gameState.gameTrack[gameState.currentLocationName];
  const hunt_cap = locationDecay[gameTrack];
  const huntData = locations[gameState.currentLocationName]['hunt'];
  if (netRoll > hunt_cap) {
    netRoll = hunt_cap;
    message += ' -game track ';
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
      ' food';
    player.food += huntRow[1];
    gameState.foodAcquired += huntRow[1];
  }
  // check for spearhead loss
  const breakRoll = dice.roll(1);
  if (player.spearhead > 0 && breakRoll <= 2) {
    player.spearhead -= 1;
    message += '\n💥 The spearhead broke! (roll ' + breakRoll + ')';
  }

  player.worked = true;
  // update the game track
  gameState.gameTrack[gameState.currentLocationName] += 1;
  message +=
    '\nThe game track goes from ' +
    gameTrack +
    ' to ' +
    gameState.gameTrack[gameState.currentLocationName];

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

function scoutNerd(gameTrack = 0) {
  gameTrack = Number(gameTrack) || 0;
  const GATHER = 0;
  const GATHER_STRONG = 1;
  const GRAIN = 2;
  const GRAIN_STRONG = 3;
  const HUNT = 4;
  const SPEAR = 5;
  var totals = {
    veldt: [0, 0, 0, 0, 0, 0, 0],
    hills: [0, 0, 0, 0, 0, 0, 0],
    marsh: [0, 0, 0, 0, 0, 0, 0],
    forest: [0, 0, 0, 0, 0, 0, 0],
  };
  for (var i = 1; i <= 6; i++) {
    for (var j = 1; j <= 6; j++) {
      for (var k = 1; k <= 6; k++) {
        let droll = i + j + k;
        if (droll > locationDecay[gameTrack]) {
          droll = locationDecay[gameTrack];
        }
        for (const locationName in totals) {
          const locationData = locations[locationName];
          const data = gatherDataFor(locationName, droll);
          totals[locationName][GATHER] += data[1];
          totals[locationName][GRAIN] += data[2];
          totals[locationName][HUNT] += huntDataFor(
            locationData['hunt'],
            droll
          )[1];
          let sval = droll;
          if (droll >= 9) {
            sval = droll + 3;
          }
          totals[locationName][SPEAR] += huntDataFor(
            locationData['hunt'],
            sval
          )[1];
          const dataStrong = gatherDataFor(locationName, droll + 1);
          totals[locationName][GATHER_STRONG] += dataStrong[1];
          totals[locationName][GRAIN_STRONG] += dataStrong[2];
        }
      }
    }
  }
  let response = '216 totals:';
  for (const locationName in totals) {
    response +=
      '\n' +
      locationName +
      '      food:\t' +
      totals[locationName][GATHER] +
      '\t   grain:\t' +
      totals[locationName][GRAIN] +
      '\tstrong.f:\t' +
      totals[locationName][GATHER_STRONG] +
      '\tstrong.g:\t' +
      totals[locationName][GRAIN_STRONG] +
      '\t    hunt:\t' +
      totals[locationName][HUNT] +
      '\t   spear:\t' +
      totals[locationName][SPEAR];
  }
  totals = {
    veldt: [0, 0, 0, 0, 0, 0],
    hills: [0, 0, 0, 0, 0, 0],
    marsh: [0, 0, 0, 0, 0, 0],
    forest: [0, 0, 0, 0, 0, 0],
  };
  const MAX = 6000;
  for (let i = 0; i < MAX; i++) {
    let val = dice.roll(3);
    if (val > locationDecay[gameTrack]) {
      val = locationDecay[gameTrack];
    }
    for (const locationName in totals) {
      const locationData = locations[locationName];
      const data = gatherDataFor(locationName, val);
      totals[locationName][GATHER] += data[1];
      totals[locationName][GRAIN] += data[2];
      totals[locationName][HUNT] += huntDataFor(locationData['hunt'], val)[1];
      let sval = val;
      if (val >= 9) {
        sval = val + 3;
      }
      const foo = huntDataFor(locationData['hunt'], sval);
      totals[locationName][SPEAR] += foo[1];
      const dataStrong = gatherDataFor(locationName, val + 1);
      totals[locationName][GATHER_STRONG] += dataStrong[1];
      totals[locationName][GRAIN_STRONG] += dataStrong[2];
    }
  }
  response = MAX + 'x Random avg:';
  for (const locationName in totals) {
    response +=
      '\n' +
      locationName +
      '      food:' +
      Math.round((10 * totals[locationName][GATHER]) / MAX) +
      '\t   grain:' +
      Math.round((10 * totals[locationName][GRAIN]) / MAX) +
      '\tstrong f:' +
      Math.round((10 * totals[locationName][GATHER_STRONG]) / MAX) +
      '\tstrong g:' +
      Math.round((10 * totals[locationName][GRAIN_STRONG]) / MAX) +
      '\t    hunt:' +
      Math.round((10 * totals[locationName][HUNT]) / MAX) +
      '\t   spear:' +
      Math.round((10 * totals[locationName][SPEAR]) / MAX);
  }
  return response;
}
module.exports.getScoutNerd = scoutNerd;

function gatherDataFor(locationName, roll) {
  const resourceData = locations[locationName]['gather'];
  const maxRoll = resourceData[resourceData.length - 1][0];
  const minRoll = resourceData[0][0];
  if (roll > maxRoll) {
    roll = maxRoll;
  }
  if (roll < minRoll) {
    roll = minRoll;
  }
  for (var i = 0; i < resourceData.length; i++) {
    if (resourceData[i][0] == roll) {
      return resourceData[i];
    }
  }
  console.log('error looking up resourceData for ' + locationName + ' ' + roll);
}
