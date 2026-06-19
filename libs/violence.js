const killlib = require('./kill.js');
const text = require('./textprocess.js');
const pop = require('./population.js');
const dice = require('./dice.js');

module.exports.demand = (playerName, demandText, gameState) => {
  // fail if already has a demand in place
  // fail if player not in tribe
  const player = gameState['population'][playerName];
  const response = player;
  gameState['demand'] = demandText;
  player['faction'] = 'for';
  text.addMessage(gameState, 'tribe', playerName + ' DEMANDS: ' + demandText);
  return response;
};

function getGameFactions(gameState) {
  var proList = [];
  var conList = [];
  var neutralList = [];
  var undeclaredList = [];
  const population = gameState['population'];
  for (const playerName in population) {
    const player = population[playerName];
    if (!player['faction']) {
      undeclaredList.push(player);
    } else if (player['faction'] == 'neutral') {
      neutralList.push(player);
    } else if (player['faction'] == 'for') {
      proList.push(player);
    } else if (player['faction'] == 'against') {
      conList.push(player);
    } else {
      console.log(
        player['name'] +
          ' has illegal faction value ' +
          player['faction'] +
          ' setting to null'
      );
      delete player['faction'];
      undeclaredList.push(player);
    }
  }
  return {
    for: proList,
    against: conList,
    neutral: neutralList,
    undeclared: undeclaredList,
  };
}
module.exports.getGameFactions = getGameFactions;

function endViolence(gameState, winnerFaction) {
  const topic = gameState.violence;
  let winMessage;
  if (winnerFaction === 'for') {
    winMessage = 'The FOR faction wins the conflict over "' + topic + '". The demand will be carried out.';
  } else if (winnerFaction === 'against') {
    winMessage = 'The AGAINST faction wins the conflict over "' + topic + '". The demand has been denied.';
  } else {
    winMessage = 'The conflict over "' + topic + '" ends with no clear winner.';
  }
  text.addMessage(gameState, 'tribe', winMessage);
  delete gameState.violence;
  delete gameState.violenceRounds;
  delete gameState.violenceFactions;
  for (const playerName in gameState.population) {
    const player = gameState.population[playerName];
    delete player.strategy;
    delete player.escaped;
    delete player.attack_target;
    delete player.hits;
  }
}

// see if any factions members are all escaped or dead.
// returns true if violence is still in order
function moreFactionViolenceRequired(gameState) {
  var proList = [];
  var conList = [];
  const population = gameState['population'];
  const violenceFactions = gameState.violenceFactions || {};
  if (!gameState.violenceFactions) {
    console.warn('moreFactionViolenceRequired: violenceFactions missing during active violence');
  }
  // dead people are in the graveyard
  for (const playerName in population) {
    const player = population[playerName];
    const faction = player['faction'] || violenceFactions[playerName];
    if (faction == 'for' && !player['escaped']) {
      proList.push(player);
    } else if (faction == 'against' && !player['escaped']) {
      conList.push(player);
    }
  }
  if (conList.length == 0 && proList.length == 0) {
    text.addMessage(
      gameState,
      'tribe',
      'There is no one left from either faction that wants to fight about it.'
    );
    endViolence(gameState, 'none');
    return false;
  } else if (proList.length == 0) {
    text.addMessage(
      gameState,
      'tribe',
      'There is no one left in favor of the demand that wants to fight about it.'
    );
    endViolence(gameState, 'against');
    return false;
  } else if (conList.length == 0) {
    text.addMessage(
      gameState,
      'tribe',
      'There is no one left against the demand that wants to fight about it.'
    );
    endViolence(gameState, 'for');
    return false;
  } else {
    text.addMessage(
      gameState,
      'tribe',
      'The factions still feel strongly about the issue.'
    );
    return true;
  }
}

function getFactionBaseScore(faction) {
  var score = 0;
  for (const person of faction) {
    if (person.gender == 'male') {
      score += 4;
    } else {
      score += 2;
    }
    if (person.chief) {
      score += 2;
    }
    if (person.isPregnant) {
      score += 1;
    }
    if (person.strength) {
      if (person.strength == 'weak') {
        score -= 1;
      } else {
        score += 1;
      }
    }
    if (person.isInjured && person.isInjured > 0) {
      score -= 1;
    }
    if (person.isSick && person.isSick > 0) {
      score -= 1;
    }
  }
  return score;
}
module.exports.getFactionBaseScore = getFactionBaseScore;

