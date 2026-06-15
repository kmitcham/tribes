var violencelib = require('../libs/violence.js');
console.log = jest.fn();

function withMockedRandom(value, callback) {
  const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(value);
  try {
    callback();
  } finally {
    randomSpy.mockRestore();
  }
}

test('Happy Path Demand', () => {
  var gameState = {
    population: {
      gather1: {
        name: 'gather1',
      },
    },
    round: 'work',
  };
  var playername = 'gather1';
  var message = 'all tests pass';
  expectedMessage = 'gather1 DEMANDS: all tests pass';
  violencelib.demand(playername, message, gameState);
  actualMessage = gameState.messages['tribe'];
  expect(actualMessage).toBe(expectedMessage);
  expect(gameState['population'][playername]['faction']).toEqual('for');
  expect(gameState['demand']).toEqual(message);
});

test('Faction Check', () => {
  var gameState = {
    population: {
      demander: {
        name: 'demander',
        faction: 'for',
      },
      pro1: {
        name: 'pro1',
        faction: 'for',
      },
      con1: {
        name: 'con1',
        faction: 'against',
      },
      abstain: {
        name: 'abstain',
      },
      illegal: {
        name: 'illegal',
        faction: 'elephant',
      },
      neutral1: {
        name: 'neutral1',
        faction: 'neutral',
      },
    },
  };
  var message = 'all tests pass';
  factions = violencelib.getGameFactions(gameState);
  var factionNames = Object.keys(factions);
  expect(factionNames.length).toBe(4);
  expect(factions['for'].length).toBe(2); // demander and pro1
  expect(factions['against'].length).toBe(1); // one against
  expect(factions['undeclared'].length).toBe(2); // one undeclared
  expect(factions['neutral'].length).toBe(1); // neutral, abstain and illegal
});

test('Base Score test', () => {
  var faction = [
    { name: 'pro1', faction: 'for', gender: 'male' },
    { name: 'pro2', faction: 'for', gender: 'female', strength: 'strong' },
  ];
  expectedScore = 7;
  actualScore = violencelib.getFactionBaseScore(faction);
  expect(actualScore).toBe(expectedScore);
});
test('Base Score pregnant injured', () => {
  var faction = [
    { name: 'pro1', faction: 'for', gender: 'male', isInjured: true },
    {
      name: 'pro2',
      faction: 'for',
      gender: 'female',
      isPregnant: true,
      strength: 'strong',
    },
  ];
  expectedScore = 7;
  actualScore = violencelib.getFactionBaseScore(faction);
  expect(actualScore).toBe(expectedScore);
});
test('Base Score chief', () => {
  var faction = [
    { name: 'pro1', faction: 'for', gender: 'male', isSick: 3, chief: true },
  ];
  expectedScore = 5;
  actualScore = violencelib.getFactionBaseScore(faction);
  expect(actualScore).toBe(expectedScore);
});

test('bonus checking ', () => {
  var attacker = {
    name: 'attacker',
    strength: 'strong',
    profession: 'hunter',
    strategy: 'attack',
    target: 'defender',
  };
  var defender = {
    name: 'defender',
    strategy: 'attack',
  };
  response = violencelib.computeBonus(attacker, defender);
  expect(response).toBe(2);
  defender.isPregnant = true;
  response = violencelib.computeBonus(attacker, defender);
  expect(response).toBe(0);
  attacker.spearhead = 1;
  response = violencelib.computeBonus(attacker, defender);
  expect(response).toBe(2);
  attacker.isSick = 3;
  response = violencelib.computeBonus(attacker, defender);
  expect(response).toBe(0);
  delete attacker.strength;
  response = violencelib.computeBonus(attacker, defender);
  expect(response).toBe(-1);
  attacker.strength = 'weak';
  response = violencelib.computeBonus(attacker, defender);
  expect(response).toBe(-2);
  defender.strategy = 'defend';
  expect(violencelib.computeBonus(attacker, defender)).toBe(-4);
  defender.strategy = 'run';
  expect(violencelib.computeBonus(attacker, defender)).toBe(-4);
  attacker.isInjured = true;
  expect(violencelib.computeBonus(attacker, defender)).toBe(-5);
  defender.escaped = true;
  expect(violencelib.computeBonus(attacker, defender)).toBeLessThan(-12);
});

test('already weak defender dies on second hit', () => {
  const gameState = {
    seasonCounter: 1,
    violence: 'test issue',
    population: {
      attacker: {
        name: 'attacker',
        gender: 'male',
      },
      defender: {
        name: 'defender',
        gender: 'male',
        strength: 'weak',
        isInjured: 2,
      },
    },
    children: {},
    graveyard: {},
  };

  const result = violencelib.resolveSingleAttack(
    gameState.population.attacker,
    gameState.population.defender,
    12,
    gameState
  );

  expect(result).toContain('is too weak to survive and is killed!');
  expect(gameState.population.defender).toBeUndefined();
  expect(gameState.graveyard.defender).toBeDefined();
});

