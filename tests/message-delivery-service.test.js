'use strict';

const { sendGameMessages } = require('../src/server/message-delivery-service.js');

describe('sendGameMessages tribe delivery', () => {
  const OPEN = 1;
  const CLOSED = 3;

  function normalizePlayerName(name) {
    return String(name || '')
      .trim()
      .toLowerCase();
  }

  test('queues tribe message for population members who did not receive a live send', () => {
    const queued = [];
    const sent = [];
    const onlineWs = {
      readyState: OPEN,
      currentPlayer: 'Ada',
      currentTribe: 'bug',
      send(raw) {
        sent.push(JSON.parse(raw));
      },
    };

    const gameState = {
      messages: {
        tribe: 'Bob goes hunting.\n🚫🦌 No game.',
      },
      population: {
        Ada: { name: 'Ada' },
        Bob: { name: 'Bob' },
        Cal: { name: 'Cal' },
      },
    };

    sendGameMessages(
      onlineWs,
      gameState,
      { tribe: 'bug', playerName: 'Ada', clientId: 'c1' },
      {
        connectedClients: new Map(),
        tribeConnections: new Map([['bug', new Set([onlineWs])]]),
        pop: {
          getPopulationKey: (name) => name,
          memberByName: (name, gs) => gs.population[name] || null,
        },
        normalizePlayerName,
        queuePendingMessage: (player, tribe, payload) => {
          queued.push({ player, tribe, payload });
        },
        logWithTimestamp: () => {},
        openState: OPEN,
      }
    );

    expect(sent).toHaveLength(1);
    expect(sent[0].type).toBe('tribeMessage');
    // Ada got the live send; Bob and Cal should be queued.
    expect(queued.map((q) => q.player).sort()).toEqual(['Bob', 'Cal']);
    expect(queued[0].payload.message).toMatch(/No game/);
    expect(gameState.messages).toEqual({});
  });

  test('queues when the only tribe socket is not OPEN (half-open / closing)', () => {
    const queued = [];
    const zombieWs = {
      readyState: CLOSED,
      currentPlayer: 'Ada',
      currentTribe: 'bug',
      send() {
        throw new Error('should not send');
      },
    };

    const gameState = {
      messages: { tribe: 'Hunt missed while disconnecting' },
      population: {
        Ada: { name: 'Ada' },
      },
    };

    sendGameMessages(
      zombieWs,
      gameState,
      { tribe: 'bug', playerName: 'Ada', clientId: 'c1' },
      {
        connectedClients: new Map(),
        tribeConnections: new Map([['bug', new Set([zombieWs])]]),
        pop: {
          getPopulationKey: (name) => name,
          memberByName: (name, gs) => gs.population[name] || null,
        },
        normalizePlayerName,
        queuePendingMessage: (player, tribe, payload) => {
          queued.push({ player, tribe, payload });
        },
        logWithTimestamp: () => {},
        openState: OPEN,
      }
    );

    expect(queued).toHaveLength(1);
    expect(queued[0].player).toBe('Ada');
  });
});
