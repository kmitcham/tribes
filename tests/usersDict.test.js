'use strict';

const {
  collapseUsersCaseDuplicates,
  findStoredUserNameInDict,
} = require('../libs/usersDict.js');

describe('usersDict case collapse', () => {
  test('keeps first key and deletes later capitalization duplicates', () => {
    // Object key order: Ada then ADA then ada — keep Ada, drop the rest.
    const usersDict = {
      Ada: { name: 'Ada', password: 'keep', foodHint: 1 },
      ADA: { name: 'ADA', password: 'drop1' },
      ada: { name: 'ada', password: 'drop2' },
      Bob: { name: 'Bob', password: '' },
    };

    const result = collapseUsersCaseDuplicates(usersDict);

    expect(result.changed).toBe(true);
    expect(result.deleted.sort()).toEqual(['ADA', 'ada']);
    expect(Object.keys(usersDict).sort()).toEqual(['Ada', 'Bob']);
    expect(usersDict.Ada.password).toBe('keep');
    expect(result.kept.ada).toBe('Ada');
  });

  test('findStoredUserNameInDict returns the kept (first) casing', () => {
    const usersDict = {
      Ada: { name: 'Ada' },
      Bob: { name: 'Bob' },
    };
    expect(findStoredUserNameInDict(usersDict, 'ada')).toBe('Ada');
    expect(findStoredUserNameInDict(usersDict, 'ADA')).toBe('Ada');
    expect(findStoredUserNameInDict(usersDict, 'Bob')).toBe('Bob');
    expect(findStoredUserNameInDict(usersDict, 'nobody')).toBeNull();
  });

  test('idempotent when no duplicates', () => {
    const usersDict = { Ada: { name: 'Ada' }, Bob: { name: 'Bob' } };
    const result = collapseUsersCaseDuplicates(usersDict);
    expect(result.changed).toBe(false);
    expect(result.deleted).toEqual([]);
    expect(Object.keys(usersDict).sort()).toEqual(['Ada', 'Bob']);
  });
});
