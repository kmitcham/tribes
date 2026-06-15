const reproLib = require('./reproduction.js');

var referees = ['kevinmitcham', '@kevinmitcham'];
module.exports.referees = referees;

function getYear(gameState) {
  return gameState.seasonCounter / 2;
}
module.exports.getYear = getYear;

function isColdSeason(gameState) {
  return gameState.seasonCounter % 2 == 0;
}
module.exports.isColdSeason = isColdSeason;

function gameStateMessage(gameState) {
  var numAdults = Object.keys(gameState.population).length;
  var numKids = Object.keys(gameState.children).length;
  var message = 'Year ' + gameState.seasonCounter / 2 + ', ';
  let season = 'warm season.';
  if (gameState.seasonCounter % 2 == 0) {
    season = 'cold season.';
  }
  message += season + '\n';
  message +=
    'The ' +
    gameState.name +
    ' tribe has ' +
    numAdults +
    ' adults and ' +
    numKids +
    ' children\n';
  message +=
    'The ' +
    gameState.currentLocationName +
    ' game track is at ' +
    gameState.gameTrack[gameState.currentLocationName] +
    '\n';
  if (gameState.demand) {
    message += '\nThe DEMAND is:' + gameState.demand + '\n';
    //message+= violencelib.getFactionResult(gameState, bot)
  }
  if (gameState.violence) {
    message +=
      '\nVIOLENCE has erupted over this demand: ' + gameState.violence + '\n';
    //message+= violencelib.resolveViolence(gameState, bot)+'\n';
  }
  if (gameState.workRound) {
    message += '  (work round)';
  }
  if (gameState.foodRound) {
    message += '  (food round)';
  }
  if (gameState.reproductionRound) {
    const pendingInviteCount = reproLib.canStillInviteCount(gameState);
    if (pendingInviteCount > 0) {
      message +=
        ' (reproduction round: awaiting invitations or pass from ' +
        pendingInviteCount +
        ' player' +
        (pendingInviteCount === 1 ? '' : 's') +
        ')';
    } else if (gameState.needChanceRoll) {
      message += ' (reproduction round, awaiting chance)';
    } else {
      message += ' (reproduction round, awaiting migration or not.)';
    }
  } else {
    // if not the reproduction round
    message += '  You may update your invite/consent/decline lists.\n';
  }
  return message;
}
module.exports.gameStateMessage = gameStateMessage;

function countByType(dictionary, key, value) {
  let count = 0;
  for (const elementName in dictionary) {
    const element = dictionary[elementName];
    if (element[key] && element[key] == value) {
      count++;
    }
  }
  return count;
}
module.exports.countByType = countByType;