test('Faction Voting -> balanced', () => {
  var gameState = {
    population: {
      demander: {
        name: 'demander',
        faction: 'for',
      },
      pro1: {
        name: 'pro1',
        faction: 'for',
      },
      con1: {
        name: 'con1',
        faction: 'against',
      },
      con2: {
        name: 'con2',
        faction: 'against',
      },
      neutral1: {
        name: 'neutral1',
        faction: 'neutral',
      },
    },
    demand: 'some demand',
  };
  var message =
    'Tribal society breaks down as VIOLENCE is required to settle the issue of some demand';
  result = violencelib.getFactionResult(gameState);
  result = gameState.messages['tribe'];
  expect(result).toContain(message);
  expect(gameState.violenceRounds).toBe(0);
});

test('resolveViolence increments combat rounds and announces winner when faction eliminated', () => {
  withMockedRandom(0, () => {
    var gameState = {
      population: {
        attacker: {
          name: 'attacker',
          faction: 'for',
          strategy: 'attack',
          attack_target: 'defender',
          gender: 'male',
        },
        defender: {
          name: 'defender',
          faction: 'against',
          strategy: 'run',
          gender: 'male',
        },
      },
      violence: 'some demand',
      messages: {},
    };

    violencelib.resolveViolence(gameState);

    // After the round, "against" faction is all escaped → FOR wins → violence cleared
    expect(gameState.violence).toBeUndefined();
    expect(gameState.violenceRounds).toBeUndefined();
    expect(gameState.messages.tribe).toContain('A round of combat has ended');
    expect(gameState.messages.tribe).toContain('FOR faction wins');
  });
});

test('Faction Voting -> Overwhelmning For', () => {
  var gameState = {
    population: {
      demander: {
        name: 'demander',
        faction: 'for',
      },
      pro1: {
        name: 'pro1',
        faction: 'for',
        profession: 'hunter',
        gender: 'male',
      },
      pro2: {
        name: 'pro2',
        profession: 'hunter',
        gender: 'male',
        faction: 'for',
      },
      con1: {
        name: 'con1',
        faction: 'against',
      },
      abstain: {
        name: 'abstain',
      },
      neutral1: {
        name: 'neutral1',
        faction: 'neutral',
      },
    },
    demand: 'some demand',
  };
  var message =
    'The Demand faction has overwhelming support (10).  The demand to some demand should be done immediately.';
  result = violencelib.getFactionResult(gameState);
  result = gameState.messages['tribe'];
  expect(result).toBe(message);
});
test('Faction Voting -> against', () => {
  var gameState = {
    population: {
      demander: {
        name: 'demander',
        faction: 'for',
      },
      con1: {
        name: 'con1',
        faction: 'against',
      },
      con2: {
        name: 'con2',
        faction: 'against',
      },
      con3: {
        name: 'con3',
        faction: 'against',
      },
      neutral1: {
        name: 'neutral1',
        faction: 'neutral',
        canCraft: true,
      },
    },
    demand: 'some demand',
  };
  var message =
    'The Oppostion faction has overwhelming support (6). The demand to some demand should be ignored.';
  result = violencelib.getFactionResult(gameState);
  result = gameState.messages['tribe'];

  expect(result).toBe(message);
});

test('Faction Voting -> marginal For', () => {
  var gameState = {
    population: {
      demander: {
        name: 'demander',
        faction: 'for',
      },
      pro1: {
        name: 'pro1',
        faction: 'for',
      },
      con1: {
        name: 'con1',
        faction: 'against',
      },
      neutral1: {
        name: 'neutral1',
        faction: 'neutral',
      },
    },
    demand: 'some demand',
  };
  var message =
    'The Demand faction has overwhelming support (4).  The demand to some demand should be done immediately.';
  result = violencelib.getFactionResult(gameState);
  result = gameState.messages['tribe'];
  expect(result).toBe(message);
});
test('Display faction -> basic test', () => {
  var gameState = {
    population: {
      demander: {
        name: 'demander',
        faction: 'for',
      },
      pro1: {
        name: 'pro1',
        faction: 'for',
      },
      con1: {
        name: 'con1',
        faction: 'against',
      },
      und1: {
        name: 'und1',
      },
      und2: {
        name: 'und2',
      },
      und3: {
        name: 'und3',
      },
    },
    demand: 'some demand',
  };
  result = violencelib.getFactionResult(gameState);
  result = gameState.messages['tribe'];

  expect(result).toContain(
    'und1, und2, und3 are not yet declared (for, against, neutral)'
  );
  expect(result).toContain('demander, pro1 are for the demand');
  expect(result).toContain('con1 is against the demand');
  expect(result).toContain('Nobody is unwilling to fight about it');
});

