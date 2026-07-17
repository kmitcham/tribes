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
});
