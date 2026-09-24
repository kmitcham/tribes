'use strict';

const tradeLib = require('../libs/trade.js');
const text = require('../libs/textprocess.js');

function baseState() {
  return {
    seasonCounter: 4,
    round: 'work',
    ended: false,
    population: {
      Ada: {
        name: 'Ada',
        food: 5,
        grain: 2,
        basket: 1,
        spearhead: 2,
        activity: 'idle',
      },
      Bob: {
        name: 'Bob',
        food: 3,
        grain: 1,
        basket: 2,
        spearhead: 1,
        activity: 'idle',
      },
      Cal: {
        name: 'Cal',
        food: 4,
        grain: 0,
        basket: 0,
        spearhead: 3,
        activity: 'idle',
      },
    },
    messages: {},
    saveRequired: false,
  };
}

beforeEach(() => {
  jest.spyOn(text, 'addMessage').mockImplementation((gs, who, msg) => {
    if (!gs.messages) gs.messages = {};
    const key = who || 'tribe';
    gs.messages[key] = (gs.messages[key] ? gs.messages[key] + '\n' : '') + msg;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('disallows same-item trades (e.g. food for food)', () => {
  const gs = baseState();
  expect(
    tradeLib.offerTrade(gs, 'Ada', 'Bob', 'food', 2, 'food', 1)
  ).toBe(false);
  expect(gs.population.Ada.outgoingTrade).toBeFalsy();
  expect(gs.messages.Ada).toMatch(/different items/i);
});

test('offer does not move inventory until accept', () => {
  const gs = baseState();
  expect(
    tradeLib.offerTrade(gs, 'Ada', 'Bob', 'food', 2, 'basket', 1)
  ).toBe(true);
  expect(gs.population.Ada.food).toBe(5);
  expect(gs.population.Bob.basket).toBe(2);
  expect(gs.population.Ada.outgoingTrade).toMatchObject({
    to: 'Bob',
    giveItem: 'food',
    giveAmount: 2,
    wantItem: 'basket',
    wantAmount: 1,
    season: 4,
  });
});

test('accept swaps both items and announces to tribe', () => {
  const gs = baseState();
  tradeLib.offerTrade(gs, 'Ada', 'Bob', 'food', 2, 'basket', 1);
  expect(tradeLib.acceptTrade(gs, 'Bob', 'Ada')).toBe(true);
  expect(gs.population.Ada.food).toBe(3);
  expect(gs.population.Ada.basket).toBe(2);
  expect(gs.population.Bob.food).toBe(5);
  expect(gs.population.Bob.basket).toBe(1);
  expect(gs.population.Ada.outgoingTrade).toBeFalsy();
  expect(gs.messages.tribe).toMatch(/🤝/);
  expect(gs.messages.tribe).toMatch(/Ada trades/);
});

test('accept leaves offer open if a side can no longer pay', () => {
  const gs = baseState();
  tradeLib.offerTrade(gs, 'Ada', 'Bob', 'food', 2, 'basket', 1);
  gs.population.Ada.food = 0;
  expect(tradeLib.acceptTrade(gs, 'Bob', 'Ada')).toBe(false);
  expect(gs.population.Ada.outgoingTrade).toBeTruthy();
  expect(gs.population.Bob.basket).toBe(2);
});

test('only one outstanding outgoing offer at a time', () => {
  const gs = baseState();
  expect(
    tradeLib.offerTrade(gs, 'Ada', 'Bob', 'food', 1, 'grain', 1)
  ).toBe(true);
  expect(
    tradeLib.offerTrade(gs, 'Ada', 'Cal', 'food', 1, 'spearhead', 1)
  ).toBe(false);
  expect(gs.population.Ada.outgoingTrade.to).toBe('Bob');
});

test('max two offers to the same person per season', () => {
  const gs = baseState();
  tradeLib.offerTrade(gs, 'Ada', 'Bob', 'food', 1, 'grain', 1);
  tradeLib.cancelTrade(gs, 'Ada');
  tradeLib.offerTrade(gs, 'Ada', 'Bob', 'food', 1, 'basket', 1);
  tradeLib.cancelTrade(gs, 'Ada');
  expect(
    tradeLib.offerTrade(gs, 'Ada', 'Bob', 'food', 1, 'spearhead', 1)
  ).toBe(false);
});

test('new season resets pair cap; stale pending offers expire', () => {
  const gs = baseState();
  tradeLib.offerTrade(gs, 'Ada', 'Bob', 'food', 1, 'grain', 1);
  tradeLib.cancelTrade(gs, 'Ada');
  tradeLib.offerTrade(gs, 'Ada', 'Bob', 'food', 1, 'basket', 1);
  // season advances
  gs.seasonCounter = 5;
  tradeLib.expireStaleTrades(gs);
  expect(gs.population.Ada.outgoingTrade).toBeFalsy();
  expect(
    tradeLib.offerTrade(gs, 'Ada', 'Bob', 'food', 1, 'grain', 1)
  ).toBe(true);
});

test('spearhead blocked after hunt in work round', () => {
  const gs = baseState();
  gs.population.Ada.activity = 'hunted';
  gs.population.Ada.spearhead = 1;
  expect(
    tradeLib.offerTrade(gs, 'Ada', 'Bob', 'spearhead', 1, 'food', 1)
  ).toBe(false);
});

test('reject notifies and frees outstanding slot', () => {
  const gs = baseState();
  tradeLib.offerTrade(gs, 'Ada', 'Bob', 'food', 1, 'grain', 1);
  expect(tradeLib.rejectTrade(gs, 'Bob', 'Ada')).toBe(true);
  expect(gs.population.Ada.outgoingTrade).toBeFalsy();
  expect(gs.messages.Ada).toMatch(/rejected/i);
  expect(
    tradeLib.offerTrade(gs, 'Ada', 'Cal', 'food', 1, 'spearhead', 1)
  ).toBe(true);
});

test('cancel notifies peer', () => {
  const gs = baseState();
  tradeLib.offerTrade(gs, 'Ada', 'Bob', 'food', 1, 'grain', 1);
  expect(tradeLib.cancelTrade(gs, 'Ada')).toBe(true);
  expect(gs.population.Ada.outgoingTrade).toBeFalsy();
  expect(gs.messages.Bob).toMatch(/cancelled/i);
});

test('clearTradesInvolving removes offers to a departed player', () => {
  const gs = baseState();
  tradeLib.offerTrade(gs, 'Ada', 'Bob', 'food', 1, 'grain', 1);
  delete gs.population.Bob;
  tradeLib.clearTradesInvolving(gs, 'Bob');
  expect(gs.population.Ada.outgoingTrade).toBeFalsy();
});