function factionHasCrafter(faction) {
  for (const person of faction) {
    if (person.canCraft) {
      return true;
    }
  }
  return false;
}

function getFactionScores(gameState) {
  var gameFactions = getGameFactions(gameState);
  var forScore = getFactionBaseScore(gameFactions['for']);
  var againstScore = getFactionBaseScore(gameFactions['against']);
  var neutralScore = getFactionBaseScore(gameFactions['neutral']);
  var undeclaredScore = getFactionBaseScore(gameFactions['undeclared']);

  var forCraft = factionHasCrafter(gameFactions['for']);
  var conCraft = factionHasCrafter(gameFactions['against']);
  var neuCraft = factionHasCrafter(gameFactions['neutral']);
  var undCraft = factionHasCrafter(gameFactions['undeclared']);
  if (forCraft && !conCraft && !neuCraft && !undCraft) {
    forScore += 2;
  }
  if (!forCraft && conCraft && !neuCraft && !undCraft) {
    againstScore += 2;
  }

  return {
    for: forScore,
    against: againstScore,
    neutral: neutralScore,
    undeclared: undeclaredScore,
  };
}
module.exports.getFactionScores = getFactionScores;

const getFactionResult = (gameState) => {
  let response = '';
  const gameFactions = getGameFactions(gameState);
  const demand = gameState['demand'];
  var forScore = 0;
  var againstScore = 0;

  if (!gameFactions['for'] || gameFactions['for'].length == 0) {
    response =
      'Nobody still cares about ' +
      demand +
      '.  The conflict has been resolved.';
    console.log('nobody wants the demand anymore');
    delete gameState['demand'];
    delete gameState.violenceRounds;
    for (const playerName in gameState['population']) {
      delete gameState['population'][playerName]['faction'];
    }
    return response;
  }
  const scores = getFactionScores(gameState);
  forScore = scores.for;
  againstScore = scores.against;
  const neutralScore = scores.neutral;
  const undeclaredScore = scores.undeclared;
  console.log(
    'Faction scores: For:' +
      forScore +
      ' against:' +
      againstScore +
      ' neutral:' +
      neutralScore +
      ' undeclared:' +
      undeclaredScore
  );

  // if there are not enough undeclared people to swing the vote, we can end it immediately.
  if (forScore >= 2 * (againstScore + undeclaredScore)) {
    response =
      'The Demand faction has overwhelming support (' +
      forScore +
      ').  The demand to ' +
      gameState.demand +
      ' should be done immediately.';
    for (const playerName in gameState['population']) {
      delete gameState['population'][playerName]['faction'];
    }
    console.log(
      'The demand has been resolved via overwheming support.  Deleting: ' +
        gameState.demand
    );
    delete gameState['demand'];
    delete gameState.violenceRounds;
  } else if (againstScore >= 2 * (forScore + undeclaredScore)) {
    response =
      'The Oppostion faction has overwhelming support (' +
      againstScore +
      '). The demand to ' +
      gameState.demand +
      ' should be ignored.';
    for (const playerName in gameState['population']) {
      delete gameState['population'][playerName]['faction'];
    }
    delete gameState.violenceRounds;
  } else if (
    gameFactions['undeclared'] &&
    gameFactions['undeclared'].length > 0
  ) {
    //console.log(gameFactions)
    response = 'The factions are:\n';
    response +=
      displayFaction(gameFactions['undeclared']) +
      'not yet declared (for, against, neutral).\n';
    response += displayFaction(gameFactions['for']) + 'for the demand.\n';
    response +=
      displayFaction(gameFactions['against']) + 'against the demand.\n';
    response +=
      displayFaction(gameFactions['neutral']) +
      'unwilling to fight about it.\n';
  } else {
    if (forScore >= 2 * againstScore) {
      response =
        'The Demand faction has enough support (' +
        forScore +
        ').  The demand to ' +
        gameState.demand +
        ' should be done immediately.';
    } else if (againstScore >= 2 * forScore) {
      response =
        'The Oppostion faction has enough support (' +
        againstScore +
        '). The demand to ' +
        gameState.demand +
        ' should be ignored.';
    } else {
      gameState.violence = gameState.demand;
      gameState.violenceRounds = 0;
      // Save faction assignments before they are cleared so violence resolution can use them
      gameState.violenceFactions = {};
      for (const pName in gameState['population']) {
        const faction = gameState['population'][pName]['faction'];
        if (faction) {
          gameState.violenceFactions[pName] = faction;
        }
      }
      response =
        'Tribal society breaks down as VIOLENCE is required to settle the issue of ' +
        gameState.demand +
        '\n The demand is lost in the conflict.';
    }
    console.log('The demand has been resolved.  Deleting: ' + gameState.demand);
    delete gameState['demand'];
    for (const playerName in gameState['population']) {
      delete gameState['population'][playerName]['faction'];
    }
    console.log('Deleted: ' + gameState.demand);
  }
  text.addMessage(gameState, 'tribe', response);
};
module.exports.getFactionResult = getFactionResult;

