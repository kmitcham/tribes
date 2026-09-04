const factionCommand = require('../commands/conflict/faction.js');

describe('faction command', () => {
  test('does not rebroadcast faction summary when player submits same faction again', () => {
    const gameState = {
      demand: 'share the food',
      population: {
        eggplant: { name: 'eggplant', faction: 'for' },
        kevin: { name: 'Kevin', faction: 'against' },
        nopwd: { name: 'nopwd' },
      },
    };

    factionCommand.setFaction(gameState, 'eggplant', 'for');

    expect(gameState.messages.eggplant).toBe(
      'You are already in the for faction.'
    );
    expect(gameState.messages.tribe).toBeUndefined();
    expect(gameState.saveRequired).toBeUndefined();
  });

  test('prints side score when joining a side', () => {
    const gameState = {
      demand: 'share the food',
      population: {
        eggplant: { name: 'eggplant' },
        kevin: { name: 'kevin', faction: 'against' },
      },
    };

    factionCommand.setFaction(gameState, 'eggplant', 'for');

    expect(gameState.messages.tribe).toContain('FOR side score is now');
  });

  test('prints side scores for leave and join when switching sides', () => {
    const gameState = {
      demand: 'share the food',
      population: {
        eggplant: { name: 'eggplant', faction: 'for' },
        kevin: { name: 'kevin', faction: 'against' },
      },
    };

    factionCommand.setFaction(gameState, 'eggplant', 'against');

    expect(gameState.messages.tribe).toContain('FOR side score is now');
    expect(gameState.messages.tribe).toContain('AGAINST side score is now');
  });

  test('rejects non-member', () => {
    const gameState = {
      demand: 'share the food',
      population: {
        eggplant: { name: 'eggplant', faction: 'for' },
      },
      messages: {},
    };

    factionCommand.setFaction(gameState, 'outsider', 'for');

    expect(gameState.messages.outsider).toBe(
      'You are not a member of this tribe. Join if the tribe is open, or ask the chief to induct you.'
    );
    expect(gameState.population.outsider).toBeUndefined();
    expect(gameState.saveRequired).toBeUndefined();
  });
});

const violencelib = require('../libs/violence.js');

test('average strength is not a +1; sole crafter +2 is included in personal total (#194)', () => {
  const gameState = {
    demand: 'share food',
    population: {
      Claw: {
        name: 'Claw',
        gender: 'male',
        strength: 'average',
        canCraft: true,
        faction: 'for',
      },
    },
  };

  const alone = violencelib.getMemberFactionValueBreakdown(
    gameState.population.Claw,
    gameState,
    'for'
  );
  expect(alone.score).toBe(6); // male 4 + sole crafter 2 (no average bonus)
  expect(alone.parts.join(' ')).toMatch(/sole crafter/);
  expect(violencelib.getFactionScores(gameState).for).toBe(6);

  gameState.population.Goo = {
    name: 'Goo',
    gender: 'male',
    strength: 'average',
    faction: 'for',
  };
  const goo = violencelib.getMemberFactionValueBreakdown(
    gameState.population.Goo,
    gameState,
    'for'
  );
  expect(goo.score).toBe(4); // male only
  expect(violencelib.getFactionScores(gameState).for).toBe(10); // 4+4+2 sole craft
});

test('demand tells the demander their FOR starting score (#194)', () => {
  const gameState = {
    population: {
      Claw: {
        name: 'Claw',
        gender: 'male',
        strength: 'strong',
        canCraft: true,
      },
    },
    messages: {},
  };
  violencelib.demand('Claw', 'only hunters hunt', gameState);
  expect(gameState.messages.Claw).toMatch(/start the FOR faction with/);
  expect(gameState.messages.Claw).toMatch(/sole crafter|strong/);
});
