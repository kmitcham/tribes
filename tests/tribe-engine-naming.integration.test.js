'use strict';

/**
 * Integration: drive reproduction through the TribeEngine and assert
 * delayed child naming (Mother's unborn at conception, real name+gender at birth,
 * adjacent letter buckets for twins).
 */

const dice = require('../libs/dice.js');
const allNames = require('../libs/names.json');
const { TribeEngine } = require('./harness/tribeEngine.js');

function letterBucketOf(name) {
  for (var i = 0; i < allNames.names.length; i++) {
    if (allNames.names[i].indexOf(name) !== -1) {
      return i;
    }
  }
  return -1;
}

describe('TribeEngine delayed child naming (reproduction)', () => {
  let engine;
  let rollSpy;

  beforeEach(async () => {
    // Mating: two d6 need sum >= 9 → always 6+6.
    // Chance / gather / birth: mid rolls (live single birth by default).
    rollSpy = jest.spyOn(dice, 'roll').mockImplementation((n) => {
      if (n === 1) {
        return 6;
      }
      if (n === 3) {
        return 10;
      }
      return 7;
    });

    engine = await TribeEngine.createOpenTribe({
      tribeName: 'itest-naming',
      players: [
        { name: 'Ada', gender: 'f', profession: 'gatherer' },
        { name: 'Bea', gender: 'f', profession: 'hunter' },
        { name: 'Cal', gender: 'm', profession: 'crafter' },
        { name: 'Dan', gender: 'm', profession: 'gatherer' },
      ],
    });
    await engine.electChief('Ada');
  });

  afterEach(() => {
    if (rollSpy) {
      rollSpy.mockRestore();
    }
  });

  async function clearRomanceLists() {
    // pass alone does not clear inviteList; join defaulted to !pass but Ada still
    // has Cal on her list after conceive — wipe lists so later seasons stay quiet.
    for (const name of engine.members()) {
      await engine.cmd(name, 'invite', { invitelist: ['!pass'] });
      await engine.cmd(name, 'consent', { consentlist: ['!none'] });
      const person = engine.player(name);
      if (person) {
        person.consentDict = {};
        person.inviteList = ['!pass'];
        person.cannotInvite = true;
      }
    }
  }

  async function conceiveAdaWithCal() {
    // Romance must be set before reproduction starts (join defaults to !pass,
    // which would complete mating immediately with no pregnancies).
    await engine.setupRomance({
      invites: { Ada: ['Cal'] },
      consents: { Cal: ['Ada'] },
      passers: ['Bea', 'Dan'],
    });
    await engine.runWorkSeason();
    expect(engine.gameState.matingComplete).toBe(true);
    expect(engine.player('Ada').isPregnant).toBe("Ada's unborn");
    await clearRomanceLists();
  }

  test("conception stores Mother's unborn without gender or counter bump", async () => {
    const counterBefore = engine.gameState.conceptionCounter;
    await conceiveAdaWithCal();

    const key = engine.player('Ada').isPregnant;
    expect(key).toBe("Ada's unborn");
    const child = engine.gameState.children[key];
    expect(child).toBeTruthy();
    expect(child.age).toBe(-2);
    expect(child.gender).toBeUndefined();
    expect(child.mother).toBe('Ada');
    expect(child.father).toBe('Cal');
    expect(engine.gameState.conceptionCounter).toBe(counterBefore);
    expect(engine.allMessages('tribe')).toMatch(
      /Ada has been blessed with a child/
    );
    expect(engine.allMessages('tribe')).not.toMatch(/Ada's unborn/);
  });

  test('birth assigns real name and gender; prenatal guards rekey', async () => {
    await conceiveAdaWithCal();
    await engine.finishReproductionSeason(12);

    // Guard the unborn during the work round when age is still -2 after
    // conception season; after first food age becomes -1 (assignable).
    // Advance one season to age -1, then guard, then birth season.
    await engine.runWorkSeason();
    await engine.finishReproductionSeason(12);

    const unbornKey = engine.player('Ada').isPregnant;
    expect(unbornKey).toBe("Ada's unborn");
    expect(engine.gameState.children[unbornKey].age).toBe(-1);

    await engine.as('Dan').guard({ child1: unbornKey });
    expect(engine.player('Dan').guarding).toContain(unbornKey);

    const counterBeforeBirth = engine.gameState.conceptionCounter;
    await engine.runWorkSeason();

    expect(engine.gameState.children["Ada's unborn"]).toBeUndefined();
    const born = engine.bornChildren();
    const bornNames = Object.keys(born);
    expect(bornNames.length).toBe(1);
    const babyName = bornNames[0];
    expect(babyName).not.toMatch(/'s unborn$/i);
    expect(born[babyName].gender).toMatch(/^(male|female)$/);
    expect(born[babyName].age).toBe(0);
    expect(engine.gameState.conceptionCounter).toBe(counterBeforeBirth + 1);
    expect(engine.player('Ada').isPregnant).toBeFalsy();
    expect(engine.player('Dan').guarding).toContain(babyName);
    expect(engine.player('Dan').guarding).not.toContain(unbornKey);
    expect(engine.allMessages('tribe')).toMatch(
      new RegExp('gives birth to a (male|female)-child, ' + babyName)
    );
  });

  test('twins get adjacent letter-bucket names', async () => {
    await conceiveAdaWithCal();
    await engine.finishReproductionSeason(12);
    await engine.runWorkSeason();
    await engine.finishReproductionSeason(12);

    // Force twin birth (3d6 == 17) on the next consume/birth.
    rollSpy.mockImplementation((n) => {
      if (n === 1) {
        return 6;
      }
      if (n === 3) {
        return 17;
      }
      return 7;
    });

    const counterBefore = engine.gameState.conceptionCounter;
    await engine.runWorkSeason();

    const born = engine.bornChildren();
    const bornNames = Object.keys(born).sort();
    expect(bornNames.length).toBe(2);
    expect(bornNames.every((n) => !/'s unborn$/i.test(n))).toBe(true);
    expect(engine.gameState.conceptionCounter).toBe(counterBefore + 2);

    const buckets = bornNames.map(letterBucketOf);
    expect(buckets[0]).toBeGreaterThanOrEqual(0);
    expect(buckets[1]).toBeGreaterThanOrEqual(0);
    // allocateChildName uses consecutive counters → adjacent letter indices.
    expect(Math.abs(buckets[0] - buckets[1])).toBe(1);

    expect(engine.player('Ada').guarding.length).toBeGreaterThanOrEqual(2);
    expect(engine.allMessages('tribe')).toMatch(/gives birth to a twin/i);
  });
});
