const pop = require('./population.js');
const access = require('./access.js');

function validateGuardingChange(actorName, gameState) {
  const person = pop.memberByName(actorName, gameState);
  if (!person) {
    return { error: access.NOT_IN_TRIBE_MESSAGE };
  }
  if (person.worked === true) {
    return {
      error: 'You can not change guard status after having worked.',
    };
  }
  if (gameState.workRound === false) {
    return {
      error: 'You can not change guard status outside the work round',
    };
  }

  return { person };
}

module.exports.validateGuardingChange = validateGuardingChange;
