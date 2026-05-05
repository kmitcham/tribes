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
});