const text = require('./textprocess.js');
const pop = require('./population.js');

const SUBJECT_KEYWORDS = {
  hunting: ['hunt', 'hunting', 'goes hunting'],
  gathering: ['gathers'],
  crafting: ['craft', 'crafts', 'creates something'],
  reproduction: [
    'reproduction',
    'mating',
    'pregnant',
    'birth',
    'blessed with a child',
  ],
  romance: [
    'invite',
    'invites',
    'invitation',
    'consent',
    'decline',
    'share good feelings',
  ],
  'your romance': [
    'invites you to share good feelings',
    'shares good feelings with you',
    'you share good feelings with',
    'flirts with you',
    'is impressed by your flirtation',
  ],
  childcare: ['feed', 'feeds', 'children', 'guard', 'guarding', 'nursing'],
  chance: ['chance'],
  migration: ['migrate', 'migrates', 'migration', 'route to', 'location'],
  combat: ['violence', 'attacks', 'combat', 'faction', 'demand', 'fight'],
  trade: [' gives ', ' gives', 'trade'],
  laws: ['your chief creates a new law'],
};

function getHistorySubjectChoices() {
  const keywordChoices = Object.keys(SUBJECT_KEYWORDS).map((key) => ({
    name: key,
    value: key,
  }));
  return [
    { name: 'all events', value: 'all' },
    { name: 'me (my name)', value: 'me' },
    ...keywordChoices,
  ];
}

function historyEntryMessage(entry) {
  if (typeof entry === 'string') {
    return entry;
  }
  if (entry && typeof entry === 'object' && typeof entry.message === 'string') {
    return entry.message;
  }
  return '';
}

function parseHistorySeason(message) {
  if (!message || typeof message !== 'string') {
    return null;
  }
  var match = message.match(/^\s*([0-9]+(?:\.[0-9]+)?)\s*:/);
  if (!match) {
    return null;
  }
  var season = Number(match[1]);
  return Number.isFinite(season) ? season : null;
}

// Special years_back sentinels used by the history command choices.
const LOOKBACK_CURRENT_SEASON = 0;
const LOOKBACK_PREVIOUS_SEASON = -1;

function normalizeYearsBack(yearsBack) {
  if (yearsBack === null || yearsBack === undefined || yearsBack === '') {
    return null;
  }
  var parsed = Number(yearsBack);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  // Allow 0 (current season) and -1 (previous season); reject other negatives.
  if (parsed < LOOKBACK_PREVIOUS_SEASON) {
    return null;
  }
  return parsed;
}

function sameSeasonStamp(left, right) {
  return Math.abs(left - right) < 0.0001;
}

function formatYearsBackLabel(yearsBack) {
  var years = normalizeYearsBack(yearsBack);
  if (years === LOOKBACK_CURRENT_SEASON) {
    return 'current season';
  }
  if (years === LOOKBACK_PREVIOUS_SEASON) {
    return 'previous season';
  }
  if (years === null) {
    return String(yearsBack);
  }
  return String(years);
}

function matchesYearsBack(message, gameState, yearsBack) {
  var years = normalizeYearsBack(yearsBack);
  if (years === null) {
    return true;
  }
  var currentSeason = Number(gameState && gameState.seasonCounter) / 2;
  if (!Number.isFinite(currentSeason)) {
    return true;
  }
  var season = parseHistorySeason(message);
  if (season === null) {
    return true;
  }
  if (years === LOOKBACK_CURRENT_SEASON) {
    return sameSeasonStamp(season, currentSeason);
  }
  if (years === LOOKBACK_PREVIOUS_SEASON) {
    return sameSeasonStamp(season, currentSeason - 0.5);
  }
  return season >= currentSeason - years;
}

function matchesSubject(message, subject, playerName) {
  var messageLower = String(message || '').toLowerCase();

  const isStartOfYearMessage =
    messageLower.includes('starting the work round') ||
    messageLower.includes('start work round');

  const hasFoodOrStarved =
    messageLower.includes('food') ||
    messageLower.includes('starved') ||
    messageLower.includes('round');

  if (isStartOfYearMessage) {
    return false;
  }

  if (!subject || subject === 'all') {
    return true;
  }

  var subjectLower = String(subject).toLowerCase();

  if (subjectLower === 'me') {
    return messageLower.includes(String(playerName || '').toLowerCase());
  }

  if (subjectLower === 'chance') {
    // Match explicit chance-stage entries, not incidental references like "After chance"
    return /\bchance\s+[0-9]+\s*:/.test(messageLower);
  }

  if (subjectLower === 'migration') {
    if (hasFoodOrStarved) {
      return false;
    }
    return (
      messageLower.includes('finding a route to') ||
      messageLower.includes('the tribe migrates to the') ||
      messageLower.includes('the following people died along the way') ||
      messageLower.includes('migration hunger')
    );
  }

  if (subjectLower === 'childcare') {
    if (hasFoodOrStarved) {
      return false;
    }
    return (
      messageLower.includes('feed') ||
      messageLower.includes('feeds') ||
      messageLower.includes('children') ||
      messageLower.includes('guard') ||
      messageLower.includes('guarding') ||
      messageLower.includes('nursing')
    );
  }

  if (subjectLower === 'reproduction') {
    if (hasFoodOrStarved) {
      return false;
    }
    return (
      messageLower.includes('reproduction') ||
      messageLower.includes('mating') ||
      messageLower.includes('pregnant') ||
      messageLower.includes('birth') ||
      messageLower.includes('blessed with a child')
    );
  }

  if (subjectLower === 'romance') {
    if (hasFoodOrStarved) {
      return false;
    }
    return (
      messageLower.includes('invite') ||
      messageLower.includes('invites') ||
      messageLower.includes('invitation') ||
      messageLower.includes('consent') ||
      messageLower.includes('decline') ||
      messageLower.includes('share good feelings')
    );
  }

  if (subjectLower === 'your romance') {
    if (hasFoodOrStarved) {
      return false;
    }
    return (
      messageLower.includes('invites you to share good feelings') ||
      messageLower.includes('shares good feelings with you') ||
      messageLower.includes('you share good feelings with') ||
      messageLower.includes('flirts with you') ||
      messageLower.includes('is impressed by your flirtation')
    );
  }

  if (subjectLower === 'give') {
    if (messageLower.includes('gives birth')) {
      return false;
    }
    return /\b(give|gives|gave|given)\b/.test(messageLower);
  }

  if (subjectLower === 'trade') {
    if (messageLower.includes('gives birth')) {
      return false;
    }
    return /\b(give|gives|gave|given|trade|trades|traded)\b/.test(messageLower);
  }

  if (subjectLower === 'laws') {
    return (
      messageLower.includes('the laws are:') ||
      messageLower.includes('your chief creates a new law')
    );
  }

  var keywordList = SUBJECT_KEYWORDS[subjectLower];
  if (keywordList && keywordList.length > 0) {
    return keywordList.some((keyword) => messageLower.includes(keyword));
  }

  return messageLower.includes(subjectLower);
}

