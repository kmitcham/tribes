'use strict';

/**
 * In-process tribe integration harness.
 * Drives real command modules against an ephemeral gameState (no WebSocket, no disk).
 */

const fs = require('fs');
const path = require('path');
const {
  createMockInteraction,
} = require('../../src/server/interaction-factory.js');
const locations = require('../../libs/locations.json');

let cachedCommands = null;

function loadCommandMap() {
  if (cachedCommands) {
    return cachedCommands;
  }
  const commands = new Map();
  const commandsPath = path.join(__dirname, '..', '..', 'commands');
  const folders = fs.readdirSync(commandsPath);
  for (const folder of folders) {
    const folderPath = path.join(commandsPath, folder);
    if (!fs.statSync(folderPath).isDirectory()) {
      continue;
    }
    const files = fs
      .readdirSync(folderPath)
      .filter((file) => file.endsWith('.js'));
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      try {
        const command = require(filePath);
        if (command && command.data && typeof command.execute === 'function') {
          commands.set(command.data.name, {
            ...command,
            category: folder,
            filepath: filePath,
          });
        }
      } catch (err) {
        // Skip broken command files; production loadCommands logs similarly.
        console.warn(
          '[tribeEngine] skip command ' + filePath + ': ' + err.message
        );
      }
    }
  }
  cachedCommands = commands;
  return commands;
}

/**
 * Same shape as save.initGame, but never writes tribe-data/.
 */
function createEphemeralGame(tribeName) {
  const name = tribeName || 'itest-tribe';
  const gameState = {
    seasonCounter: 1,
    gameTrack: {},
    name: name,
    startStamp: new Date().toISOString(),
    secretMating: true,
    open: true,
    conceptionCounter: 0,
    consumed: 0,
    spoiled: 0,
    foodAcquired: 0,
    population: {},
    graveyard: {},
    children: {},
    messages: {},
    currentLocationName: 'veldt',
    round: 'work',
    workRound: true,
    foodRound: false,
    reproductionRound: false,
    needChanceRoll: true,
    matingComplete: false,
    canJerky: false,
    ended: false,
    demand: null,
    violence: null,
  };
  for (const locationName in locations) {
    gameState.gameTrack[locationName] = 1;
  }
  return gameState;
}

function createCapturingWs(playerName) {
  const sent = [];
  return {
    sent,
    playerName: playerName || null,
    send(raw) {
      try {
        sent.push(typeof raw === 'string' ? JSON.parse(raw) : raw);
      } catch (_err) {
        sent.push({ raw: raw });
      }
    },
  };
}

function normalizeMessages(value) {
  if (value == null) {
    return '';
  }
  if (Array.isArray(value)) {
    return value.join('\n');
  }
  return String(value);
}

class Actor {
  constructor(engine, playerName) {
    this.engine = engine;
    this.playerName = playerName;
  }

  cmd(command, parameters) {
    return this.engine.cmd(this.playerName, command, parameters);
  }

  gather(parameters) {
    return this.cmd('gather', parameters || {});
  }

  hunt(parameters) {
    return this.cmd('hunt', parameters || {});
  }

  idle(parameters) {
    return this.cmd('idle', parameters || {});
  }

  craft(parameters) {
    return this.cmd('craft', parameters || {});
  }

  guard(parameters) {
    return this.cmd('guard', parameters || {});
  }

  vote(candidate) {
    return this.cmd('vote', { candidate: candidate });
  }

  pass(parameters) {
    return this.cmd('pass', parameters || {});
  }

  feed(parameters) {
    return this.cmd('feed', parameters || {});
  }
}

class TribeEngine {
  /**
   * @param {{ tribeName?: string, gameState?: object, clearMessages?: boolean }} [opts]
   */
  static create(opts) {
    const options = opts || {};
    const gameState =
      options.gameState || createEphemeralGame(options.tribeName);
    return new TribeEngine(gameState, options);
  }

  /**
   * Create an open tribe and join the listed players.
   * @param {{ tribeName?: string, players: Array<{ name: string, gender: string, profession?: string }> }} opts
   */
  static async createOpenTribe(opts) {
    const options = opts || {};
    const engine = TribeEngine.create({ tribeName: options.tribeName });
    const players = options.players || [];
    for (const p of players) {
      await engine.join(p.name, {
        gender: p.gender,
        profession: p.profession,
      });
    }
    return engine;
  }

  constructor(gameState, opts) {
    this.gameState = gameState;
    this.commands = loadCommandMap();
    this.clearMessagesBeforeCmd =
      opts && opts.clearMessages === false ? false : true;
    this.lastWs = null;
    this.history = [];
    /** Accumulated tribe/private message text across cleared steps. */
    this.messageLog = [];
  }

  as(playerName) {
    return new Actor(this, playerName);
  }

