/**
 * Which commands appear in a player's command list.
 * Server is source of truth; handlers still enforce on execute.
 */

/** Usable without being in the tribe population. */
const NON_MEMBER_COMMANDS = new Set([
  'join',
  'help',
  'status',
  'scout',
  'law',
  'graveyard',
  'history',
  'tribehistory',
  'incarnations',
  'lastgame',
  'ping',
  'rollsomedice',
]);

/** Replaced by UI panels / romance modal — never list. */
const ALWAYS_HIDDEN_COMMANDS = new Set([
  'invite',
  'consent',
  'decline',
  'children',
  'inventory',
]);

const REFEREE_ONLY_COMMANDS = new Set(['exportgame', 'importgame']);

/**
 * @param {string} name
 * @param {object} command - loaded command module (+ category)
 * @param {object} ctx
 * @param {boolean} ctx.isMember
 * @param {boolean} ctx.isRef
 * @param {boolean} ctx.canUseChiefCommands
 * @param {boolean} ctx.canCraft
 * @param {boolean} ctx.canJerky
 * @param {boolean} ctx.hasDemand
 * @param {boolean} ctx.hasViolence
 * @param {boolean} ctx.gameEnded
 */
function isCommandVisible(name, command, ctx) {
  if (!name || !command) {
    return false;
  }
  if (ALWAYS_HIDDEN_COMMANDS.has(name)) {
    return false;
  }

  const category = command.category || '';
  const desc =
    (command.data &&
      command.data.description &&
      String(command.data.description)) ||
    '';
  const refereeOnly =
    REFEREE_ONLY_COMMANDS.has(name) ||
    desc.toUpperCase().includes('REFEREE ONLY');

  if (refereeOnly) {
    return !!ctx.isRef;
  }

  // Chief category: chief or ref (refs may act without membership)
  if (category === 'chief') {
    return !!ctx.canUseChiefCommands;
  }

  // Non-members (including banished/departed): limited list only.
  if (!ctx.isMember) {
    return NON_MEMBER_COMMANDS.has(name);
  }

  // --- Members only below ---

  if (ctx.gameEnded) {
    const endedAllowed = new Set([
      'help',
      'status',
      'scout',
      'law',
      'graveyard',
      'history',
      'tribehistory',
      'incarnations',
      'lastgame',
      'ping',
      'rollsomedice',
      'scorechildren',
    ]);
    return endedAllowed.has(name);
  }

  if (name === 'join') {
    return false;
  }

  if (name === 'secrets' || name === 'craft') {
    return !!ctx.canCraft;
  }
  if (name === 'train') {
    return !ctx.canCraft;
  }

  if (name === 'jerky') {
    return !!ctx.canJerky;
  }

  if (name === 'attack' || name === 'defend' || name === 'run') {
    return !!ctx.hasViolence;
  }
  if (name === 'faction') {
    return !!ctx.hasDemand && !ctx.hasViolence;
  }
  if (name === 'demand') {
    return !ctx.hasViolence;
  }

  return true;
}

module.exports = {
  isCommandVisible,
  NON_MEMBER_COMMANDS,
  ALWAYS_HIDDEN_COMMANDS,
  REFEREE_ONLY_COMMANDS,
};
