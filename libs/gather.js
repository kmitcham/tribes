const locations = require('./locations.json');
const dice = require('./dice.js');
const text = require('./textprocess.js');
const career = require('./career.js');

//module.exports.hunt = (playername, player, rollValue, gameState) =>{
//    function gather(playername, player, rollValue,gameState){
module.exports.gather = (playername, player, rollValue, gameState) => {
  var message = playername + ' gathers [roll ' + rollValue + ']';
  var netRoll = rollValue;
  let modifier = 0;
  let guardCount;
  if (gameState.seasonCounter % 2 == 0) {
    message += ' (-3 season)';
    modifier -= 3;
  }

  if (!('profession' in player) || !player.profession.startsWith('g')) {
    message += ' (-3 skill)';
    modifier -= 3;
  }
  if (player.guarding) {
    guardCount = player.guarding.length;
    if (guardCount == 3) {
      message += ' (-2 kids)';
      modifier -= 2;
    }
    if (guardCount == 4) {
      message += ' (-4 kids)';
      modifier -= 4;
    }
    if (guardCount > 4) {
      return message + ' is guarding too many children to gather.';
    }
  }
  if (player.strength) {
    if (player.strength.toLowerCase() == 'strong'.valueOf()) {
      message += ' (+1 strong)';
      modifier += 1;
    } else if (player.strength.toLowerCase() == 'weak'.valueOf()) {
      message += ' (-1 weak)';
      modifier -= 1;
    }
  }
  netRoll = rollValue + modifier;
  console.log(
    'gather roll:' + rollValue + ' mod:' + modifier + ' net:' + netRoll
  );
  const gatherData = locations[gameState.currentLocationName]['gather'];
  var get_message = '';
  var getFood = 0;
  var getGrain = 0;
  for (var i = 0; i < gatherData.length; i++) {
    if (netRoll < gatherData[0][0]) {
      get_message =
        gatherData[0][3] + ' (' + (gatherData[0][1] + gatherData[0][2] + ')');
      getFood = gatherData[0][1];
      getGrain = gatherData[0][2];
      break;
    } else if (netRoll == gatherData[i][0]) {
      getFood = gatherData[i][1];
      getGrain = gatherData[i][2];
      get_message =
        gatherData[i][3] + ' (' + (gatherData[i][1] + gatherData[i][2] + ')');
      break;
    } else {
      getFood = gatherData[i][1];
      getGrain = gatherData[i][2];
      get_message =
        gatherData[i][3] + ' (' + (gatherData[i][1] + gatherData[i][2] + ')');
    }
  }
  const gatherIcon = gatherResultIcon(get_message);
  message += (gatherIcon ? ' ' + gatherIcon : '') + get_message;
  player.food += getFood;
  player.grain += getGrain;
  gameState.foodAcquired += getFood + getGrain;
  career.addFoodProduced(player, getFood + getGrain);
  if (player.basket > 0) {
    var broll = dice.roll(3) + modifier;
    message += ' basket: [roll ' + broll + '] ';
    netRoll = broll + modifier;
    console.log('modified basket roll ' + netRoll);
    for (let i = 0; i < gatherData.length; i++) {
      if (netRoll < gatherData[0][0]) {
        get_message =
          gatherData[0][3] + ' (' + (gatherData[0][1] + gatherData[0][2] + ')');
        getFood = gatherData[0][1];
        getGrain = gatherData[0][2];
        break;
      } else if (netRoll == gatherData[i][0]) {
        getFood = gatherData[i][1];
        getGrain = gatherData[i][2];
        get_message =
          gatherData[i][3] + ' (' + (gatherData[i][1] + gatherData[i][2] + ')');
        break;
      } else {
        getFood = gatherData[i][1];
        getGrain = gatherData[i][2];
        get_message =
          gatherData[i][3] + ' (' + (gatherData[i][1] + gatherData[i][2] + ')');
      }
    }
    const basketIcon = gatherResultIcon(get_message);
    message += (basketIcon ? basketIcon + ' ' : '') + get_message;
    player.food += getFood;
    player.grain += getGrain;
    gameState.foodAcquired += getFood + getGrain;
    career.addFoodProduced(player, getFood + getGrain);
    // check for basket loss
    if (dice.roll(1) <= 2) {
      message += '💥 basket breaks.';
      player.basket -= 1;
    }
  }
  player.activity = 'gathered';
  player.worked = true;
  text.addMessage(gameState, 'tribe', message);
  return message;
};

function gatherResultIcon(resultText) {
  const normalized = String(resultText || '').toLowerCase();
  if (normalized.includes('grain')) {
    return '🌾';
  }
  if (
    normalized.includes('roots') ||
    normalized.includes('tubers') ||
    normalized.includes('yams') ||
    normalized.includes('carrots') ||
    normalized.includes('onions')
  ) {
    return '🥕';
  }
  if (normalized.includes('mushroom')) {
    return '🍄';
  }
  if (normalized.includes('berries') || normalized.includes('fruit')) {
    return '🫐';
  }
  if (normalized.includes('nuts') || normalized.includes('walnuts') || normalized.includes('hazelnuts')) {
    return '🌰';
  }
  if (normalized.includes('grubs')) {
    return '🐛';
  }
  if (normalized.includes('eggs')) {
    return '🥚';
  }
  if (normalized.includes('vegetables')) {
    return '🌿';
  }
  // eggs already handled above (e.g. turtle eggs → 🥚)
  if (normalized.includes('turtles')) {
    return '🐢';
  }
  if (normalized.includes('clams')) {
    return '🐚';
  }
  return '';
}
