const career = require('../libs/career.js');

beforeEach(() => {
  career.configureUsersStore(null);
});

test('addFoodProduced accumulates on the player', () => {
  const player = {};
  career.addFoodProduced(player, 4);
  career.addFoodProduced(player, 6);
  career.addFoodProduced(player, 0);
  career.addFoodProduced(player, -1);
  expect(player.foodProduced).toBe(10);
});

test('countChildrenForParent counts births and grew-up flags', () => {
  const children = {
    a: { mother: 'Alice', father: 'Bob', newAdult: true },
    b: { mother: 'Alice', father: 'Carl', newAdult: false },
    c: { mother: 'Dana', father: 'Bob', newAdult: true },
  };
  expect(career.countChildrenForParent('Alice', children)).toEqual({
    children: 2,
    childrenGrewUp: 1,
  });
  expect(career.countChildrenForParent('bob', children)).toEqual({
    children: 2,
    childrenGrewUp: 2,
  });
});

test('buildGameSummaries includes alive, dead, and banished adults', () => {
  const gameState = {
    name: 'bear',
    seasonCounter: 10,
    tribeResult: 'Successful',
    population: {
      Alice: {
        name: 'Alice',
        profession: 'gatherer',
        foodProduced: 12,
        chief: true,
      },
    },
    banished: {
      Bob: { name: 'Bob', profession: 'hunter', foodProduced: 3 },
    },
    graveyard: {
      Carl: { name: 'Carl', profession: 'crafter', foodProduced: 0 },
      Cub: { name: 'Cub', age: 2, mother: 'Alice', father: 'Bob' },
    },
    children: {
      Kit: {
        name: 'Kit',
        mother: 'Alice',
        father: 'Bob',
        newAdult: true,
      },
    },
  };

  const summaries = career.buildGameSummaries(gameState);
  const byName = Object.fromEntries(
    summaries.map((s) => [s.playerName, s.game])
  );

  expect(byName.Alice.survived).toBe('alive');
  expect(byName.Alice.children).toBe(1);
  expect(byName.Alice.childrenGrewUp).toBe(1);
  expect(byName.Alice.foodProduced).toBe(12);
  expect(byName.Alice.chief).toBe(true);
  expect(byName.Alice.tribeResult).toBe('Successful');
  expect(byName.Alice.tribe).toBe('bear');
  expect(byName.Alice.seasons).toBe(10);

  expect(byName.Bob.survived).toBe('banished');
  expect(byName.Bob.children).toBe(1);

  expect(byName.Carl.survived).toBe('dead');
  expect(byName.Cub).toBeUndefined();
});

test('recordEndedGame updates matching users and career rollups', () => {
  const usersDict = {
    Alice: { name: 'Alice', password: '' },
    other: { name: 'other', password: '' },
  };
  let wrote = 0;
  const gameState = {
    name: 'flounder',
    seasonCounter: 8,
    tribeResult: 'Very successful',
    population: {
      Alice: {
        name: 'Alice',
        profession: 'gatherer',
        foodProduced: 20,
      },
      Ghost: { name: 'Ghost', profession: 'hunter', foodProduced: 5 },
    },
    banished: {},
    graveyard: {},
    children: {
      Kit: { mother: 'Alice', father: 'Ghost', newAdult: true },
      Pup: { mother: 'Alice', father: 'Ghost', newAdult: true },
    },
  };

  const result = career.recordEndedGame(gameState, {
    usersDict,
    writeUsers: () => {
      wrote += 1;
    },
  });

  expect(result.recorded).toBe(1);
  expect(result.skipped).toBe(1);
  expect(wrote).toBe(1);

  const careerData = usersDict.Alice.career;
  expect(careerData.gamesPlayed).toBe(1);
  expect(careerData.survived).toBe(1);
  expect(careerData.totalChildren).toBe(2);
  expect(careerData.maxChildren).toBe(2);
  expect(careerData.maxSeasons).toBe(8);
  expect(careerData.totalFoodProduced).toBe(20);
  expect(careerData.tribeResults['Very successful']).toBe(1);
  expect(careerData.games).toHaveLength(1);
  expect(careerData.games[0].tribe).toBe('flounder');
  expect(careerData.games[0].children).toBe(2);
  expect(usersDict.other.career).toBeUndefined();
});

test('recordEndedGame without store or deps is a no-op', () => {
  const result = career.recordEndedGame({
    name: 'x',
    population: { A: { name: 'A' } },
    children: {},
  });
  expect(result).toEqual({ recorded: 0, skipped: 0 });
});

test('formatIncarnationsMessage for empty career', () => {
  const msg = career.formatIncarnationsMessage(
    { name: 'Alice', career: career.ensureCareer({}) },
    'Alice'
  );
  expect(msg).toContain('Your incarnations');
  expect(msg).toContain('No finished games');
});

test('formatIncarnationsMessage includes rollups and recent games', () => {
  const user = { name: 'Alice' };
  const c = career.ensureCareer(user);
  career.applyGameToCareer(c, {
    tribe: 'bear',
    seasons: 10,
    tribeResult: 'Successful',
    survived: 'alive',
    children: 3,
    foodProduced: 20,
  });
  career.applyGameToCareer(c, {
    tribe: 'flounder',
    seasons: 4,
    tribeResult: 'Unsuccessful',
    survived: 'dead',
    children: 0,
    foodProduced: 5,
  });
  const msg = career.formatIncarnationsMessage(user, 'Alice');
  expect(msg).toContain('Games: 2');
  expect(msg).toContain('Children (lifetime): 3');
  expect(msg).toContain('best game: 3');
  expect(msg).toContain('bear');
  expect(msg).toContain('flounder');
  expect(msg).toContain('Successful');
});

test('formatIncarnationsMessage when user missing', () => {
  const msg = career.formatIncarnationsMessage(null, 'Ghost');
  expect(msg).toContain('No registered account');
  expect(msg).toContain('Ghost');
});

test('formatLifetimeChildrenBlurb includes this incarnation', () => {
  const user = { name: 'Alice' };
  const c = career.ensureCareer(user);
  career.applyGameToCareer(c, {
    tribe: 'bear',
    seasons: 8,
    tribeResult: 'Successful',
    survived: 'alive',
    children: 2,
    foodProduced: 10,
  });
  expect(career.formatLifetimeChildrenBlurb(user, 2)).toBe(
    'Your lifetime children: 2 (this incarnation: 2)'
  );
});

test('career games list is capped', () => {
  const usersDict = { Alice: { name: 'Alice' } };
  const gameState = {
    name: 't',
    seasonCounter: 1,
    tribeResult: 'Successful',
    population: { Alice: { name: 'Alice', foodProduced: 1 } },
    children: {},
    banished: {},
    graveyard: {},
  };

  for (let i = 0; i < career.MAX_GAMES + 5; i++) {
    gameState.seasonCounter = i + 1;
    career.recordEndedGame(gameState, {
      usersDict,
      writeUsers: () => {},
    });
  }

  expect(usersDict.Alice.career.games).toHaveLength(career.MAX_GAMES);
  expect(usersDict.Alice.career.gamesPlayed).toBe(career.MAX_GAMES + 5);
  expect(usersDict.Alice.career.games[0].seasons).toBe(career.MAX_GAMES + 5);
});
