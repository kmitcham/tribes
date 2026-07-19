const path = require('path');
const jsonUtils = require('./jsonUtils.js');

const MAX_GAMES = 20;
const DEFAULT_USERS_PATH = path.join(__dirname, '..', 'tribe-data', 'users.json');

let usersStore = null;

/**
 * Bind the live usersDict from the server so career writes stay in-memory
 * and do not get clobbered by a later writeUsers() from a stale load.
 * @param {{ getUsersDict: Function, writeUsers: Function }|null} store
 */
function configureUsersStore(store) {
  usersStore = store || null;
}
module.exports.configureUsersStore = configureUsersStore;

function emptyCareer() {
  return {
    gamesPlayed: 0,
    survived: 0,
    died: 0,
    banished: 0,
    tribeResults: {},
    totalChildren: 0,
    maxChildren: 0,
    maxSeasons: 0,
    totalFoodProduced: 0,
    games: [],
  };
}

function ensureCareer(user) {
  if (!user.career || typeof user.career !== 'object') {
    user.career = emptyCareer();
  }
  const c = user.career;
  if (!Array.isArray(c.games)) {
    c.games = [];
  }
  if (!c.tribeResults || typeof c.tribeResults !== 'object') {
    c.tribeResults = {};
  }
  for (const key of [
    'gamesPlayed',
    'survived',
    'died',
    'banished',
    'totalChildren',
    'maxChildren',
    'maxSeasons',
    'totalFoodProduced',
  ]) {
    if (typeof c[key] !== 'number' || !Number.isFinite(c[key])) {
      c[key] = 0;
    }
  }
  return c;
}
module.exports.ensureCareer = ensureCareer;

function findUserKey(usersDict, playerName) {
  if (!usersDict || !playerName) {
    return null;
  }
  if (usersDict[playerName]) {
    return playerName;
  }
  const lower = String(playerName).toLowerCase();
  for (const key of Object.keys(usersDict)) {
    if (String(key).toLowerCase() === lower) {
      return key;
    }
  }
  return null;
}
module.exports.findUserKey = findUserKey;

function addFoodProduced(player, amount) {
  if (!player || typeof player !== 'object') {
    return;
  }
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) {
    return;
  }
  const prev = Number(player.foodProduced);
  player.foodProduced = (Number.isFinite(prev) ? prev : 0) + n;
}
module.exports.addFoodProduced = addFoodProduced;

function collectAdultEntries(gameState) {
  const byLower = {};

  function addFromDict(dict, status) {
    if (!dict || typeof dict !== 'object') {
      return;
    }
    for (const key of Object.keys(dict)) {
      const record = dict[key];
      if (!record || typeof record !== 'object') {
        continue;
      }
      // Graveyard children have age and no profession — skip them.
      if (
        status === 'dead' &&
        'age' in record &&
        !('profession' in record)
      ) {
        continue;
      }
      const name = record.name || key;
      if (!name) {
        continue;
      }
      const lower = String(name).toLowerCase();
      // Prefer alive over banished/dead if the same name appears twice.
      if (byLower[lower] && byLower[lower].status === 'alive') {
        continue;
      }
      if (
        byLower[lower] &&
        byLower[lower].status === 'banished' &&
        status === 'dead'
      ) {
        continue;
      }
      byLower[lower] = {
        name,
        status,
        profession: record.profession || null,
        foodProduced: Number(record.foodProduced) || 0,
        chief: !!record.chief,
      };
    }
  }

  addFromDict(gameState.population, 'alive');
  addFromDict(gameState.banished, 'banished');
  addFromDict(gameState.graveyard, 'dead');
  return Object.values(byLower);
}
module.exports.collectAdultEntries = collectAdultEntries;

