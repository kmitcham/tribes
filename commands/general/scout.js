const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require('../../libs/command-builders.js');
const huntlib = require('../../libs/hunt.js');
const text = require('../../libs/textprocess.js');
const dice = require('../../libs/dice.js');
const locations = require('../../libs/locations.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('scout')
    .setDescription(
      'Show the resources of an environment, defaulting to the current one.'
    )
    .addStringOption((option) =>
      option
        .setName('location')
        .setDescription('one of (veldt,forest,marsh,hills,overview)')
        .addChoices(
          { name: 'veldt', value: 'veldt' },
          { name: 'forest', value: 'forest' },
          { name: 'marsh', value: 'marsh' },
          { name: 'hills', value: 'hills' },
          { name: 'overview', value: 'overview' }
        )
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('nerd')
        .setDescription(
          'precise avg results, of all possible rolls, or many actual rolls'
        )
        .addChoices(
          { name: 'all', value: 'all' },
          { name: 'actual', value: 'actual' }
        )
        .setRequired(false)
    ),
  async execute(interaction, gameState) {
    onCommand(interaction, gameState);
  },
};

function onCommand(interaction, gameState) {
  let targetLocation = gameState.locationName;
  var displayName = interaction.member.displayName;
  var nerdOption = interaction.options.getString('nerd');
  var selectedLocation = interaction.options.getString('location');
  if (selectedLocation) {
    targetLocation = selectedLocation;
    if (targetLocation.toLowerCase().startsWith('v')) {
      targetLocation = 'veldt';
    } else if (targetLocation.toLowerCase().startsWith('f')) {
      targetLocation = 'forest';
    } else if (targetLocation.toLowerCase().startsWith('m')) {
      targetLocation = 'marsh';
    } else if (targetLocation.toLowerCase().startsWith('h')) {
      targetLocation = 'hills';
    } else if (targetLocation.toLowerCase().startsWith('o')) {
      targetLocation = 'overview';
    } else {
      text.addMessage(
        gameState,
        displayName,
        'No such location as ' +
          targetLocation +
          ' Legal locations: veldt,forest,marsh,hills,overview'
      );
      return;
    }
  }
  console.log(
    'scouting.  location:' + targetLocation + ' nerdOption:' + nerdOption
  );

  if (targetLocation === 'overview') {
    text.addMessage(gameState, displayName, JSON.stringify(getOverviewData(gameState)));
    return;
  }

  let response = huntlib.getScoutMessage(targetLocation, gameState);
  if (nerdOption) {
    const gameTrackValue = gameState.gameTrack[targetLocation];
    response += getNerdData(gameTrackValue, nerdOption);
  }
  text.addMessage(gameState, displayName, response);
  return;
}

function getOverviewData(gameState) {
  const overview = {};
  for (const locationName in locations) {
    overview[locationName] = gameState.gameTrack[locationName];
  }
  return overview;
}

function getNerdData(gameTrackValue, nerdOption) {
  var gameTrack = 0;
  if (gameTrackValue) {
    gameTrack = Number(gameTrackValue);
  }
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
        if (droll > huntlib.locationDecay[gameTrack]) {
          droll = huntlib.locationDecay[gameTrack];
        }
        for (const locationName in totals) {
          const locationData = locations[locationName];
          const data = gatherDataFor(locationName, droll);
          totals[locationName][GATHER] += data[1];
          totals[locationName][GRAIN] += data[2];
          totals[locationName][HUNT] += huntlib.huntDataFor(
            locationData['hunt'],
            droll
          )[1];
          let sval = droll;
          if (droll >= 9) {
            sval = droll + 3;
          }
          totals[locationName][SPEAR] += huntlib.huntDataFor(
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
  let response = 'Nerd Values\n';
  if (nerdOption === 'all') {
    response = 'Sum of all 216 possible die rolls:';
    for (const locationName in totals) {
      response +=
        '\n' +
        locationName +
        ' food: ' +
        totals[locationName][GATHER] +
        '\tgrain: ' +
        totals[locationName][GRAIN] +
        '\tstrong  food:' +
        totals[locationName][GATHER_STRONG] +
        '\tstrong grain:' +
        totals[locationName][GRAIN_STRONG] +
        '\thunt: ' +
        totals[locationName][HUNT] +
        '\thunt with spear: ' +
        totals[locationName][SPEAR];
    }
  } else {
    const MAX = 6000;
    for (var i = 0; i < MAX; i++) {
      let val = dice.roll(3);
      if (val > huntlib.locationDecay[gameTrack]) {
        val = huntlib.locationDecay[gameTrack];
      }
      for (const locationName in totals) {
        const locationData = locations[locationName];
        const data = gatherDataFor(locationName, val);
        totals[locationName][GATHER] += data[1];
        totals[locationName][GRAIN] += data[2];
        totals[locationName][HUNT] += huntlib.huntDataFor(
          locationData['hunt'],
          val
        )[1];
        let sval = val;
        if (val >= 9) {
          sval = val + 3;
        }
        const foo = huntlib.huntDataFor(locationData['hunt'], sval);
        totals[locationName][SPEAR] += foo[1];
        const dataStrong = gatherDataFor(locationName, val + 1);
        totals[locationName][GATHER_STRONG] += dataStrong[1];
        totals[locationName][GRAIN_STRONG] += dataStrong[2];
      }
    }
    response = 'Average value after ' + MAX + ' rolls:';
    for (const locationName in totals) {
      response +=
        '\n' +
        locationName +
        '\t food:' +
        Math.round(totals[locationName][GATHER] / MAX) +
        '\t grain:' +
        Math.round(totals[locationName][GRAIN] / MAX) +
        '\t strong f:' +
        Math.round(totals[locationName][GATHER_STRONG] / MAX) +
        '\t strong g:' +
        Math.round(totals[locationName][GRAIN_STRONG] / MAX) +
        '\t hunt:' +
        Math.round(totals[locationName][HUNT] / MAX) +
        '\t hunt with spear:' +
        Math.round(totals[locationName][SPEAR] / MAX);
    }
  }
  return response;
}
// helper function for the nerdOption function
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
  console.log(
    'error looking up resourceData for ' +
      locationName +
      ' ' +
      type +
      ' ' +
      roll
  );
}