test('ResolveViolence first test', () => {
  withMockedRandom(0, () => {
    var gameState = {
      violence: 'test violence',
      population: {
        demander: {
          name: 'demander',
          faction: 'for',
          strategy: 'attack',
          attack_target: 'con1',
        },
        pro1: {
          name: 'pro1',
          faction: 'for',
          profession: 'hunter',
          gender: 'male',
          strategy: 'attack',
          attack_target: 'con1',
        },
        pro2: {
          name: 'pro2',
          profession: 'hunter',
          gender: 'male',
          faction: 'for',
          strategy: 'defend',
        },
        con1: {
          name: 'con1',
          faction: 'against',
          strategy: 'defend',
        },
        con2: {
          name: 'con2',
          faction: 'against',
          strategy: 'run',
        },
        con3: {
          name: 'con3',
          escaped: true,
        },
      },
      demand: 'some demand',
    };
    expected = 'Some violence output';
    var actual = violencelib.resolveViolence(gameState);
    actual = gameState.messages['tribe'];

    expect(gameState.population['con2'].escaped).toBeTruthy();
    expect(gameState.population['con2'].strategy).toBe('run');
    expect(actual).toContain('pro1 attacks con1');
    expect(actual).toContain('demander attacks con1');
    expect(actual).toContain('con1 attacks');
    expect(actual).toContain('con2 runs away from the fighting');
  });
});

test('escaped players with run strategy do not delay violence resolution', () => {
  withMockedRandom(0, () => {
    var gameState = {
      violence: 'test violence',
      population: {
        conEscaped: {
          name: 'conEscaped',
          faction: 'against',
          strategy: 'run',
          escaped: true,
        },
        proEscaped: {
          name: 'proEscaped',
          faction: 'for',
          strategy: 'run',
          escaped: true,
        },
      },
    };

    var response = violencelib.resolveViolence(gameState);

    expect(response).toContain('The violence has ended.');
    expect(response).not.toContain('still need to chose');
  });
});

test('resolveViolence broadcasts undecided strategy prompt to tribe messages', () => {
  withMockedRandom(0, () => {
    var gameState = {
      violence: 'test violence',
      messages: {},
      population: {
        pro1: {
          name: 'pro1',
          faction: 'for',
          strategy: 'attack',
          attack_target: 'con1',
        },
        con1: {
          name: 'con1',
          faction: 'against',
        },
      },
    };

    var response = violencelib.resolveViolence(gameState);

    expect(response).toContain('still need to chose');
    expect(gameState.messages.tribe).toContain('still need to chose');
    expect(gameState.messages.tribe).toContain('con1');
  });
});

test('conflict-end announces no winner when both factions escaped', () => {
  withMockedRandom(0, () => {
    var gameState = {
      violence: 'food sharing',
      messages: [],
      population: {
        conEscaped: { name: 'conEscaped', faction: 'against', strategy: 'run', escaped: true },
        proEscaped: { name: 'proEscaped', faction: 'for', strategy: 'run', escaped: true },
      },
    };

    violencelib.resolveViolence(gameState);

    const allMessages = gameState.messages.tribe || '';
    expect(allMessages).toContain('no clear winner');
    expect(gameState.violence).toBeUndefined();
  });
});

test('conflict-end announces FOR wins when against faction all escaped', () => {
  withMockedRandom(0, () => {
    var gameState = {
      violence: 'food sharing',
      messages: [],
      population: {
        conEscaped: { name: 'conEscaped', faction: 'against', escaped: true },
        proActive: { name: 'proActive', faction: 'for', strategy: 'defend' },
      },
    };

    violencelib.resolveViolence(gameState);

    const allMessages = gameState.messages.tribe || '';
    expect(allMessages).toContain('FOR faction wins');
    expect(gameState.violence).toBeUndefined();
  });
});

test('moreFactionViolenceRequired announces AGAINST wins when for faction eliminated', () => {
  withMockedRandom(0, () => {
    var gameState = {
      violence: 'food sharing',
      violenceRounds: 2,
      messages: [],
      population: {
        conActive: { name: 'conActive', faction: 'against' },
        proEscaped: { name: 'proEscaped', faction: 'for', escaped: true },
      },
    };

    // Trigger via resolveViolence with no attackers (everyone defends/escaped)
    gameState.population.conActive.strategy = 'defend';
    violencelib.resolveViolence(gameState);

    const allMessages = gameState.messages.tribe || '';
    expect(allMessages).toContain('AGAINST faction wins');
    expect(gameState.violence).toBeUndefined();
  });
});