function countChildrenForParent(parentName, children) {
  let total = 0;
  let grewUp = 0;
  if (!parentName || !children) {
    return { children: 0, childrenGrewUp: 0 };
  }
  const lower = String(parentName).toLowerCase();
  for (const key of Object.keys(children)) {
    const child = children[key] || {};
    const mother = child.mother ? String(child.mother).toLowerCase() : '';
    const father = child.father ? String(child.father).toLowerCase() : '';
    if (mother !== lower && father !== lower) {
      continue;
    }
    total += 1;
    if (child.newAdult) {
      grewUp += 1;
    }
  }
  return { children: total, childrenGrewUp: grewUp };
}
module.exports.countChildrenForParent = countChildrenForParent;

/**
 * Build per-player game summaries for an ended game (does not touch users).
 */
function buildGameSummaries(gameState) {
  const tribeResult = gameState.tribeResult || 'Unknown';
  const seasons =
    typeof gameState.seasonCounter === 'number' &&
    Number.isFinite(gameState.seasonCounter)
      ? gameState.seasonCounter
      : 0;
  const tribe = gameState.name || '';
  const endedAt = new Date().toISOString();
  const children = gameState.children || {};
  const adults = collectAdultEntries(gameState);
  const summaries = [];

  for (const adult of adults) {
    const childCounts = countChildrenForParent(adult.name, children);
    summaries.push({
      playerName: adult.name,
      game: {
        endedAt,
        tribe,
        seasons,
        tribeResult,
        survived: adult.status,
        profession: adult.profession,
        children: childCounts.children,
        childrenGrewUp: childCounts.childrenGrewUp,
        foodProduced: adult.foodProduced,
        chief: adult.chief,
      },
    });
  }
  return summaries;
}
module.exports.buildGameSummaries = buildGameSummaries;

function applyGameToCareer(career, game) {
  career.gamesPlayed += 1;
  if (game.survived === 'alive') {
    career.survived += 1;
  } else if (game.survived === 'dead') {
    career.died += 1;
  } else if (game.survived === 'banished') {
    career.banished += 1;
  }
  const resultKey = game.tribeResult || 'Unknown';
  career.tribeResults[resultKey] = (career.tribeResults[resultKey] || 0) + 1;
  career.totalChildren += game.children || 0;
  if ((game.children || 0) > career.maxChildren) {
    career.maxChildren = game.children || 0;
  }
  if ((game.seasons || 0) > career.maxSeasons) {
    career.maxSeasons = game.seasons || 0;
  }
  career.totalFoodProduced += game.foodProduced || 0;
  career.games.unshift(game);
  if (career.games.length > MAX_GAMES) {
    career.games = career.games.slice(0, MAX_GAMES);
  }
}
module.exports.applyGameToCareer = applyGameToCareer;

/**
 * Record ended-game stats onto matching user accounts.
 * @param {object} gameState
 * @param {{ usersDict?: object, writeUsers?: Function, usersPath?: string }=} deps
 * @returns {{ recorded: number, skipped: number }}
 */
function recordEndedGame(gameState, deps) {
  deps = deps || {};
  let usersDict = deps.usersDict;
  let writeUsers = deps.writeUsers;
  const usersPath = deps.usersPath || DEFAULT_USERS_PATH;

  if (!usersDict && usersStore && typeof usersStore.getUsersDict === 'function') {
    usersDict = usersStore.getUsersDict();
  }
  if (!writeUsers && usersStore && typeof usersStore.writeUsers === 'function') {
    writeUsers = usersStore.writeUsers;
  }

  // Without an explicit dict or the live server store, skip persistence.
  // (Avoids unit tests accidentally rewriting tribe-data/users.json.)
  if (!usersDict) {
    return { recorded: 0, skipped: 0 };
  }
  if (typeof writeUsers !== 'function') {
    writeUsers = () => jsonUtils.writeJson(usersPath, usersDict);
  }

  const summaries = buildGameSummaries(gameState);
  let recorded = 0;
  let skipped = 0;

  for (const { playerName, game } of summaries) {
    const key = findUserKey(usersDict, playerName);
    if (!key) {
      skipped += 1;
      continue;
    }
    const user = usersDict[key];
    if (!user || typeof user !== 'object') {
      skipped += 1;
      continue;
    }
    const career = ensureCareer(user);
    applyGameToCareer(career, game);
    recorded += 1;
  }

  if (recorded > 0) {
    try {
      writeUsers();
    } catch (err) {
      console.error('career.recordEndedGame: failed to write users', err);
    }
  }

  return { recorded, skipped };
}
module.exports.recordEndedGame = recordEndedGame;
module.exports.MAX_GAMES = MAX_GAMES;