function hasHistoryMembership(playerName, gameState) {
  var player = pop.memberByName(playerName, gameState);
  if (player) {
    return true;
  }
  return !!pop.deadOrBanishedByName(playerName, gameState);
}

function showCombinedHistory(playerName, gameState, subject, yearsBack) {
  if (!gameState) {
    console.warn('showCombinedHistory called with no gameState');
    text.addMessage(
      gameState,
      playerName,
      'No tribe in this channel.  Do you want to join and create one?'
    );
    return;
  }

  if (!hasHistoryMembership(playerName, gameState)) {
    text.addMessage(
      gameState,
      playerName,
      'You have no history with this tribe'
    );
    return;
  }

  var player = pop.memberByName(playerName, gameState);
  var personalHistory = player && player.history ? player.history : [];
  var tribeHistory = Array.isArray(gameState.tribeHistory)
    ? gameState.tribeHistory
    : [];
  var subjectLower = String(subject || '').toLowerCase();

  var hasSubjectOption = !!subject && String(subject).toLowerCase() !== 'all';
  var hasYearsOption =
    yearsBack !== undefined && yearsBack !== null && yearsBack !== '';
  if (hasSubjectOption || hasYearsOption) {
    var optionSummary = hasSubjectOption ? String(subject) : 'all';
    if (hasYearsOption) {
      optionSummary += ' years_back=' + formatYearsBackLabel(yearsBack);
    }
    text.addMessage(gameState, playerName, 'History:' + optionSummary);
  }

  var combined = [];
  for (const entry of personalHistory) {
    combined.push({ source: 'Your history', message: entry });
  }
  if (subjectLower !== 'your romance') {
    for (const entry of tribeHistory) {
      const entryMessage = historyEntryMessage(entry);
      if (!entryMessage) {
        continue;
      }
      combined.push({ source: 'Tribe history', message: entryMessage });
    }
  }

  var filtered = combined.filter(
    (entry) =>
      matchesYearsBack(entry.message, gameState, yearsBack) &&
      matchesSubject(entry.message, subject, playerName)
  );

  var deduped = [];
  var seenMessages = new Set();
  for (const entry of filtered) {
    if (seenMessages.has(entry.message)) {
      continue;
    }
    seenMessages.add(entry.message);
    deduped.push(entry);
  }

  deduped.sort((left, right) => {
    var leftSeason = parseHistorySeason(left.message);
    var rightSeason = parseHistorySeason(right.message);
    if (leftSeason === null && rightSeason === null) {
      return 0;
    }
    if (leftSeason === null) {
      return 1;
    }
    if (rightSeason === null) {
      return -1;
    }
    return leftSeason - rightSeason;
  });

  if (deduped.length === 0) {
    text.addMessage(
      gameState,
      playerName,
      'No history entries match that subject and years-back filter.'
    );
    return;
  }

  for (const entry of deduped) {
    text.addMessage(
      gameState,
      playerName,
      '[' + entry.source + '] ' + entry.message
    );
  }
}

function showTribeHistory(playerName, gameState) {
  if (!gameState) {
    console.warn('showTribeHistory called with no gameState');
    text.addMessage(
      gameState,
      playerName,
      'No tribe in this channel.  Do you want to join and create one?'
    );
    return;
  }

  // Require that the player has or had membership in this tribe,
  // similar to personal history.
  var player = pop.memberByName(playerName, gameState);
  if (!player) {
    player = pop.deadOrBanishedByName(playerName, gameState);
    if (!player) {
      text.addMessage(
        gameState,
        playerName,
        'You have no history with this tribe'
      );
      return;
    }
  }

  var messages = gameState.tribeHistory;
  if (!messages || messages.length === 0) {
    text.addMessage(
      gameState,
      playerName,
      'The tribe has no recorded history yet.'
    );
    return;
  }

  for (const message of messages) {
    const entryMessage = historyEntryMessage(message);
    if (!entryMessage) {
      continue;
    }
    text.addMessage(gameState, playerName, entryMessage);
  }
}

module.exports.showTribeHistory = showTribeHistory;
module.exports.showCombinedHistory = showCombinedHistory;
module.exports.getHistorySubjectChoices = getHistorySubjectChoices;
