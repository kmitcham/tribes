const referees = require('./referees.json');
const pop = require('./population.js');
const text = require('./textprocess.js');

const NOT_IN_TRIBE_MESSAGE = 'You are not a member of this tribe.';

function isReferee(actorName) {
  return !!(actorName && referees.includes(actorName));
}

/**
 * True if the actor may use chief-level tribe controls.
 * Referees may act in any tribe they are viewing, even if not members.
 * Work, guard, romance, and conflict stay member-bound elsewhere.
 */
function canActAsChief(actorName, gameState) {
  if (isReferee(actorName)) {
    return true;
  }
  if (!gameState || !gameState.population) {
    return false;
  }
  const player = pop.memberByName(actorName, gameState);
  return !!(player && player.chief);
}

/** True if actor is a referee and not in this tribe's population. */
function isNonMemberReferee(actorName, gameState) {
  if (!isReferee(actorName)) {
    return false;
  }
  return !pop.memberByName(actorName, gameState);
}

/**
 * Look up a tribe member. If missing, send a private message and return null.
 * @returns {object|null}
 */
function requireTribeMember(gameState, actorName) {
  const player = pop.memberByName(actorName, gameState);
  if (!player) {
    text.addMessage(gameState, actorName, NOT_IN_TRIBE_MESSAGE);
    return null;
  }
  return player;
}

module.exports = {
  isReferee,
  canActAsChief,
  isNonMemberReferee,
  requireTribeMember,
  NOT_IN_TRIBE_MESSAGE,
  referees,
};