function getUsersDict(deps) {
  deps = deps || {};
  if (deps.usersDict) {
    return deps.usersDict;
  }
  if (usersStore && typeof usersStore.getUsersDict === 'function') {
    return usersStore.getUsersDict();
  }
  return null;
}
module.exports.getUsersDict = getUsersDict;

function getUserRecord(playerName, deps) {
  const usersDict = getUsersDict(deps);
  if (!usersDict) {
    return null;
  }
  const key = findUserKey(usersDict, playerName);
  if (!key) {
    return null;
  }
  return usersDict[key];
}
module.exports.getUserRecord = getUserRecord;

function formatTribeResults(tribeResults) {
  if (!tribeResults || typeof tribeResults !== 'object') {
    return 'none yet';
  }
  const parts = Object.keys(tribeResults)
    .sort()
    .map((key) => key + '×' + tribeResults[key]);
  return parts.length ? parts.join(', ') : 'none yet';
}

/**
 * Private text for the `incarnations` command.
 * @param {object|null} user
 * @param {string} playerName
 */
function formatIncarnationsMessage(user, playerName) {
  const displayName = (user && user.name) || playerName || 'you';
  if (!user) {
    return (
      'No registered account found for ' +
      displayName +
      '. Incarnations are tracked for registered players after a game ends.'
    );
  }
  const c = ensureCareer(user);
  if (!c.gamesPlayed) {
    return (
      'Your incarnations\n' +
      '  No finished games recorded yet for ' +
      displayName +
      '.\n' +
      '  Stats update when a chief/ref ends a game you were in.'
    );
  }

  const lines = [];
  lines.push('Your incarnations');
  lines.push(
    '  Games: ' +
      c.gamesPlayed +
      ' (survived ' +
      c.survived +
      ', died ' +
      c.died +
      ', banished ' +
      c.banished +
      ')'
  );
  lines.push(
    '  Children (lifetime): ' +
      c.totalChildren +
      '  |  best game: ' +
      c.maxChildren
  );
  lines.push('  Longest run: ' + c.maxSeasons + ' seasons');
  lines.push('  Food produced: ' + c.totalFoodProduced);
  lines.push('  Tribe results: ' + formatTribeResults(c.tribeResults));

  if (c.games && c.games.length) {
    lines.push('');
    lines.push('Recent incarnations:');
    const recent = c.games.slice(0, 10);
    for (const g of recent) {
      const tribe = g.tribe || '?';
      const result = g.tribeResult || '?';
      const kids = g.children != null ? g.children : 0;
      const seasons = g.seasons != null ? g.seasons : '?';
      const survived = g.survived || '?';
      lines.push(
        '  ' +
          tribe +
          ' — ' +
          result +
          ' — ' +
          kids +
          ' child' +
          (kids === 1 ? '' : 'ren') +
          ' — ' +
          seasons +
          ' seasons (' +
          survived +
          ')'
      );
    }
  }
  return lines.join('\n');
}
module.exports.formatIncarnationsMessage = formatIncarnationsMessage;

/** One-line private blurb after endgame (lifetime includes this incarnation). */
function formatLifetimeChildrenBlurb(user, thisGameChildren) {
  if (!user) {
    return null;
  }
  const c = ensureCareer(user);
  const thisKids =
    typeof thisGameChildren === 'number' && Number.isFinite(thisGameChildren)
      ? thisGameChildren
      : 0;
  return (
    'Your lifetime children: ' +
    c.totalChildren +
    ' (this incarnation: ' +
    thisKids +
    ')'
  );
}
module.exports.formatLifetimeChildrenBlurb = formatLifetimeChildrenBlurb;

/**
 * After recordEndedGame, private blurbs for registered players in this game.
 * @returns {Array<{ playerName: string, message: string }>}
 */
