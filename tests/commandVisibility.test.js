const {
  isCommandVisible,
  NON_MEMBER_COMMANDS,
} = require('../libs/commandVisibility.js');

function cmd(category, description) {
  return {
    category,
    data: { description: description || 'A command' },
  };
}

const baseMember = {
  isMember: true,
  isRef: false,
  canUseChiefCommands: false,
  canCraft: false,
  canJerky: false,
  hasDemand: false,
  hasViolence: false,
  gameEnded: false,
};

describe('commandVisibility', () => {
  test('non-members only get spectator/join set', () => {
    const ctx = { ...baseMember, isMember: false };
    expect(isCommandVisible('join', cmd('admin'), ctx)).toBe(true);
    expect(isCommandVisible('status', cmd('general'), ctx)).toBe(true);
    expect(isCommandVisible('hunt', cmd('work'), ctx)).toBe(false);
    expect(isCommandVisible('depart', cmd('general'), ctx)).toBe(false);
    expect(isCommandVisible('romance', cmd('reproduction'), ctx)).toBe(false);
    for (const name of NON_MEMBER_COMMANDS) {
      expect(isCommandVisible(name, cmd('general'), ctx)).toBe(true);
    }
  });

  test('non-member refs still get chief commands', () => {
    const ctx = {
      ...baseMember,
      isMember: false,
      isRef: true,
      canUseChiefCommands: true,
    };
    expect(isCommandVisible('startwork', cmd('chief'), ctx)).toBe(true);
    expect(isCommandVisible('hunt', cmd('work'), ctx)).toBe(false);
    expect(isCommandVisible('exportgame', cmd('admin', '[REFEREE ONLY] x'), ctx)).toBe(
      true
    );
  });

  test('members do not see join; non-members do', () => {
    expect(isCommandVisible('join', cmd('admin'), baseMember)).toBe(false);
    expect(
      isCommandVisible('join', cmd('admin'), { ...baseMember, isMember: false })
    ).toBe(true);
  });

  test('craft/secrets require canCraft; train when cannot craft', () => {
    expect(isCommandVisible('craft', cmd('work'), baseMember)).toBe(false);
    expect(isCommandVisible('secrets', cmd('admin'), baseMember)).toBe(false);
    expect(isCommandVisible('train', cmd('work'), baseMember)).toBe(true);

    const crafter = { ...baseMember, canCraft: true };
    expect(isCommandVisible('craft', cmd('work'), crafter)).toBe(true);
    expect(isCommandVisible('secrets', cmd('admin'), crafter)).toBe(true);
    expect(isCommandVisible('train', cmd('work'), crafter)).toBe(false);
  });

  test('jerky only when canJerky', () => {
    expect(isCommandVisible('jerky', cmd('general'), baseMember)).toBe(false);
    expect(
      isCommandVisible('jerky', cmd('general'), { ...baseMember, canJerky: true })
    ).toBe(true);
  });

  test('conflict commands follow demand/violence phase', () => {
    expect(isCommandVisible('attack', cmd('conflict'), baseMember)).toBe(false);
    expect(isCommandVisible('demand', cmd('conflict'), baseMember)).toBe(true);
    expect(isCommandVisible('faction', cmd('conflict'), baseMember)).toBe(false);

    const demand = { ...baseMember, hasDemand: true };
    expect(isCommandVisible('faction', cmd('conflict'), demand)).toBe(true);
    expect(isCommandVisible('attack', cmd('conflict'), demand)).toBe(false);

    const violence = { ...baseMember, hasDemand: true, hasViolence: true };
    expect(isCommandVisible('attack', cmd('conflict'), violence)).toBe(true);
    expect(isCommandVisible('faction', cmd('conflict'), violence)).toBe(false);
    expect(isCommandVisible('demand', cmd('conflict'), violence)).toBe(false);
  });

  test('always hides romance list commands and panel duplicates', () => {
    expect(isCommandVisible('invite', cmd('reproduction'), baseMember)).toBe(
      false
    );
    expect(isCommandVisible('inventory', cmd('general'), baseMember)).toBe(
      false
    );
  });

  test('ended game trims to read-only style commands', () => {
    const ended = { ...baseMember, gameEnded: true, canCraft: true };
    expect(isCommandVisible('hunt', cmd('work'), ended)).toBe(false);
    expect(isCommandVisible('craft', cmd('work'), ended)).toBe(false);
    expect(isCommandVisible('status', cmd('general'), ended)).toBe(true);
    expect(isCommandVisible('scorechildren', cmd('reproduction'), ended)).toBe(
      true
    );
  });

  test('chief commands require chief privileges flag', () => {
    expect(isCommandVisible('banish', cmd('chief'), baseMember)).toBe(false);
    expect(
      isCommandVisible('banish', cmd('chief'), {
        ...baseMember,
        canUseChiefCommands: true,
      })
    ).toBe(true);
  });
});
