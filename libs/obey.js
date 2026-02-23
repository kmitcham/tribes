const text = require('./textprocess.js');
const pop = require('./population');
const huntlib = require('./hunt.js');
const dice = require('./dice');
const worklib = require('./work.js');

// obeyList is one or more of: craft, hunt, gather, giveall, idle, watch, ignore
// craft, watch, ignore take extra arg: spearhead, basket or childName.

function command(gameState, actorName, targetName, action, extraArg) {
  actingMember = pop.memberByName(actorName, gameState);
  targetMember = pop.memberByName(targetName, gameState);

  pop.history(
    targetMember.name,
    actingMember.name + ' ordered you to ' + action,
    gameState
  );
  // actingMember must be chief
  // targetMember must have an obeyList
  // that obeylist must contain the action
  if (action == 'hunt') {
    roll = dice.roll(3);
    huntlib.hunt(targetMember.name, targetMember, roll, gameState);
    return;
  } else if (action == 'gather') {
    roll = dice.roll(3);
    worklib.gather(targetMember.name, targetMember, roll, gameState);
    return;
  } else if (action == 'craft') {
    if (
      targetMember.canCraft &&
      (extraArg == 'spearhead' || extraArg == 'basket')
    ) {
      worklib.craft(gameState, targetMember.name, extraArg, 0);
    } else {
      text.addMessage(
        gameState,
        actingMember.name,
        targetMember.name + ' does not know how to do that.'
      );
    }
    return;
  }
  // if action is watch or ignore, must be able to find the child in extraArg.
}
