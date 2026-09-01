'use strict';

/**
 * Collapse users.json entries that differ only by capitalization.
 * Keeps the first key Object.keys() returns for each lowercase name;
 * deletes later duplicates. Mutates usersDict in place.
 *
 * @returns {{ changed: boolean, deleted: string[], kept: Object<string,string> }}
 *   kept maps lowercase → retained key
 */
function collapseUsersCaseDuplicates(usersDict) {
  const result = { changed: false, deleted: [], kept: {} };
  if (!usersDict || typeof usersDict !== 'object' || Array.isArray(usersDict)) {
    return result;
  }

  const seenLower = {};
  for (const key of Object.keys(usersDict)) {
    if (!Object.prototype.hasOwnProperty.call(usersDict, key)) {
      continue;
    }
    if (usersDict[key] == null) {
      delete usersDict[key];
      result.changed = true;
      result.deleted.push(key);
      continue;
    }
    const lower = String(key).toLowerCase();
    if (seenLower[lower]) {
      delete usersDict[key];
      result.changed = true;
      result.deleted.push(key);
      continue;
    }
    seenLower[lower] = key;
    result.kept[lower] = key;
  }
  return result;
}
module.exports.collapseUsersCaseDuplicates = collapseUsersCaseDuplicates;

/**
 * Resolve a login/display name to the stored usersDict key (first case match).
 * @returns {string|null}
 */
function findStoredUserNameInDict(usersDict, name) {
  if (typeof name !== 'string') {
    return null;
  }
  const normalized = name.trim();
  if (!normalized || !usersDict) {
    return null;
  }
  if (usersDict[normalized]) {
    return normalized;
  }
  const lowered = normalized.toLowerCase();
  return (
    Object.keys(usersDict).find(
      (existingName) => existingName.toLowerCase() === lowered
    ) || null
  );
}
module.exports.findStoredUserNameInDict = findStoredUserNameInDict;
