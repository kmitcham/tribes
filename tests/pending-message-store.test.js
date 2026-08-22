const {
  queuePendingMessage,
  replayPendingMessages,
  pendingMessageKey,
} = require('../src/server/pending-message-store.js');

describe('pending-message-store replay timestamps', () => {
  const normalize = (name) => String(name || '').toLowerCase();
  const OPEN = 1;

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
});