function displayFaction(faction) {
  let message = '';
  const names = [];
  if (faction.length < 1) {
    return 'Nobody is ';
  } else if (faction.length == 1) {
    return faction[0].name + ' is ';
  }
  for (const person of faction) {
    names.push(person.name);
  }
  message = names.join(', ');
  message += ' are ';
  return message;
}

function addViolenceDeathMessage(gameState, defenderName, attackerName) {
  if (!defenderName || !attackerName) {
    return;
  }
  const demandText = gameState && gameState.violence ? gameState.violence : 'the active demand';
  text.addMessage(
    gameState,
    defenderName,
    'You were killed by ' + attackerName + ' in violence over "' + demandText + '".'
  );
}

const computeBonus = (attacker, defender) => {
  var bonus = 0;
  if (attacker.spearhead > 0) {
    bonus += 2;
  }
  if (attacker.profession == 'hunter') {
    bonus += 1;
  }
  if (attacker.strength == 'strong') {
    bonus += 1;
  }
  if (attacker.strength == 'weak') {
    bonus -= 1;
  }
  if (attacker.isInjured) {
    bonus -= 1;
  }
  if (attacker.isSick) {
    bonus -= 2;
  }
  if (defender.strategy == 'run' || defender.strategy == 'defend') {
    bonus -= 2;
  }
  if (defender.isPregnant) {
    bonus -= 2;
  }
  if (defender.escaped) {
    bonus -= 100;
  }
  return bonus;
};

module.exports.computeBonus = computeBonus;
const resolveSingleAttack = (attacker, defender, roll, gameState) => {
  if (!attacker) {
    console.log('Bad attacker for resolveSingleAttack');
    return 'No attacker gives no result\n';
  }
  if (!defender) {
    console.log(
      'Bad defender for resolveSingleAttack attacker was ' + attacker.name
    );
    return 'No defender gives no result\n';
  }
  const bonus = computeBonus(attacker, defender);
  const netRoll = roll + bonus;
  let response =
    attacker.name +
    ' attacks ' +
    defender.name +
    '[' +
    roll +
    '+' +
    bonus +
    ']  ';
  if ('hits' in defender) {
  } else {
    if (defender.isInjured) {
      defender.hits = Number(1);
    } else {
      defender.hits = Number(0);
    }
  }
  if (netRoll >= 8) {
    response += 'A hit!  ';
    defender.hits = Number(defender.hits) + 1;
  } else {
    return response + 'A miss!\n';
  }
  if (defender.hits == 1) {
    defender.isInjured = 4;
    response += defender.name + ' is injured!';
  }
  if (defender.hits == 2) {
    defender.isInjured = 4;
    if (defender.strength == 'weak') {
      const creditedAttacker =
        (gameState &&
          gameState._firstAttackerByTarget &&
          gameState._firstAttackerByTarget[defender.name]) ||
        attacker.name;
      response += defender.name + ' is too weak to survive and is killed!';
      addViolenceDeathMessage(gameState, defender.name, creditedAttacker);
      killlib.kill(
        defender.name,
        'killed by ' + creditedAttacker + ' over ' + gameState.violence,
        gameState
      );
      return response + '\n';
    }
    defender.strength = 'weak';
    response += defender.name + ' is crippled, and becomes Weak!';
  }
  gameState.population[defender.name] = defender;
  if (defender.hits >= 3) {
    const creditedAttacker =
      (gameState &&
        gameState._firstAttackerByTarget &&
        gameState._firstAttackerByTarget[defender.name]) ||
      attacker.name;
    response += defender.name + ' is killed!';
    addViolenceDeathMessage(gameState, defender.name, creditedAttacker);
    killlib.kill(
      defender.name,
      'killed by ' + creditedAttacker + ' over ' + gameState.violence,
      gameState
    );
  }
  return response + '\n';
};
module.exports.resolveSingleAttack = resolveSingleAttack;

