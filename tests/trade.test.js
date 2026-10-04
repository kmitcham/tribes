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
  expect(tradeLib.listOutgoingTrades(gs.population.Ada)).toHaveLength(0);
  expect(gs.messages.Ada).toMatch(/different items/i);
});

test('offer does not move inventory until accept', () => {
  const gs = baseState();
  expect(
    tradeLib.offerTrade(gs, 'Ada', 'Bob', 'food', 2, 'basket', 1)
  ).toBe(true);
  expect(gs.population.Ada.food).toBe(5);
  expect(gs.population.Bob.basket).toBe(2);
  expect(tradeLib.listOutgoingTrades(gs.population.Ada)).toEqual([
    expect.objectContaining({
      to: 'Bob',
      giveItem: 'food',
      giveAmount: 2,
      wantItem: 'basket',
      wantAmount: 1,
      season: 4,
    }),
  ]);
});

test('accept swaps both items and announces to tribe', () => {
  const gs = baseState();
  tradeLib.offerTrade(gs, 'Ada', 'Bob', 'food', 2, 'basket', 1);
  expect(tradeLib.acceptTrade(gs, 'Bob', 'Ada')).toBe(true);
  expect(gs.population.Ada.food).toBe(3);
  expect(gs.population.Ada.basket).toBe(2);
  expect(gs.population.Bob.food).toBe(5);
  expect(gs.population.Bob.basket).toBe(1);
  expect(tradeLib.listOutgoingTrades(gs.population.Ada)).toHaveLength(0);
  expect(gs.messages.tribe).toMatch(/🤝/);
  expect(gs.messages.tribe).toMatch(/Ada trades/);
});

test('accept leaves offer open if a side can no longer pay', () => {
  const gs = baseState();
  tradeLib.offerTrade(gs, 'Ada', 'Bob', 'food', 2, 'basket', 1);
  gs.population.Ada.food = 0;
  expect(tradeLib.acceptTrade(gs, 'Bob', 'Ada')).toBe(false);
  expect(tradeLib.listOutgoingTrades(gs.population.Ada)).toHaveLength(1);
  expect(gs.population.Bob.basket).toBe(2);
});

test('allows two outstanding offers to different players', () => {
  const gs = baseState();
  expect(
    tradeLib.offerTrade(gs, 'Ada', 'Bob', 'food', 1, 'grain', 1)
  ).toBe(true);
  expect(
    tradeLib.offerTrade(gs, 'Ada', 'Cal', 'food', 1, 'spearhead', 1)
  ).toBe(true);
  const open = tradeLib.listOutgoingTrades(gs.population.Ada);
  expect(open).toHaveLength(2);
  expect(open.map((o) => o.to).sort()).toEqual(['Bob', 'Cal']);
});

test('blocks a third open offer and a second open offer to the same player', () => {
  const gs = baseState();
  expect(
    tradeLib.offerTrade(gs, 'Ada', 'Bob', 'food', 1, 'grain', 1)
  ).toBe(true);
  expect(
    tradeLib.offerTrade(gs, 'Ada', 'Bob', 'food', 1, 'basket', 1)
  ).toBe(false);
  expect(gs.messages.Ada).toMatch(/already have an outstanding trade offer to Bob/i);

  expect(
    tradeLib.offerTrade(gs, 'Ada', 'Cal', 'food', 1, 'spearhead', 1)
  ).toBe(true);
  // Need a fourth player for a third distinct target — reuse Bob after cancel instead:
  // with Bob+Cal open, cannot open a third even to a free peer if we had one.
  // Drop Cal and verify Bob+Cal still capped at 2 by attempting when both open:
  gs.population.Dan = {
    name: 'Dan',
    food: 2,
    grain: 2,
    basket: 1,
    spearhead: 1,
    activity: 'idle',
  };
  expect(
    tradeLib.offerTrade(gs, 'Ada', 'Dan', 'grain', 1, 'basket', 1)
  ).toBe(false);
  expect(gs.messages.Ada).toMatch(/only have 2 outstanding/i);
  expect(tradeLib.listOutgoingTrades(gs.population.Ada)).toHaveLength(2);
});

test('accepting one of two open offers leaves the other', () => {
  const gs = baseState();
  tradeLib.offerTrade(gs, 'Ada', 'Bob', 'food', 1, 'grain', 1);
  tradeLib.offerTrade(gs, 'Ada', 'Cal', 'food', 1, 'spearhead', 1);
  expect(tradeLib.acceptTrade(gs, 'Bob', 'Ada')).toBe(true);
  const open = tradeLib.listOutgoingTrades(gs.population.Ada);
  expect(open).toHaveLength(1);
  expect(open[0].to).toBe('Cal');
});

test('cancel with multiple open offers requires naming the player', () => {
  const gs = baseState();
  tradeLib.offerTrade(gs, 'Ada', 'Bob', 'food', 1, 'grain', 1);
  tradeLib.offerTrade(gs, 'Ada', 'Cal', 'food', 1, 'spearhead', 1);
  expect(tradeLib.cancelTrade(gs, 'Ada')).toBe(false);
  expect(gs.messages.Ada).toMatch(/multiple outstanding/i);
  expect(tradeLib.cancelTrade(gs, 'Ada', 'Bob')).toBe(true);
  const open = tradeLib.listOutgoingTrades(gs.population.Ada);
  expect(open).toHaveLength(1);
  expect(open[0].to).toBe('Cal');
});

