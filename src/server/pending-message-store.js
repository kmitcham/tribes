const pendingMessages = new Map(); // Map of playerName::tribeName -> Array<{ type, message, timestamp }>
const MAX_PENDING_MESSAGES_PER_PLAYER_TRIBE = 200;

function pendingMessageKey(playerName, tribeName, normalizeFn) {
  return `${normalizeFn(playerName)}::${normalizeFn(tribeName || 'bug')}`;
}

function queuePendingMessage(
  playerName,
  tribeName,
  payload,
  normalizeFn,
  logFn
) {
  if (!playerName || !payload || !payload.type || !payload.message) {
    return;
  }

  const key = pendingMessageKey(playerName, tribeName, normalizeFn);
  const queue = pendingMessages.get(key) || [];
  queue.push({
    type: payload.type,
    message: payload.message,
    timestamp: Date.now(),
  });

  const overflowCount = queue.length - MAX_PENDING_MESSAGES_PER_PLAYER_TRIBE;
  if (overflowCount > 0) {
    queue.splice(0, overflowCount);
    if (typeof logFn === 'function') {
      logFn(
        '[ERROR] Dropped pending messages due to per-player tribe queue limit',
        `player=${normalizeFn(playerName)}`,
        `tribe=${normalizeFn(tribeName || 'bug')}`,
        `dropped=${overflowCount}`,
        `limit=${MAX_PENDING_MESSAGES_PER_PLAYER_TRIBE}`
      );
    }
  }

  pendingMessages.set(key, queue);
}

function replayPendingMessages(
  ws,
  playerName,
  tribeName,
  clientId,
  normalizeFn,
  logFn,
  openState
) {
  if (!ws || ws.readyState !== openState || !playerName) {
    return;
  }

  const key = pendingMessageKey(playerName, tribeName, normalizeFn);
  const queue = pendingMessages.get(key);
  if (!queue || queue.length === 0) {
    return;
  }

  for (const pending of queue) {
    ws.send(
      JSON.stringify({
        type: pending.type,
        message: pending.message,
        replay: true,
        replayedAt: Date.now(),
        clientId,
      })
    );
  }

  pendingMessages.delete(key);

  if (typeof logFn === 'function') {
    logFn(
      `[REPLAY] Delivered ${queue.length} queued messages to ${playerName} for tribe ${tribeName || 'bug'}`
    );
  }
}

module.exports = {
  MAX_PENDING_MESSAGES_PER_PLAYER_TRIBE,
  pendingMessageKey,
  queuePendingMessage,
  replayPendingMessages,
};
