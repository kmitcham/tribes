const attackCommand = require('../commands/conflict/attack.js');

describe('attack command', () => {
  function createInteraction(actorName, targetDisplayName) {
    return {
      member: { displayName: actorName },
      options: {
        getMember(name) {
          if (name === 'target') {
            return { displayName: targetDisplayName };
          }
          return null;
        },
      },
    };
  }

  test('prevents player from attacking themselves', () => {
    const gameState = {
      population: {
        alice: {
          name: 'alice',
          faction: 'for',
          strategy: null,
        },
      },
      messages: {},
      violence: 'test demand',
      saveRequired: false,
    };

    const interaction = createInteraction('alice', 'alice');
    attackCommand.execute(interaction, gameState);

    expect(gameState.messages.alice).toBe('You cannot attack yourself.');
    expect(gameState.population.alice.strategy).toBeNull();
    expect(gameState.population.alice.attack_target).toBeUndefined();
  });

  test('allows valid attack on different player', () => {
    const gameState = {
      population: {
        alice: {
          name: 'alice',
          faction: 'for',
          strategy: null,
        },
        bob: {
          name: 'bob',
          faction: 'against',
          strategy: null,
        },
      },
      messages: {},
      violence: 'test demand',
      saveRequired: false,
    };

    const interaction = createInteraction('alice', 'bob');
    attackCommand.execute(interaction, gameState);

    expect(gameState.messages.alice).toContain(
      'If a fight happens, you will try to kill bob'
    );
    expect(gameState.population.alice.attack_target).toBe('bob');
    expect(gameState.population.alice.strategy).toBe('attack');
  });
});