test('legacy single outgoingTrade is still readable and clearable', () => {
  const gs = baseState();
  gs.population.Ada.outgoingTrade = {
    season: 4,
    to: 'Bob',
    giveItem: 'food',
    giveAmount: 1,
    wantItem: 'grain',
    wantAmount: 1,
  };
  expect(tradeLib.listOutgoingTrades(gs.population.Ada)).toHaveLength(1);
  expect(tradeLib.acceptTrade(gs, 'Bob', 'Ada')).toBe(true);
  expect(tradeLib.listOutgoingTrades(gs.population.Ada)).toHaveLength(0);
  expect(gs.population.Ada.outgoingTrade).toBeFalsy();
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
  expect(tradeLib.listOutgoingTrades(gs.population.Ada)).toHaveLength(0);
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

test('reject notifies offerer, rejecter, and tribe', () => {
  const gs = baseState();
  tradeLib.offerTrade(gs, 'Ada', 'Bob', 'food', 1, 'grain', 1);
  expect(tradeLib.rejectTrade(gs, 'Bob', 'Ada')).toBe(true);
  expect(tradeLib.listOutgoingTrades(gs.population.Ada)).toHaveLength(0);
  expect(gs.messages.Ada).toMatch(/Bob rejected your trade offer/i);
  expect(gs.messages.Bob).toMatch(/You rejected the trade offer from Ada/i);
  expect(gs.messages.tribe).toMatch(/🚫/);
  expect(gs.messages.tribe).toMatch(/Bob rejected Ada's trade offer/i);
  expect(
    tradeLib.offerTrade(gs, 'Ada', 'Cal', 'food', 1, 'spearhead', 1)
  ).toBe(true);
});

test('cancel notifies offerer, peer, and tribe', () => {
  const gs = baseState();
  tradeLib.offerTrade(gs, 'Ada', 'Bob', 'food', 1, 'grain', 1);
  expect(tradeLib.cancelTrade(gs, 'Ada')).toBe(true);
  expect(tradeLib.listOutgoingTrades(gs.population.Ada)).toHaveLength(0);
  expect(gs.messages.Ada).toMatch(/You cancelled your trade offer to Bob/i);
  expect(gs.messages.Bob).toMatch(/Ada cancelled their trade offer to you/i);
  expect(gs.messages.tribe).toMatch(/🚫/);
  expect(gs.messages.tribe).toMatch(
    /Ada cancelled their trade offer to Bob/i
  );
});

test('clearTradesInvolving removes offers to a departed player', () => {
  const gs = baseState();
  tradeLib.offerTrade(gs, 'Ada', 'Bob', 'food', 1, 'grain', 1);
  tradeLib.offerTrade(gs, 'Ada', 'Cal', 'food', 1, 'spearhead', 1);
  delete gs.population.Bob;
  tradeLib.clearTradesInvolving(gs, 'Bob');
  const open = tradeLib.listOutgoingTrades(gs.population.Ada);
  expect(open).toHaveLength(1);
  expect(open[0].to).toBe('Cal');
});

test('open anyone-offer posts to tribe and counts as one slot', () => {
  const gs = baseState();
  expect(
    tradeLib.offerTrade(gs, 'Ada', '!anyone', 'food', 2, 'basket', 1)
  ).toBe(true);
  const open = tradeLib.listOutgoingTrades(gs.population.Ada);
  expect(open).toHaveLength(1);
  expect(tradeLib.isOpenOffer(open[0])).toBe(true);
  expect(open[0].to).toBe(tradeLib.OPEN_OFFER_TO);
  expect(gs.messages.tribe).toMatch(/anyone who has it may Accept/i);
  // Still room for one directed offer
  expect(
    tradeLib.offerTrade(gs, 'Ada', 'Bob', 'food', 1, 'grain', 1)
  ).toBe(true);
  expect(tradeLib.listOutgoingTrades(gs.population.Ada)).toHaveLength(2);
});

test('open offer requires at least one eligible peer', () => {
  const gs = baseState();
  // Nobody has 99 baskets
  expect(
    tradeLib.offerTrade(gs, 'Ada', 'anyone', 'food', 1, 'basket', 99)
  ).toBe(false);
  expect(gs.messages.Ada).toMatch(/Nobody else currently has/i);
});

test('open offer first accept wins; second fails; reject blocked', () => {
  const gs = baseState();
  tradeLib.offerTrade(gs, 'Ada', '!anyone', 'food', 2, 'basket', 1);
  expect(tradeLib.rejectTrade(gs, 'Bob', 'Ada')).toBe(false);
  expect(gs.messages.Bob).toMatch(/cannot be rejected/i);
  expect(tradeLib.acceptTrade(gs, 'Bob', 'Ada')).toBe(true);
  expect(gs.population.Ada.food).toBe(3);
  expect(gs.population.Bob.basket).toBe(1);
  expect(tradeLib.listOutgoingTrades(gs.population.Ada)).toHaveLength(0);
  expect(tradeLib.acceptTrade(gs, 'Cal', 'Ada')).toBe(false);
  expect(gs.messages.Cal).toMatch(/already been taken|No outstanding/i);
});

test('cannot stack two open anyone-offers', () => {
  const gs = baseState();
  expect(
    tradeLib.offerTrade(gs, 'Ada', '!anyone', 'food', 1, 'basket', 1)
  ).toBe(true);
  expect(
    tradeLib.offerTrade(gs, 'Ada', '!anyone', 'grain', 1, 'spearhead', 1)
  ).toBe(false);
  expect(gs.messages.Ada).toMatch(/already have an open/i);
});

test('cancel open offer by !anyone notifies tribe', () => {
  const gs = baseState();
  tradeLib.offerTrade(gs, 'Ada', '!anyone', 'food', 1, 'basket', 1);
  expect(tradeLib.cancelTrade(gs, 'Ada', '!anyone')).toBe(true);
  expect(tradeLib.listOutgoingTrades(gs.population.Ada)).toHaveLength(0);
  expect(gs.messages.tribe).toMatch(/cancelled their open trade offer/i);
});
