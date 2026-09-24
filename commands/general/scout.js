'use strict';

const { SlashCommandBuilder } = require('../../libs/command-builders.js');
const huntlib = require('../../libs/hunt.js');
const worklib = require('../../libs/work.js');
const text = require('../../libs/textprocess.js');
const dice = require('../../libs/dice.js');
const locations = require('../../libs/locations.json');
const pop = require('../../libs/population.js');
const logger = require('../../libs/logger.js');

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
          'Your expected yields here (game track, profession, strength; ±basket/spear)'
        )
        .addChoices(
          {
            name: 'all — your exact expected yields (216 rolls), uses game track',
            value: 'all',
          },
          {
            name: 'actual — your simulated averages (many rolls), uses game track',
            value: 'actual',
          }
        )
        .setRequired(false)
    ),
  async execute(interaction, gameState) {
    onCommand(interaction, gameState);
  },
};

function normalizeLocation(raw) {
  if (!raw) {
    return null;
  }
  const targetLocation = String(raw);
  if (targetLocation.toLowerCase().startsWith('v')) {
    return 'veldt';
  }
  if (targetLocation.toLowerCase().startsWith('f')) {
    return 'forest';
  }
  if (targetLocation.toLowerCase().startsWith('m')) {
    return 'marsh';
  }
  if (targetLocation.toLowerCase().startsWith('h')) {
    return 'hills';
  }
  if (targetLocation.toLowerCase().startsWith('o')) {
    return 'overview';
  }
  return null;
}

function onCommand(interaction, gameState) {
  var displayName = interaction.member.displayName;
  var nerdOption = interaction.options.getString('nerd');
  var selectedLocation = interaction.options.getString('location');

  let targetLocation =
    gameState.currentLocationName || gameState.locationName || null;

  if (selectedLocation) {
    targetLocation = normalizeLocation(selectedLocation);
    if (!targetLocation) {
      text.addMessage(
        gameState,
        displayName,
        'No such location as ' +
          selectedLocation +
          ' Legal locations: veldt,forest,marsh,hills,overview'
      );
      return;
    }
  }

  if (!targetLocation) {
    text.addMessage(
      gameState,
      displayName,
      'No current location set. Pass location=veldt|forest|marsh|hills|overview.'
    );
    return;
  }

  logger.accessLog.info(
    'scouting.  location:' + targetLocation + ' nerdOption:' + nerdOption
  );

  const player = pop.memberByName(displayName, gameState);

  if (targetLocation === 'overview') {
    let response = formatOverview(gameState);
    if (nerdOption) {
      if (!player) {
        response +=
          '\n\nNerd mode needs you in the tribe (profession/strength).';
      } else {
        response +=
          '\n\nNerd mode for overview (your mods; each area\'s own game track):\n';
        for (const locationName of Object.keys(locations)) {
          response +=
            '\n' +
            getNerdData(locationName, nerdOption, gameState, player) +
            '\n';
        }
      }
    }
    text.addMessage(gameState, displayName, response);
    return;
  }

  let response = huntlib.getScoutMessage(targetLocation, gameState);
  if (nerdOption) {
    if (!player) {
      response +=
        '\n\nNerd mode needs you in the tribe so profession and strength apply.';
    } else {
      response +=
        '\n' + getNerdData(targetLocation, nerdOption, gameState, player);
    }
  }
  text.addMessage(gameState, displayName, response);
}

function formatOverview(gameState) {
  const lines = ['Game tracks by area:'];
  for (const locationName of Object.keys(locations)) {
    const track = gameState.gameTrack
      ? gameState.gameTrack[locationName]
      : '?';
    lines.push('  ' + locationName + ': track ' + track);
  }
  return lines.join('\n');
}

function isColdSeason(gameState) {
  return Number(gameState.seasonCounter) % 2 === 0;
}