  player(name) {
    const population = this.gameState.population || {};
    if (population[name]) {
      return population[name];
    }
    const lower = String(name).toLowerCase();
    for (const key in population) {
      if (String(key).toLowerCase() === lower) {
        return population[key];
      }
    }
    return null;
  }

  members() {
    return Object.keys(this.gameState.population || {});
  }

  chief() {
    const population = this.gameState.population || {};
    for (const name in population) {
      if (population[name] && population[name].chief) {
        return population[name].name || name;
      }
    }
    return null;
  }

  messages(who) {
    const key = who || 'tribe';
    return normalizeMessages(
      this.gameState.messages && this.gameState.messages[key]
    );
  }

  tribeMessages() {
    return this.messages('tribe');
  }

  /**
   * Run a real command as playerName.
   * @returns {Promise<{ ws: object, command: string, playerName: string }>}
   */
  async cmd(playerName, commandName, parameters) {
    const command = this.commands.get(commandName);
    if (!command) {
      throw new Error(
        'Unknown command "' +
          commandName +
          '". Loaded: ' +
          Array.from(this.commands.keys()).sort().join(', ')
      );
    }

    if (this.clearMessagesBeforeCmd) {
      this._archiveMessages();
      this.gameState.messages = {};
    }

    const ws = createCapturingWs(playerName);
    this.lastWs = ws;
    const data = {
      command: commandName,
      playerName: playerName,
      parameters: parameters || {},
      clientId: 'itest-' + playerName,
      tribe: this.gameState.name,
    };
    const interaction = createMockInteraction(data, ws, this.gameState);
    await command.execute(interaction, this.gameState, null);
    this._archiveMessages();

    const step = {
      playerName: playerName,
      command: commandName,
      parameters: parameters || {},
      wsSent: ws.sent.slice(),
    };
    this.history.push(step);
    return step;
  }

  _archiveMessages() {
    const messages = this.gameState.messages || {};
    for (const who in messages) {
      const text = normalizeMessages(messages[who]);
      if (text) {
        this.messageLog.push({ who: who, text: text });
      }
    }
  }

  allMessages(who) {
    const parts = this.messageLog
      .filter((entry) => !who || entry.who === who)
      .map((entry) => entry.text);
    const live = who ? this.messages(who) : this.tribeMessages();
    if (live) {
      parts.push(live);
    }
    return parts.join('\n');
  }

  async join(playerName, opts) {
    const options = opts || {};
    const gender = options.gender;
    if (!gender) {
      throw new Error('join requires gender ("m"/"f" or male/female)');
    }
    const params = { gender: gender };
    if (options.profession) {
      params.profession = options.profession;
    }
    return this.cmd(playerName, 'join', params);
  }

  /**
   * Cast votes until candidate has ≥ 2/3 of (tribeSize − drones).
   * Default voters: every living member (including the candidate).
   */
  async electChief(candidate, opts) {
    const options = opts || {};
    const population = this.gameState.population || {};
    if (!this.player(candidate)) {
      throw new Error('electChief: ' + candidate + ' is not in the tribe');
    }

    let voters = options.voters;
    if (!voters || voters.length === 0) {
      voters = Object.keys(population).filter((name) => !population[name].golem);
    }

    const tribeSize = Object.keys(population).length;
    let droneCount = 0;
    for (const name in population) {
      if (population[name].golem) {
        droneCount += 1;
      }
    }
    const needed = Math.ceil((2 / 3) * (tribeSize - droneCount));
    // vote() uses >= (2/3)*N which for 4 is >= 2.666… so 3 votes.
    // Math.ceil matches that integer threshold for whole tribe sizes.
    const threshold = (2 / 3) * (tribeSize - droneCount);
    if (voters.length < threshold) {
      throw new Error(
        'electChief: need at least ' +
          needed +
          ' votes for 2/3 of ' +
          (tribeSize - droneCount) +
          ' (got ' +
          voters.length +
          ' voters)'
      );
    }

    for (const voter of voters) {
      await this.cmd(voter, 'vote', { candidate: candidate });
      if (this.chief() === this.player(candidate).name) {
        break;
      }
    }

    if (this.chief() !== this.player(candidate).name) {
      throw new Error(
        'electChief: ' +
          candidate +
          ' did not become chief after votes (chief=' +
          this.chief() +
          ')'
      );
    }
    return this.chief();
  }

  async everyone(commandName, parameters) {
    const results = [];
    for (const name of this.members()) {
      results.push(await this.cmd(name, commandName, parameters));
    }
    return results;
  }

