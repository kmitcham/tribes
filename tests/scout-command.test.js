const scoutCommand = require('../commands/general/scout.js');

describe('scout command overview option', () => {
  function createInteraction(displayName, values) {
    return {
      member: { displayName },
      options: {
        getString(name) {
          return Object.prototype.hasOwnProperty.call(values, name)
            ? values[name]
            : null;
        },
      },
    };
  }

  test('returns location to game track dictionary for location=overview', async () => {
    const gameState = {
      locationName: 'marsh',
      currentLocationName: 'marsh',
      gameTrack: {
        veldt: 1,
        forest: 2,
        marsh: 3,
        hills: 4,
      },
      messages: {},
    };

    const interaction = createInteraction('ScoutTester', {
      location: 'overview',
      nerd: 'all',
    });

    await scoutCommand.execute(interaction, gameState);

    expect(gameState.messages.ScoutTester).toBe(
      JSON.stringify({
        veldt: 1,
        forest: 2,
        marsh: 3,
        hills: 4,
      })
    );
    expect(gameState.messages.ScoutTester).not.toContain('Nerd Values');
    expect(gameState.messages.ScoutTester).not.toContain('resources are');
  });
});
