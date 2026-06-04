const tribeHistory = require('../libs/tribeHistory.js');
const text = require('../libs/textprocess.js');
const pop = require('../libs/population.js');

jest.mock('../libs/textprocess.js');
jest.mock('../libs/population.js');

describe('tribeHistory.js', () => {
  let gameState;
  const playerName = 'TestPlayer';

  beforeEach(() => {
    gameState = {
      tribeHistory: [],
      clan: [],
    };
    jest.clearAllMocks();
  });

  test('should handle missing gameState', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    tribeHistory.showTribeHistory(playerName, null);

    expect(consoleSpy).toHaveBeenCalledWith(
      'showTribeHistory called with no gameState'
    );
    expect(text.addMessage).toHaveBeenCalledWith(
      null,
      playerName,
      'No tribe in this channel.  Do you want to join and create one?'
    );
    consoleSpy.mockRestore();
  });

  test('should reject player with no history', () => {
    pop.memberByName.mockReturnValue(null);
    pop.deadOrBanishedByName.mockReturnValue(null);

    tribeHistory.showTribeHistory(playerName, gameState);

    expect(text.addMessage).toHaveBeenCalledWith(
      gameState,
      playerName,
      'You have no history with this tribe'
    );
  });

  test('should state if tribe has no recorded history yet', () => {
    pop.memberByName.mockReturnValue({ name: playerName });
    gameState.tribeHistory = [];

    tribeHistory.showTribeHistory(playerName, gameState);

    expect(text.addMessage).toHaveBeenCalledWith(
      gameState,
      playerName,
      'The tribe has no recorded history yet.'
    );
  });

  test('should display messages if player is active member', () => {
    pop.memberByName.mockReturnValue({ name: playerName });
    gameState.tribeHistory = ['Event 1', 'Event 2'];

    tribeHistory.showTribeHistory(playerName, gameState);

    expect(text.addMessage).toHaveBeenCalledWith(
      gameState,
      playerName,
      'Event 1'
    );
    expect(text.addMessage).toHaveBeenCalledWith(
      gameState,
      playerName,
      'Event 2'
    );
    expect(text.addMessage).toHaveBeenCalledTimes(2);
  });

  test('should display messages if player is dead or banished', () => {
    pop.memberByName.mockReturnValue(null);
    pop.deadOrBanishedByName.mockReturnValue({ name: playerName });
    gameState.tribeHistory = ['Event A'];

    tribeHistory.showTribeHistory(playerName, gameState);

    expect(text.addMessage).toHaveBeenCalledWith(
      gameState,
      playerName,
      'Event A'
    );
  });

  test('showCombinedHistory should search both personal and tribe history', () => {
    gameState.seasonCounter = 20;
    gameState.tribeHistory = ['8: Kevin goes hunting in the marsh'];
    pop.memberByName.mockReturnValue({
      name: playerName,
      history: ['8.5: Kevin gathers grain'],
    });

    tribeHistory.showCombinedHistory(playerName, gameState, 'all', 5);

    expect(text.addMessage).toHaveBeenCalledWith(
      gameState,
      playerName,
      '[Your history] 8.5: Kevin gathers grain'
    );
    expect(text.addMessage).toHaveBeenCalledWith(
      gameState,
      playerName,
      '[Tribe history] 8: Kevin goes hunting in the marsh'
    );
  });

  test('showCombinedHistory should filter by subject keyword', () => {
    gameState.seasonCounter = 20;
    gameState.tribeHistory = ['8: Kevin goes hunting in the marsh'];
    pop.memberByName.mockReturnValue({
      name: playerName,
      history: ['8.5: Kevin gathers grain'],
    });

    tribeHistory.showCombinedHistory(playerName, gameState, 'hunting', 5);

    expect(text.addMessage).toHaveBeenCalledWith(
      gameState,
      playerName,
      '[Tribe history] 8: Kevin goes hunting in the marsh'
    );
    expect(text.addMessage).not.toHaveBeenCalledWith(
      gameState,
      playerName,
      '[Your history] 8.5: Kevin gathers grain'
    );
  });

  test('showCombinedHistory should filter by years back', () => {
    gameState.seasonCounter = 20; // current year = 10
    gameState.tribeHistory = ['6.5: old event', '9.5: recent event'];
    pop.memberByName.mockReturnValue({
      name: playerName,
      history: ['9: personal recent event'],
    });

    tribeHistory.showCombinedHistory(playerName, gameState, 'all', 1);

    expect(text.addMessage).toHaveBeenCalledWith(
      gameState,
      playerName,
      '[Your history] 9: personal recent event'
    );
    expect(text.addMessage).toHaveBeenCalledWith(
      gameState,
      playerName,
      '[Tribe history] 9.5: recent event'
    );
    expect(text.addMessage).not.toHaveBeenCalledWith(
      gameState,
      playerName,
      '[Tribe history] 6.5: old event'
    );
  });

  test('showCombinedHistory chance filter should ignore non-chance references', () => {
    gameState.seasonCounter = 20;
    gameState.tribeHistory = [
      '9: Food round results: ... After chance, the tribe can decide to move.',
      '9: Time for chance.',
      '9: Chance 14: Rats! Food spoils.',
    ];
    pop.memberByName.mockReturnValue({
      name: playerName,
      history: [],
    });

    tribeHistory.showCombinedHistory(playerName, gameState, 'chance', 5);

    expect(text.addMessage).toHaveBeenCalledWith(
      gameState,
      playerName,
      '[Tribe history] 9: Chance 14: Rats! Food spoils.'
    );
    expect(text.addMessage).not.toHaveBeenCalledWith(
      gameState,
      playerName,
      '[Tribe history] 9: Food round results: ... After chance, the tribe can decide to move.'
    );
  });

  test('showCombinedHistory should prepend History:<option> when options are used', () => {
    gameState.seasonCounter = 20;
    gameState.tribeHistory = ['9: Chance 14: Rats!'];
    pop.memberByName.mockReturnValue({
      name: playerName,
      history: [],
    });

    tribeHistory.showCombinedHistory(playerName, gameState, 'chance', 2);

    expect(text.addMessage).toHaveBeenNthCalledWith(
      1,
      gameState,
      playerName,
      'History:chance years_back=2'
    );
  });

  test('showCombinedHistory give filter should ignore gives birth', () => {
    gameState.seasonCounter = 20;
    gameState.tribeHistory = [
      '9: Kevin gives ursa 8 food',
      '9: eggplant gives birth to a male-child, Jade',
    ];
    pop.memberByName.mockReturnValue({
      name: playerName,
      history: [],
    });

    tribeHistory.showCombinedHistory(playerName, gameState, 'give', 5);

    expect(text.addMessage).toHaveBeenCalledWith(
      gameState,
      playerName,
      '[Tribe history] 9: Kevin gives ursa 8 food'
    );
    expect(text.addMessage).not.toHaveBeenCalledWith(
      gameState,
      playerName,
      '[Tribe history] 9: eggplant gives birth to a male-child, Jade'
    );
  });
});