test('ResolveViolence for fatality', () => {
  withMockedRandom(0, () => {
    var gameState = {
      violence: 'test violence',
      seasonCounter: 33,
      graveyard: {},
      population: {
        demander: {
          name: 'demander',
          faction: 'for',
          profession: 'hunter',
          spearhead: 1,
          strength: 'strong',
          strategy: 'attack',
          attack_target: 'con1x',
        },
        pro1: {
          name: 'pro1',
          faction: 'for',
          profession: 'hunter',
          spearhead: 1,
          strength: 'strong',
          profession: 'hunter',
          gender: 'male',
          strategy: 'attack',
          attack_target: 'con1x',
        },
        pro2: {
          name: 'pro2',
          profession: 'hunter',
          spearhead: 1,
          strength: 'strong',
          gender: 'male',
          faction: 'for',
          strategy: 'defend',
        },
        con1x: {
          name: 'con1x',
          faction: 'against',
          isInjured: true,
          strength: 'weak',
          strategy: 'defend',
        },
      },
      demand: 'some demand',
    };
    var actual = violencelib.resolveViolence(gameState);
    actual = gameState.messages['tribe'];

    expect(actual).toContain('demander attacks con1x');
    expect(actual).toContain('con1x is too weak to survive and is killed!');
    expect(gameState.messages['con1x']).toContain(
      'You were killed by demander in violence over "test violence".'
    );
  });
});
test('Faction Voting -> closely balanced For slightly ahead', () => {
  var gameState = {
    population: {
      demander: { name: 'demander', faction: 'for' },
      pro1: { name: 'pro1', faction: 'for' },
      pro2: { name: 'pro2', faction: 'for' },
      con1: { name: 'con1', faction: 'against' },
      con2: { name: 'con2', faction: 'against' },
    },
    demand: 'some demand',
  };
  var message =
    'Tribal society breaks down as VIOLENCE is required to settle the issue of some demand\n The demand is lost in the conflict.';
  violencelib.getFactionResult(gameState);
  var result = gameState.messages['tribe'];
  expect(result).toBe(message);
  expect(gameState.violence).toEqual('some demand');
});


test('Faction Voting -> closely balanced Against slightly ahead', () => {
  var gameState = {
    population: {
      demander: { name: 'demander', faction: 'for' },
      pro1: { name: 'pro1', faction: 'for' },
      con1: { name: 'con1', faction: 'against' },
      con2: { name: 'con2', faction: 'against' },
      con3: { name: 'con3', faction: 'against' },
    },
    demand: 'some demand',
  };
  var message =
    'Tribal society breaks down as VIOLENCE is required to settle the issue of some demand\n The demand is lost in the conflict.';
  violencelib.getFactionResult(gameState);
  var result = gameState.messages['tribe'];
  expect(result).toBe(message);
  expect(gameState.violence).toEqual('some demand');
});

test('resolveViolence uses violenceFactions when player faction fields are cleared', () => {
  withMockedRandom(0, () => {
    // Simulate full flow: getFactionResult clears faction fields, then resolveViolence uses violenceFactions
    var gameState = {
      population: {
        pro1: { name: 'pro1', faction: 'for' },
        pro2: { name: 'pro2', faction: 'for' },
        con1: { name: 'con1', faction: 'against' },
        con2: { name: 'con2', faction: 'against' },
      },
      demand: 'share fish',
      messages: {},
    };

    // Trigger violence - factions get cleared, violenceFactions is saved
    violencelib.getFactionResult(gameState);
    expect(gameState.violence).toBe('share fish');
    expect(gameState.violenceFactions).toEqual({
      pro1: 'for',
      pro2: 'for',
      con1: 'against',
      con2: 'against',
    });
    // All faction fields on players must be cleared
    for (const p of Object.values(gameState.population)) {
      expect(p.faction).toBeUndefined();
    }

    // Now resolve violence: con1 and con2 escape/flee, no attackers
    gameState.population.pro1.strategy = 'defend';
    gameState.population.pro2.strategy = 'defend';
    gameState.population.con1.escaped = true;
    gameState.population.con2.escaped = true;

    violencelib.resolveViolence(gameState);

    // FOR faction should win since all AGAINST members escaped
    expect(gameState.messages.tribe).toContain('FOR faction wins');
    expect(gameState.violence).toBeUndefined();
    expect(gameState.violenceFactions).toBeUndefined();
  });
});