const resolveViolence = (gameState) => {
  let attackers = [];
  const undecided = [];
  const runners = [];
  let response = '';
  const population = gameState['population'];
  for (const playerName in population) {
    const player = population[playerName];
    if (!player.strategy && !player.escaped) {
      undecided.push(playerName);
    } else if (player.strategy == 'attack') {
      attackers.push(playerName);
    } else if (player.strategy == 'run' && !player.escaped) {
      runners.push(playerName);
    }
  }
  if (undecided.length > 0) {
    response =
      'The following players still need to chose between attack <name>, run, or defend: ';
    response += undecided.join(',');
    text.addMessage(gameState, 'tribe', response);
    return response;
  }
  if (attackers.length == 0) {
    response =
      'The violence has ended.  Nobody is still willing to attack anyone about ' +
      gameState.violence + '.';
    text.addMessage(gameState, 'tribe', response);
    // Determine winner by surviving (non-escaped) faction members
    let forSurvivors = 0;
    let againstSurvivors = 0;
    const violenceFactions = gameState.violenceFactions || {};
    if (!gameState.violenceFactions) {
      console.warn('resolveViolence: violenceFactions missing during active violence');
    }
    for (const pName in population) {
      const p = population[pName];
      if (!p.escaped) {
        const faction = p.faction || violenceFactions[pName];
        if (faction === 'for') forSurvivors++;
        else if (faction === 'against') againstSurvivors++;
      }
    }
    let winnerFaction = 'none';
    if (forSurvivors > 0 && againstSurvivors === 0) winnerFaction = 'for';
    else if (againstSurvivors > 0 && forSurvivors === 0) winnerFaction = 'against';
    endViolence(gameState, winnerFaction);
    return response;
  }
  const defenderTargets = {};
  gameState._firstAttackerByTarget = {};
  for (const attackerName of attackers) {
    const attacker = population[attackerName];
    const targetName = attacker.attack_target;
    if (targetName && !gameState._firstAttackerByTarget[targetName]) {
      gameState._firstAttackerByTarget[targetName] = attackerName;
    }
    if (defenderTargets[targetName]) {
      //console.log(' defenderTargets adds '+attackerName)
      defenderTargets[targetName].push(attackerName);
    } else {
      //console.log(' defenderTargets initialized with '+attackerName)
      defenderTargets[targetName] = [attackerName];
    }
  }
  // giving defenders first strike, in case attack makes someone weak
  for (const defenderName in defenderTargets) {
    const defenderAttackers = defenderTargets[defenderName];
    const randomIndex = Math.trunc(Math.random() * defenderAttackers.length);
    const targetName = defenderAttackers[randomIndex];
    //console.log('defender first strike vs '+defenderName)
    const attacker = pop.memberByName(defenderName, gameState);
    if (attacker && attacker.strategy == 'defend') {
      const defender = pop.memberByName(targetName, gameState);
      const roll = dice.roll(2);
      response += resolveSingleAttack(attacker, defender, roll, gameState);
    }
  }
  for (const attackerName of attackers) {
    const attacker = pop.memberByName(attackerName, gameState);
    if (!attacker) {
      // Defender first strike wins
      continue;
    }
    const targetName = attacker.attack_target;
    const defender = pop.memberByName(targetName, gameState);
    //console.log(attackerName+' attacks '+targetName)
    const roll = dice.roll(2);
    response += resolveSingleAttack(attacker, defender, roll, gameState);
  }
  for (const playerName of runners) {
    const runner = population[playerName];
    // can die before you run
    if (runner) {
      runner.escaped = true;
      runner.strategy = 'run';
      response += playerName + ' runs away from the fighting.\n';
    }
  }
  // reset the strategies
  for (const playerName in population) {
    const player = population[playerName];
    if (!player.escaped) {
      delete player.strategy;
    }
    delete player.attack_target;
  }
  if (!Number.isFinite(gameState.violenceRounds)) {
    gameState.violenceRounds = 0;
  }
  gameState.violenceRounds += 1;
  response +=
    '\nA round of combat has ended.  Everyone who has not escaped needs to choose a strategy';

  text.addMessage(gameState, 'tribe', response);
  if (moreFactionViolenceRequired(gameState)) {
    // this should stop recursing if nobody wants to fight anymore.  I hope.
    resolveViolence(gameState);
  }
  delete gameState._firstAttackerByTarget;
};
module.exports.resolveViolence = resolveViolence;
