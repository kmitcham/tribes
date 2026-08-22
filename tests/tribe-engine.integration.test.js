'use strict';

/**
 * Integration smoke: four players join, elect a chief, work, advance round.
 * Uses the in-process TribeEngine (real commands, no WebSocket).
 */

const { TribeEngine } = require('./harness/tribeEngine.js');

describe('TribeEngine four-player season start', () => {
  let engine;

  beforeEach(async () => {
    engine = await TribeEngine.createOpenTribe({
      tribeName: 'itest-four',
      players: [
        { name: 'Ada', gender: 'f', profession: 'gatherer' },
        { name: 'Bea', gender: 'f', profession: 'hunter' },
        { name: 'Cal', gender: 'm', profession: 'crafter' },
        { name: 'Dan', gender: 'm', profession: 'gatherer' },
      ],
    });
  });

  test('four players join an open tribe', () => {
    expect(engine.members().sort()).toEqual(['Ada', 'Bea', 'Cal', 'Dan']);
    expect(engine.player('Ada').gender).toBe('female');
    expect(engine.player('Cal').gender).toBe('male');
    expect(engine.player('Ada').profession).toBe('gatherer');
    expect(engine.gameState.open).toBe(true);
    expect(engine.gameState.workRound).toBe(true);
    expect(engine.chief()).toBeNull();
  });

  test('electChief installs chief with 2/3 support', async () => {
    await engine.electChief('Ada');

    expect(engine.chief()).toBe('Ada');
    expect(engine.player('Ada').chief).toBe(true);
    expect(engine.player('Bea').chief).toBeFalsy();
    // Last vote step cleared messages; re-read after a no-op-free check on history.
    const voteSteps = engine.history.filter((s) => s.command === 'vote');
    expect(voteSteps.length).toBeGreaterThanOrEqual(3);
  });

  test('join → elect → gather → startfood leaves work round', async () => {
    await engine.electChief('Ada');
    expect(engine.tribeMessages()).toMatch(/Ada is the new chief/i);

    // Deterministic gathers (force die).
    await engine.as('Ada').gather({ force: 12 });
    await engine.as('Bea').gather({ force: 12 });
    await engine.as('Cal').gather({ force: 12 });
    await engine.as('Dan').gather({ force: 12 });

    for (const name of ['Ada', 'Bea', 'Cal', 'Dan']) {
      expect(engine.player(name).worked).toBe(true);
    }

    await engine.advanceFromWork();

    expect(engine.gameState.workRound).toBe(false);
    // Food may auto-advance to reproduction if everyone already has enough food.
    expect(
      engine.gameState.foodRound || engine.gameState.reproductionRound
    ).toBe(true);
  });

  test('advanceround blocks until everyone works; startfood can skip ahead', async () => {
    await engine.electChief('Ada');
    await engine.as('Ada').gather({ force: 12 });
    await engine.as('Bea').gather({ force: 12 });
    // Cal and Dan left unworked.

    await engine.as('Ada').cmd('advanceround');
    expect(engine.gameState.workRound).toBe(true);
    expect(engine.messages('Ada')).toMatch(/have not worked yet/i);
    expect(engine.messages('Ada')).toMatch(/Cal|Dan/);

    await engine.advanceFromWork(); // startfood — allowed without full work
    expect(engine.gameState.workRound).toBe(false);
    expect(
      engine.gameState.foodRound || engine.gameState.reproductionRound
    ).toBe(true);
  });

  test('as() actor helpers expose cmd aliases', async () => {
    await engine.electChief('Cal');
    const step = await engine.as('Cal').idle({});
    expect(step.command).toBe('idle');
    expect(engine.player('Cal').worked).toBe(true);
  });
});
