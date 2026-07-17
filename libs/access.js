const referees = require('./referees.json');
const pop = require('./population.js');

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

module.exports = {
  isReferee,
  canActAsChief,
  isNonMemberReferee,
  referees,
};
