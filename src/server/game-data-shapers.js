const guardlib = require('../../libs/guardCode.js');

function removeClunkyKeys(population) {
  const cleanedPop = {};
  const clunkyKeys = [
    'handle',
    'history',
    'inviteIndex',
    'inviteList',
    'consentList',
    'declineList',
    'consentDict',
    'responseDict',
    'father',
    'hiddenPregnant',
  ];

  for (const [name, personData] of Object.entries(population || {})) {
    const cleaned = {};
    for (const [key, value] of Object.entries(personData)) {
      if (clunkyKeys.indexOf(key) === -1) {
        cleaned[key] = value;
      }
    }
    cleanedPop[name] = cleaned;
  }

  return cleanedPop;
}

function removeFatherReferences(children) {
  const cleanedChildren = {};
  const excludeKeys = ['father', 'fatherName', 'name'];

  for (const [name, childData] of Object.entries(children || {})) {
    const cleaned = {};
    for (const [key, value] of Object.entries(childData)) {
      if (excludeKeys.indexOf(key) === -1) {
        cleaned[key] = value;
      }
    }
    cleanedChildren[name] = cleaned;
  }

  return cleanedChildren;
}

function refreshChildGuardians(children, population) {
  guardlib.normalizeGuardAssignments(population || {}, children || {});
  for (const [childName, child] of Object.entries(children || {})) {
    // Threat scores only for born, non-adult children (0..23 seasons).
    if (
      !child ||
      !guardlib.isChildGuardThreatEligible ||
      !guardlib.isChildGuardThreatEligible(child)
    ) {
      if (child) {
        delete child.guardians;
      }
      continue;
    }

    guardlib.findGuardValueForChild(
      childName,
      population || {},
      children || {}
    );
  }

  return children;
}

module.exports = {
  removeClunkyKeys,
  removeFatherReferences,
  refreshChildGuardians,
};