function playerContext(player, gameState) {
  const profession = String((player && player.profession) || '').toLowerCase();
  const strength = String((player && player.strength) || '').toLowerCase();
  const coldSeason = isColdSeason(gameState);
  const isGatherer = profession.startsWith('g');
  const isHunter = profession.startsWith('h');

  let strengthMod = 0;
  let strengthLabel = 'average';
  if (strength === 'strong') {
    strengthMod = 1;
    strengthLabel = 'strong';
  } else if (strength === 'weak') {
    strengthMod = -1;
    strengthLabel = 'weak';
  }

  let guardMod = 0;
  let guardLabel = 'none';
  const guardCount = player && player.guarding ? player.guarding.length : 0;
  if (guardCount === 3) {
    guardMod = -2;
    guardLabel = '3 kids (-2 gather)';
  } else if (guardCount === 4) {
    guardMod = -4;
    guardLabel = '4 kids (-4 gather)';
  } else if (guardCount > 0) {
    guardLabel = guardCount + ' kids (no gather penalty)';
  }

  return {
    name: (player && player.name) || 'you',
    profession: profession || 'none',
    isGatherer: isGatherer,
    isHunter: isHunter,
    strengthMod: strengthMod,
    strengthLabel: strengthLabel,
    coldSeason: coldSeason,
    seasonLabel: coldSeason ? 'cold season' : 'warm season',
    guardMod: guardMod,
    guardLabel: guardLabel,
  };
}

function clampHuntRoll(netRoll, gameTrack) {
  let roll = Number(netRoll);
  const track = Number(gameTrack) || 0;
  const cap = huntlib.locationDecay[track];
  if (Number.isFinite(cap) && roll > cap) {
    roll = cap;
  }
  if (roll > 18) {
    roll = 18;
  }
  return roll;
}

/** Single gather attempt with the player's current gather modifiers. */
function gatherYieldOnce(locationName, rawRoll, ctx) {
  let net = Number(rawRoll);
  if (ctx.coldSeason) {
    net -= 3;
  }
  if (!ctx.isGatherer) {
    net -= 3;
  }
  net += ctx.strengthMod;
  net += ctx.guardMod;
  const data = worklib.gatherDataFor(locationName, net);
  if (!data) {
    return { food: 0, grain: 0 };
  }
  return { food: Number(data[1]) || 0, grain: Number(data[2]) || 0 };
}

/**
 * Hunt with the player's current hunt modifiers.
 * withSpear: apply +3 when raw roll >= 9 (same as hunt.js).
 */
function huntYieldOnce(locationName, rawRoll, ctx, withSpear, gameTrack) {
  let modifier = ctx.strengthMod;
  if (ctx.coldSeason) {
    modifier -= 1;
  }
  if (!ctx.isHunter) {
    modifier -= 3;
  }
  if (withSpear && Number(rawRoll) >= 9) {
    modifier += 3;
  }
  const net = clampHuntRoll(Number(rawRoll) + modifier, gameTrack);
  const row = huntlib.huntDataFor(locations[locationName]['hunt'], net);
  return { food: row && row[1] ? Number(row[1]) || 0 : 0, grain: 0 };
}

function emptyTotals() {
  return {
    gatherNoBasket: { food: 0, grain: 0 },
    gatherBasket: { food: 0, grain: 0 },
    huntNoSpear: { food: 0, grain: 0 },
    huntSpear: { food: 0, grain: 0 },
  };
}

function addYield(bucket, yieldValue) {
  bucket.food += yieldValue.food;
  bucket.grain += yieldValue.grain;
}

/**
 * For exact EV (all 216): basket is a second independent gather with the same
 * modifiers, so E[with basket] = 2 * E[without]. We accumulate one gather and
 * double for the basket column.
 * For Monte Carlo (actual): roll a second die for the basket leg.
 */
function accumulateForRoll(totals, locationName, rawRoll, gameTrack, ctx, mode) {
  const once = gatherYieldOnce(locationName, rawRoll, ctx);
  addYield(totals.gatherNoBasket, once);

  if (mode === 'actual') {
    const basketRoll = dice.roll(3);
    const second = gatherYieldOnce(locationName, basketRoll, ctx);
    addYield(totals.gatherBasket, once);
    addYield(totals.gatherBasket, second);
  } else {
    // exact: two iid gathers ⇒ double
    addYield(totals.gatherBasket, once);
    addYield(totals.gatherBasket, once);
  }

  addYield(
    totals.huntNoSpear,
    huntYieldOnce(locationName, rawRoll, ctx, false, gameTrack)
  );
  addYield(
    totals.huntSpear,
    huntYieldOnce(locationName, rawRoll, ctx, true, gameTrack)
  );
}

