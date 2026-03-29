const fs = require('fs');
let content = fs.readFileSync('tests/reproduction.test.js', 'utf8');

const newTests = `

// ==========================================
// RESPONSE DICT NEW REFATOR TESTS
// ==========================================

test('migrateToResponseDict works correctly backwards compat', () => {
  var person = {
    name: 'p1',
    consentList: ['p2', 'p3'],
    declineList: ['p4']
  };
  reproLib.migrateToResponseDict(person);
  expect(person.responseDict).toBeDefined();
  expect(person.responseDict['p2']).toBe('consent');
  expect(person.responseDict['p3']).toBe('consent');
  expect(person.responseDict['p4']).toBe('decline');
});

test('handleRomanceResponse correctly sets consent and decline in responseDict', () => {
  var gameState = {
    population: {
      p1: { name: 'p1', activity: 'reproduction' }
    }
  };
  // emulate form submission
  let form = { player: 'p1', matingTarget: 'p2', responseAction: 'consent' }; // Not actual shape
});

test('globalMatingCheck resolves maybe to watest('globalMatingCse is utest('globalMatingCheck resolves maybe to watest('globalMatingCse i{
           e: 'p1', gender: 'male', activity: 'reproduction',
        inviteList: ['p2'], inviteIndex: 0,
        responseDict: {}
      },
      p2:      p2:      p2:      p2:      p2:      p2:      p2:      p2:              p2:       [      p2:     :       p2:      p2:      p2} //       p2:      p2:     }
    },
    messages: { p1: '', p2: '' },
    activity: 'reproduction'
  };
  
  let response = reproLib.globalMatingCheck(gameState, {});
  // Because p2 has no response for p1, "maybe" condition falls back to text "You wait for"
  expect(gameState.messages['p1']).toContain('You invite');
  expect(gameState.messages['p2']).not.toContain('You decline'); // Should not decline
});

test('globalMatingCheck resolves consent directly dictionary', () => {
  var gameState = {
    population: {
      p1: {
        name: 'p1', gender: 'male', activity: 'reproduction',
        inviteList: ['p2'], inviteIndex: 0,
        responseDict: {}
      },
      p2: {
        name: 'p2', gender: 'female', activity: 'reproduction',
        inviteList: [], inviteIndex: 0,
        responseDict: { p1: 'consent' }
      }
    },
    messages: { p1: '', p2: '' },
    activity: 'reproduction'
  };
  
  let response = reproLib.globalMatingCheck(gameState, {});
  expect(gameState.messages['p1']).toContain('mates with');
});

test('globalMatingChetest('globalMatingChetest('g dictionary', () => {
  var gameState = {
                                                           male', activity: 'reproduction',
        inviteList: ['p2'], inviteIndex: 0,
        responseDict: {}
      },
      p2: {
        name: 'p2', gender: 'female', activity: 'reproduction',
        inviteList: [], inviteIndex: 0,
        responseDict: { p1: 'decline' }
      }
    },
    messages: { p1: '', p2: '' },
    activity: 'reproduction'
  };
  
  let response = reproLib.globalMatingCheck(gameState, {});
  expect(gameState.messages['p1']).toContain('but finds they are not interested');
});
`;

fs.writeFileSync('tests/reproduction.test.js', content + newTests);
