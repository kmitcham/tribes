const killlib = require('./kill.js');
const dice = require('./dice.js');
const text = require('./textprocess.js');
const career = require('./career.js');

const childSurvivalChance = [
  8,
  8,
  8,
  8,
  9,
  9,
  10,
  10,
  10,
  11, // 4 years
  11,
  11,
  12,
  12,
  13,
  13,
  13,
  14,
  14,
  14, // 9 years
  15,
  15,
  16,
  16,
  17,
  20,
]; // the 20 is to cover aging out?  Not sure why it fails.

module.exports.scoreTribe = scoreTribe;
function scoreTribe(gameState) {
  const population = gameState.population;
  const banished = gameState.banished;
  const deadAdults = countDeadAdults(gameState);
  let banishCount = 0;
  if (banished != null) {
    banishCount = Object.keys(banished).length;
  }
  const initialPlayers =
    Object.keys(population).length + banishCount + deadAdults;
  const tribeTotal =
    Object.keys(population).length + Object.keys(gameState.children).length;
  let tribeResult = 'Unsuccessful';
  if (tribeTotal < 2 * initialPlayers) {
    tribeResult = 'Marginally successful';
  } else if (tribeTotal < 3 * initialPlayers) {
    tribeResult = 'Successful';
  } else {
    tribeResult = 'Very successful';
  }
  gameState.tribeResult = tribeResult;
  return tribeResult;
}

module.exports.endGame = endGame;
function endGame(gameState, _bot) {
  let adultCount = 0;
  let newAdultCount = 0;
  let population = gameState.population;
  let deadAdults = countDeadAdults(gameState);
  let banishCount = 0;
  if (gameState.banished != null) {
    banishCount = Object.keys(gameState.banished).length;
  }
  if (gameState.ended) {
    text.addMessage(gameState, 'tribe', 'The game has ended already.');
    return;
  }

  const responseLines = ['### --- GAME OVER --- ###'];
  const children = gameState.children || {};

  if (children) {
    responseLines.push('');
    responseLines.push('👶 The fate of the children:');
    gameState.secretMating = false;
    gameState.gameOver = true;

    for (const childName in children) {
      const child = children[childName];
      console.log(
        'end game scoring for ' +
          childName +
          ' ' +
          child.newAdult +
          ' ' +
          Number(child.age) +
          2
      );

      if (!child.newAdult) {
        const roll = dice.roll(3);
        const survivalTarget = childSurvivalChance[Number(child.age) + 2];

        if (roll <= childSurvivalChance[Number(child.age) + 2]) {
          child.newAdult = true;
          responseLines.push(
            '- ' +
              childName +
              ' [' +
              roll +
              ' vs ' +
              survivalTarget +
              '] grows up ✅'
          );
        } else {
          responseLines.push(
            '- ' +
              childName +
              ' [' +
              roll +
              ' vs ' +
              survivalTarget +
              '] dies young 💀'
          );
          killlib.kill(childName, 'endgame scoring', gameState);
        }
      } else {
        responseLines.push('- ' + childName + ' is already an adult ✅');
      }

      if (child.newAdult) {
        adultCount++;
        newAdultCount++;
      }
    }
  }

  adultCount += Object.keys(population).length;

  responseLines.push('');
  responseLines.push(
    '📉 Losses: ' + deadAdults + ' dead, ' + banishCount + ' banished.'
  );
  responseLines.push(
    '🧑‍🤝‍🧑 Surviving adults: ' + adultCount + ' (' + newAdultCount + ' new adults)'
  );
  responseLines.push(
    '🍖 Food acquired: ' +
      (gameState.foodAcquired == null ? 0 : gameState.foodAcquired)
  );
  responseLines.push(
    '🪰 Food spoiled: at least ' +
      (gameState.spoiled == null ? 0 : gameState.spoiled)
  );
  responseLines.push('🏕️ Tribe result: ' + scoreTribe(gameState));

  const response = responseLines.join('\n');
  gameState.ended = true;
  text.addMessage(gameState, 'tribe', response);
  const childrenMessage = scoreChildrenMessage(gameState);
  text.addMessage(gameState, 'tribe', childrenMessage);

  // Persist career summaries after child scoring so parent/grow-up counts match.
  try {
    career.recordEndedGame(gameState);
    const blurbs = career.buildEndgameLifetimeBlurbs(gameState);
    for (const blurb of blurbs) {
      text.addMessage(gameState, blurb.playerName, blurb.message);
    }
  } catch (err) {
    console.error('endGame: failed to record career stats', err);
  }

  return response;
}

