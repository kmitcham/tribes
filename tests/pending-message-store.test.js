'use strict';

const {
  queuePendingMessage,
  replayPendingMessages,
  pendingMessageKey,
  clearAllPendingMessages,
} = require('../src/server/pending-message-store.js');

describe('pending-message-store replay timestamps', () => {
  const normalize = (name) => String(name || '').toLowerCase();
  const OPEN = 1;

  beforeEach(() => {
    clearAllPendingMessages();
  });

  test('replay includes original queue timestamp, not only delivery time', () => {
    const sent = [];
    const ws = {
      readyState: OPEN,
      send(raw) {
        sent.push(JSON.parse(raw));
      },
    };

    const originalTs = 1_700_000_000_000;
    const realNow = Date.now;
    let nowCalls = 0;
    Date.now = () => {
      nowCalls += 1;
      // First call is queue time, later calls are replayedAt
      return nowCalls === 1 ? originalTs : originalTs + 60_000;
    };

    try {
      queuePendingMessage(
        'Alice',
        'bug',
        { type: 'tribeMessage', message: 'Hunt results while offline' },
        normalize,
        null
      );

      replayPendingMessages(
        ws,
        'Alice',
        'bug',
        'client-1',
        normalize,
        null,
        OPEN
      );
    } finally {
      Date.now = realNow;
    }

    expect(sent).toHaveLength(1);
    expect(sent[0].replay).toBe(true);
    expect(sent[0].message).toBe('Hunt results while offline');
    expect(sent[0].timestamp).toBe(originalTs);
    expect(sent[0].replayedAt).toBe(originalTs + 60_000);
    expect(sent[0].timestamp).not.toBe(sent[0].replayedAt);
  });

  test('pendingMessageKey normalizes player and tribe', () => {
    expect(pendingMessageKey('Alice', 'Bug', normalize)).toBe('alice::bug');
  });

  test('replay since timestamp only sends newer messages and keeps the log', () => {
    const sent = [];
    const ws = {
      readyState: OPEN,
      send(raw) {
        sent.push(JSON.parse(raw));
      },
    };

    const oldTs = Date.now() - 60_000;
    const newTs = Date.now() - 10_000;

    queuePendingMessage(
      'Alice',
      'bug',
      {
        type: 'tribeMessage',
        message: 'old',
        timestamp: oldTs,
      },
      normalize,
      null
    );
    queuePendingMessage(
      'Alice',
      'bug',
      {
        type: 'tribeMessage',
        message: 'new',
        timestamp: newTs,
      },
      normalize,
      null
    );

    const newest = replayPendingMessages(
      ws,
      'Alice',
      'bug',
      'phone',
      normalize,
      null,
      OPEN,
      oldTs
    );

    expect(sent).toHaveLength(1);
    expect(sent[0].message).toBe('new');
    expect(sent[0].timestamp).toBe(newTs);
    expect(newest).toBe(newTs);

    // Log retained for another device
    const sent2 = [];
    const ws2 = {
      readyState: OPEN,
      send(raw) {
        sent2.push(JSON.parse(raw));
      },
    };
    replayPendingMessages(
      ws2,
      'Alice',
      'bug',
      'tablet',
      normalize,
      null,
      OPEN,
      0
    );
    expect(sent2).toHaveLength(2);
    expect(sent2.map((m) => m.message)).toEqual(['old', 'new']);
  });

  test('second replay with updated since sends nothing again', () => {
    const ws = {
      readyState: OPEN,
      send: jest.fn(),
    };
    const ts = Date.now() - 5_000;
    queuePendingMessage(
      'Bob',
      'bug',
      { type: 'privateMessage', message: 'hi', timestamp: ts },
      normalize,
      null
    );
    replayPendingMessages(ws, 'Bob', 'bug', 'c1', normalize, null, OPEN, 0);
    expect(ws.send).toHaveBeenCalledTimes(1);

    ws.send.mockClear();
    replayPendingMessages(ws, 'Bob', 'bug', 'c1', normalize, null, OPEN, ts);
    expect(ws.send).not.toHaveBeenCalled();
  });
});