  /**
   * Chief runs startfood to leave the work round.
   * Food may auto-skip to reproduction if everyone is already fed.
   */
  async advanceFromWork() {
    const chiefName = this.chief();
    if (!chiefName) {
      throw new Error('advanceFromWork: no chief elected');
    }
    if (!this.gameState.workRound) {
      throw new Error('advanceFromWork: not in work round');
    }
    return this.cmd(chiefName, 'startfood', {});
  }

  async advanceFromFood() {
    const chiefName = this.chief();
    if (!chiefName) {
      throw new Error('advanceFromFood: no chief elected');
    }
    if (this.gameState.reproductionRound) {
      return null;
    }
    if (!this.gameState.foodRound) {
      throw new Error('advanceFromFood: not in food round');
    }
    return this.cmd(chiefName, 'advanceround', {});
  }

  /**
   * Ensure every child has at least `amount` food (prenatal starve otherwise).
   */
  ensureChildrenFed(amount) {
    const minFood = typeof amount === 'number' ? amount : 4;
    const children = this.gameState.children || {};
    for (const name in children) {
      const child = children[name];
      if (!child || child.dead) {
        continue;
      }
      if (typeof child.food !== 'number' || child.food < minFood) {
        child.food = minFood;
      }
    }
  }

  topUpAdultFood(amount) {
    const food = typeof amount === 'number' ? amount : 20;
    for (const name of this.members()) {
      const person = this.player(name);
      if (person) {
        person.food = Math.max(person.food || 0, food);
      }
    }
  }

  /**
   * Set invite/consent lists before reproduction starts.
   * Consent list must be names only (or Name:consent without spaces) —
   * "Ada: consent" splits on spaces and breaks parsing.
   *
   * @param {{ invites?: Object<string, string[]>, consents?: Object<string, string[]>, passers?: string[] }} spec
   */
  async setupRomance(spec) {
    const options = spec || {};
    const invites = options.invites || {};
    const consents = options.consents || {};
    const passers = options.passers || [];

    for (const name of passers) {
      await this.cmd(name, 'pass', {});
    }
    for (const inviter in invites) {
      const list = invites[inviter].slice();
      if (list.indexOf('!pass') === -1 && list.indexOf('pass') === -1) {
        list.push('!pass');
      }
      await this.cmd(inviter, 'invite', { invitelist: list });
    }
    for (const person in consents) {
      await this.cmd(person, 'consent', { consentlist: consents[person] });
    }
  }

  /**
   * Work round: everyone gathers (forced), top up food, advance into food/repro.
   */
  async runWorkSeason(opts) {
    const options = opts || {};
    const force = options.force != null ? options.force : 12;
    if (!this.gameState.workRound) {
      throw new Error('runWorkSeason: not in work round');
    }
    await this.everyone('gather', { force: force });
    this.topUpAdultFood(options.adultFood != null ? options.adultFood : 30);
    this.ensureChildrenFed(options.childFood != null ? options.childFood : 6);
    await this.advanceFromWork();
    if (this.gameState.foodRound) {
      this.ensureChildrenFed(options.childFood != null ? options.childFood : 6);
      await this.advanceFromFood();
    }
    if (!this.gameState.reproductionRound) {
      throw new Error(
        'runWorkSeason: expected reproduction round after advance (got work=' +
          this.gameState.workRound +
          ' food=' +
          this.gameState.foodRound +
          ')'
      );
    }
  }

  /**
   * Apply a fixed chance roll then return to work (skips referee-only force path).
   */
  async finishReproductionSeason(chanceRoll) {
    if (!this.gameState.reproductionRound) {
      throw new Error('finishReproductionSeason: not in reproduction round');
    }
    if (!this.gameState.matingComplete) {
      await this.everyone('pass', {});
    }
    if (!this.gameState.matingComplete) {
      throw new Error(
        'finishReproductionSeason: mating still incomplete after pass'
      );
    }
    const chiefLib = require('../../libs/chief.js');
    const roll = chanceRoll != null ? chanceRoll : 12;
    this._archiveMessages();
    this.gameState.messages = {};
    chiefLib.doChance(roll, this.gameState);
    this._archiveMessages();
    const chiefName = this.chief();
    await this.cmd(chiefName, 'startwork', {});
    if (!this.gameState.workRound) {
      throw new Error('finishReproductionSeason: failed to return to work');
    }
  }

  unbornChildren() {
    const children = this.gameState.children || {};
    const result = {};
    for (const key in children) {
      const child = children[key];
      if (child && typeof child.age === 'number' && child.age < 0) {
        result[key] = child;
      }
    }
    return result;
  }

  bornChildren() {
    const children = this.gameState.children || {};
    const result = {};
    for (const key in children) {
      const child = children[key];
      if (
        child &&
        !child.dead &&
        typeof child.age === 'number' &&
        child.age >= 0
      ) {
        result[key] = child;
      }
    }
    return result;
  }
}

module.exports = {
  TribeEngine,
};
