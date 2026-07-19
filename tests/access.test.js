const access = require('../libs/access.js');

// referees.json includes "Kevin" and "kevinmitcham"
describe('access helpers', () => {
  test('isNonMemberReferee is true for ref not in population', () => {
    const gameState = {
      population: {
        Alice: { name: 'Alice', chief: true },
      },
    };
    expect(access.isNonMemberReferee('Kevin', gameState)).toBe(true);
  });

  test('isNonMemberReferee is false when ref is a member', () => {
    const gameState = {
      population: {
        Kevin: { name: 'Kevin', profession: 'hunter' },
      },
    };
    expect(access.isNonMemberReferee('Kevin', gameState)).toBe(false);
  });

  test('isNonMemberReferee is false for non-refs', () => {
    const gameState = { population: {} };
    expect(access.isNonMemberReferee('Alice', gameState)).toBe(false);
  });

  test('canActAsChief is true for any referee', () => {
    expect(access.canActAsChief('Kevin', { population: {} })).toBe(true);
  });

  test('requireTribeMember sends private message when not a member', () => {
    const gameState = {
      population: { Alice: { name: 'Alice' } },
      messages: {},
    };
    expect(access.requireTribeMember(gameState, 'Outsider')).toBeNull();
    expect(gameState.messages.Outsider).toBe(access.NOT_IN_TRIBE_MESSAGE);
  });

  test('requireTribeMember returns the member when present', () => {
    const gameState = {
      population: { Alice: { name: 'Alice' } },
      messages: {},
    };
    const member = access.requireTribeMember(gameState, 'Alice');
    expect(member.name).toBe('Alice');
    expect(gameState.messages.Alice).toBeUndefined();
  });
});