module.exports.scoreMessage = scoreMessage;
function scoreMessage(gameState, _bot) {
  const tribeResult = scoreTribe(gameState);
  const messageText =
    '### ---> Score for the tribe: ' +
    tribeResult +
    ' <--- ###\n\n' +
    scoreChildrenMessage(gameState);
  return messageText;
}

function normalizeGender(gender) {
  if (gender == null) {
    return '?';
  }
  const normalized = String(gender).toLowerCase();
  if (normalized.startsWith('f')) {
    return 'f';
  }
  if (normalized.startsWith('m')) {
    return 'm';
  }
  return '?';
}

function genderIcon(genderCode) {
  if (genderCode === 'f') {
    return '♀️';
  }
  if (genderCode === 'm') {
    return '♂️';
  }
  return '⚪';
}

function isChildRecord(record) {
  return (
    !!record &&
    typeof record === 'object' &&
    'age' in record &&
    !('profession' in record)
  );
}

function isAdultRecord(record) {
  if (!record || typeof record !== 'object') {
    return false;
  }
  if ('profession' in record) {
    return true;
  }
  if ('age' in record) {
    return false;
  }
  return true;
}

function findInDictionaryByName(name, dictionary) {
  if (!dictionary || !name) {
    return null;
  }
  const target = String(name).toLowerCase();
  for (const key in dictionary) {
    const record = dictionary[key] || {};
    const candidateName = (record.name || key || '').toString().toLowerCase();
    if (key.toString().toLowerCase() === target || candidateName === target) {
      return { key: key, record: record };
    }
  }
  return null;
}

function determineAdultStatus(name, gameState) {
  const inPopulation = findInDictionaryByName(name, gameState.population);
  if (inPopulation) {
    return {
      status: 'living',
      record: inPopulation.record,
      key: inPopulation.key,
    };
  }
  const inBanished = findInDictionaryByName(name, gameState.banished);
  if (inBanished) {
    return {
      status: 'banished',
      record: inBanished.record,
      key: inBanished.key,
    };
  }
  const inGraveyard = findInDictionaryByName(name, gameState.graveyard);
  if (inGraveyard) {
    return { status: 'dead', record: inGraveyard.record, key: inGraveyard.key };
  }
  return { status: 'unknown', record: null, key: name };
}

function statusIcon(status) {
  if (status === 'living') {
    return '🟢';
  }
  if (status === 'banished') {
    return '🚫';
  }
  if (status === 'dead') {
    return '🪦';
  }
  return '❔';
}

function scoreIcon(score) {
  if (score >= 8) {
    return '🏆';
  }
  if (score >= 5) {
    return '🌟';
  }
  if (score >= 1) {
    return '✨';
  }
  return '🌱';
}

function addAdultNamesFromDictionary(dictionary, includeRecordCheck, target) {
  if (!dictionary) {
    return;
  }
  for (const key in dictionary) {
    const record = dictionary[key] || {};
    if (includeRecordCheck && !isAdultRecord(record)) {
      continue;
    }
    const name = record.name || key;
    if (name) {
      target.add(name);
    }
  }
}

