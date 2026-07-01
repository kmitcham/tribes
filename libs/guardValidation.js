const pop = require('./population.js');

function validateGuardingChange(actorName, gameState) {
  const person = pop.memberByName(actorName, gameState);
  if (!person) {
    return { error: 'FAIL: you are not a person' };
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
