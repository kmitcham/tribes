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
      'No tribe in this channel.  Do you want to /join and create one?'
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
});