function pad(str, width) {
  const s = String(str);
  if (s.length >= width) {
    return s;
  }
  return s + ' '.repeat(width - s.length);
}

function formatYieldCell(food, grain, samples) {
  const f = Math.round((food / samples) * 100) / 100;
  const g = Math.round((grain / samples) * 100) / 100;
  return f + 'f / ' + g + 'g';
}

function formatNerdTable(locationName, totals, samples, meta) {
  const rows = [
    ['gather (no basket)', totals.gatherNoBasket],
    ['gather (with basket)', totals.gatherBasket],
    ['hunt (no spear)', totals.huntNoSpear],
    ['hunt (with spear)', totals.huntSpear],
  ];

  const colCond = 22;
  const colYield = 16;
  let out = '';
  out +=
    'Nerd scout for ' +
    meta.playerName +
    ' — ' +
    locationName +
    ' (game track ' +
    meta.gameTrack +
    ', ' +
    meta.seasonLabel +
    ')\n';
  out +=
    'You: profession=' +
    meta.profession +
    ', strength=' +
    meta.strengthLabel +
    ', guarding=' +
    meta.guardLabel +
    '\n';
  out +=
    'Uses your skill/strength/season mods; hunting capped by this area\'s game track.\n';
  out += meta.methodLine + '\n';
  out +=
    pad('Condition', colCond) +
    ' | ' +
    pad('Expected food/grain', colYield) +
    '\n';
  out += '-'.repeat(colCond) + '-+-' + '-'.repeat(colYield) + '\n';
  for (const [label, bucket] of rows) {
    out +=
      pad(label, colCond) +
      ' | ' +
      formatYieldCell(bucket.food, bucket.grain, samples) +
      '\n';
  }
  return out.trimEnd();
}

/**
 * Expected yields for the current player in one area.
 * @param {'all'|'actual'} nerdOption
 */
function getNerdData(locationName, nerdOption, gameState, player) {
  const gameTrack = gameState.gameTrack
    ? Number(gameState.gameTrack[locationName]) || 0
    : 0;
  const ctx = playerContext(player, gameState);
  const totals = emptyTotals();

  let samples = 0;
  let methodLine = '';
  const mode = nerdOption === 'all' ? 'all' : 'actual';

  if (mode === 'all') {
    samples = 216;
    methodLine =
      'Exact expected yield over all 216 outcomes of 3d6 (game track ' +
      gameTrack +
      '). Basket column = two gathers.';
    for (var i = 1; i <= 6; i++) {
      for (var j = 1; j <= 6; j++) {
        for (var k = 1; k <= 6; k++) {
          accumulateForRoll(
            totals,
            locationName,
            i + j + k,
            gameTrack,
            ctx,
            'all'
          );
        }
      }
    }
  } else {
    samples = 6000;
    methodLine =
      'Average after ' +
      samples +
      ' simulated 3d6 rolls (game track ' +
      gameTrack +
      '). Basket rolls a second gather.';
    for (let n = 0; n < samples; n++) {
      accumulateForRoll(
        totals,
        locationName,
        dice.roll(3),
        gameTrack,
        ctx,
        'actual'
      );
    }
  }

  return formatNerdTable(locationName, totals, samples, {
    gameTrack: gameTrack,
    seasonLabel: ctx.seasonLabel,
    methodLine: methodLine,
    playerName: ctx.name,
    profession: ctx.profession || 'none',
    strengthLabel: ctx.strengthLabel,
    guardLabel: ctx.guardLabel,
  });
}

module.exports.getNerdData = getNerdData;
module.exports._test = {
  gatherYieldOnce,
  huntYieldOnce,
  playerContext,
  clampHuntRoll,
  normalizeLocation,
};