function buildEndgameLifetimeBlurbs(gameState, deps) {
  const usersDict = getUsersDict(deps);
  if (!usersDict) {
    return [];
  }
  const summaries = buildGameSummaries(gameState);
  const blurbs = [];
  for (const { playerName, game } of summaries) {
    const key = findUserKey(usersDict, playerName);
    if (!key) {
      continue;
    }
    const user = usersDict[key];
    const message = formatLifetimeChildrenBlurb(user, game.children);
    if (message) {
      blurbs.push({ playerName, message });
    }
  }
  return blurbs;
}
module.exports.buildEndgameLifetimeBlurbs = buildEndgameLifetimeBlurbs;

/**
 * Store the full endgame recap on each registered player who was in this game.
 * Replaces any previous lastGame until the next game they finish ends.
 * @returns {{ recorded: number, skipped: number }}
 */
function storeLastGameRecap(gameState, fullMessage, deps) {
  deps = deps || {};
  let usersDict = deps.usersDict;
  let writeUsers = deps.writeUsers;
  const usersPath = deps.usersPath || DEFAULT_USERS_PATH;

  if (!usersDict && usersStore && typeof usersStore.getUsersDict === 'function') {
    usersDict = usersStore.getUsersDict();
  }
  if (!writeUsers && usersStore && typeof usersStore.writeUsers === 'function') {
    writeUsers = usersStore.writeUsers;
  }
  if (!usersDict) {
    return { recorded: 0, skipped: 0 };
  }
  if (typeof writeUsers !== 'function') {
    writeUsers = () => jsonUtils.writeJson(usersPath, usersDict);
  }

  const message = String(fullMessage || '').trim();
  if (!message) {
    return { recorded: 0, skipped: 0 };
  }

  const recap = {
    endedAt: new Date().toISOString(),
    tribe: gameState && gameState.name ? gameState.name : '',
    tribeResult: gameState && gameState.tribeResult ? gameState.tribeResult : '',
    seasons:
      gameState &&
      typeof gameState.seasonCounter === 'number' &&
      Number.isFinite(gameState.seasonCounter)
        ? gameState.seasonCounter
        : null,
    message: message,
  };

  const adults = collectAdultEntries(gameState || {});
  let recorded = 0;
  let skipped = 0;

  for (const adult of adults) {
    const key = findUserKey(usersDict, adult.name);
    if (!key) {
      skipped += 1;
      continue;
    }
    const user = usersDict[key];
    if (!user || typeof user !== 'object') {
      skipped += 1;
      continue;
    }
    user.lastGame = Object.assign({}, recap, {
      survived: adult.status,
      profession: adult.profession || null,
    });
    recorded += 1;
  }

  if (recorded > 0) {
    try {
      writeUsers();
    } catch (err) {
      console.error('career.storeLastGameRecap: failed to write users', err);
    }
  }

  return { recorded, skipped };
}
module.exports.storeLastGameRecap = storeLastGameRecap;

/**
 * Private text for the `lastgame` command.
 */
function formatLastGameMessage(user, playerName) {
  const displayName = (user && user.name) || playerName || 'you';
  if (!user) {
    return (
      'No registered account found for ' +
      displayName +
      '. End-of-game recaps are stored for registered players.'
    );
  }
  if (!user.lastGame || typeof user.lastGame !== 'object' || !user.lastGame.message) {
    return (
      'No finished-game recap stored for ' +
      displayName +
      ' yet. After a game you are in ends, use lastgame to re-read the full report.'
    );
  }
  const g = user.lastGame;
  const headerParts = [];
  if (g.tribe) {
    headerParts.push('tribe ' + g.tribe);
  }
  if (g.tribeResult) {
    headerParts.push(g.tribeResult);
  }
  if (g.endedAt) {
    headerParts.push(g.endedAt);
  }
  const header =
    headerParts.length > 0
      ? 'Last game recap (' + headerParts.join(' · ') + ')\n\n'
      : 'Last game recap\n\n';
  return header + g.message;
}
module.exports.formatLastGameMessage = formatLastGameMessage;