function buildParentRows(gameState, children) {
  const adultNames = new Set();
  addAdultNamesFromDictionary(gameState.population, false, adultNames);
  addAdultNamesFromDictionary(gameState.banished, false, adultNames);
  addAdultNamesFromDictionary(gameState.graveyard, true, adultNames);

  const rowsByLowerName = {};

  function ensureRow(parentName) {
    if (!parentName) {
      return null;
    }
    const lookup = determineAdultStatus(parentName, gameState);
    const displayName =
      (lookup.record && lookup.record.name) || lookup.key || parentName;
    const key = String(displayName).toLowerCase();

    if (!rowsByLowerName[key]) {
      rowsByLowerName[key] = {
        name: displayName,
        gender: normalizeGender(lookup.record && lookup.record.gender),
        score: 0,
        status: lookup.status,
      };
    }
    return rowsByLowerName[key];
  }

  adultNames.forEach((adultName) => {
    ensureRow(adultName);
  });

  for (const childName in children) {
    const child = children[childName] || {};
    const motherRow = ensureRow(child.mother);
    if (motherRow) {
      motherRow.score++;
    }
    const fatherRow = ensureRow(child.father);
    if (fatherRow) {
      fatherRow.score++;
    }
  }

  return Object.values(rowsByLowerName).sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
}

function buildChildOutcomeRows(gameState) {
  const rowsByLowerName = {};
  const children = gameState.children || {};
  const graveyard = gameState.graveyard || {};

  function setRow(name, rowData) {
    if (!name) {
      return;
    }
    const key = String(name).toLowerCase();
    rowsByLowerName[key] = Object.assign(
      {},
      rowsByLowerName[key] || {},
      rowData
    );
  }

  for (const childKey in children) {
    const child = children[childKey] || {};
    const childName = child.name || childKey;
    const childStatus = child.newAdult ? 'grew up' : 'still a child';
    setRow(childName, {
      name: childName,
      gender: normalizeGender(child.gender),
      mother: child.mother || '?',
      father: child.father || '?',
      status: childStatus,
      statusIcon: child.newAdult ? '✅' : '🧒',
    });
  }

  for (const graveKey in graveyard) {
    const member = graveyard[graveKey] || {};
    if (!isChildRecord(member)) {
      continue;
    }
    const childName = member.name || graveKey;
    setRow(childName, {
      name: childName,
      gender: normalizeGender(member.gender),
      mother: member.mother || '?',
      father: member.father || '?',
      status: 'dead',
      statusIcon: '💀',
    });
  }

  return Object.values(rowsByLowerName).sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  );
}

module.exports.scoreChildrenMessage = scoreChildrenMessage;
function scoreChildrenMessage(gameState) {
  const children = gameState.children || {};
  const childRows = buildChildOutcomeRows(gameState);
  const parentRows = buildParentRows(gameState, children);

  if (childRows.length === 0) {
    return '👶 No children were found, so all individual scores are zero.';
  }

  const lines = [];
  lines.push('👶 Final children list (parentage + status):');
  childRows.forEach((row) => {
    lines.push(
      '- ' +
        row.name +
        ' ' +
        genderIcon(row.gender) +
        ' (' +
        row.gender +
        ') — mother: ' +
        row.mother +
        ', father: ' +
        row.father +
        ' • ' +
        row.statusIcon +
        ' ' +
        row.status
    );
  });

  lines.push('');
  lines.push('👨‍👩‍👧‍👦 Parent scores (women and men sorted together):');
  parentRows.forEach((row) => {
    lines.push(
      '- ' +
        scoreIcon(row.score) +
        ' ' +
        row.name +
        ' ' +
        genderIcon(row.gender) +
        ' (' +
        row.gender +
        ') — ' +
        row.score +
        ' child' +
        (row.score === 1 ? '' : 'ren') +
        ' • ' +
        statusIcon(row.status) +
        ' ' +
        row.status
    );
  });

  return lines.join('\n');
}

module.exports.countDeadAdults = countDeadAdults;
function countDeadAdults(gameState) {
  const graveyard = gameState.graveyard;
  let deadAdults = 0;
  for (const entryName in graveyard) {
    const member = graveyard[entryName];
    if ('profession' in member) {
      deadAdults++;
    } else if ('age' in member) {
      // skip the children
    } else {
      console.log('Surprise name in graveyard:' + entryName);
    }
  }
  return deadAdults;
}
