'use strict';

/**
 * Per-player+tribe message sync log.
 *
 * Every tribe/private message that a player should see is recorded here
 * (whether or not a live websocket got it). On reconnect / auth, clients
 * send their last stored message timestamp and receive only newer entries.
 *
 * This enables multi-device catch-up: desktop can be online while phone is
 * offline; when the phone authenticates it still gets the same messages.
 */
const pendingMessages = new Map(); // Map of playerName::tribeName -> Array<{ type, message, timestamp }>
const MAX_PENDING_MESSAGES_PER_PLAYER_TRIBE = 500;
const MAX_PENDING_MESSAGE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function pendingMessageKey(playerName, tribeName, normalizeFn) {
  return `${normalizeFn(playerName)}::${normalizeFn(tribeName || 'bug')}`;
}

function pruneQueue(queue, now = Date.now()) {
  const cutoff = now - MAX_PENDING_MESSAGE_AGE_MS;
  let pruned = queue.filter(
    (entry) => entry && Number(entry.timestamp) > cutoff
  );
  const overflowCount = pruned.length - MAX_PENDING_MESSAGES_PER_PLAYER_TRIBE;
  if (overflowCount > 0) {
    pruned = pruned.slice(overflowCount);
  }
  return pruned;
}

/**
 * Record a message for later catch-up sync.
 * Always append — live delivery is handled separately by the caller.
 */
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
  const timestamp = Number(payload.timestamp);
  queue.push({
    type: payload.type,
    message: payload.message,
    timestamp: Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Date.now(),
  });

  const pruned = pruneQueue(queue);
  const dropped = queue.length - pruned.length;
  if (dropped > 0 && typeof logFn === 'function') {
    logFn(
      '[ERROR] Dropped pending messages due to age/limit prune',
      `player=${normalizeFn(playerName)}`,
      `tribe=${normalizeFn(tribeName || 'bug')}`,
      `dropped=${dropped}`,
      `limit=${MAX_PENDING_MESSAGES_PER_PLAYER_TRIBE}`
    );
  }

  pendingMessages.set(key, pruned);
}

/**
 * Send recorded messages with timestamp > sinceTimestamp.
 * Does NOT clear the log (other devices still need catch-up).
 * Returns the newest timestamp sent (or sinceTimestamp if nothing sent).
 */
function replayPendingMessages(
  ws,
  playerName,
  tribeName,
  clientId,
  normalizeFn,
  logFn,
  openState,
  sinceTimestamp
) {
  if (!ws || ws.readyState !== openState || !playerName) {
    return Number(sinceTimestamp) || 0;
  }

  const key = pendingMessageKey(playerName, tribeName, normalizeFn);
  let queue = pendingMessages.get(key);
  if (!queue || queue.length === 0) {
    return Number(sinceTimestamp) || 0;
  }

  const now = Date.now();
  queue = pruneQueue(queue, now);
  pendingMessages.set(key, queue);

  const since = Number(sinceTimestamp);
  const sinceMs = Number.isFinite(since) && since > 0 ? since : 0;
  let newestSent = sinceMs;
  let sentCount = 0;

  for (const pending of queue) {
    const ts = Number(pending.timestamp) || 0;
    if (ts <= sinceMs) {
      continue;
    }
    ws.send(
      JSON.stringify({
        type: pending.type,
        message: pending.message,
        replay: true,
        // Original event time (when recorded), not delivery time.
        timestamp: ts || now,
        replayedAt: now,
        clientId,
      })
    );
    sentCount += 1;
    if (ts > newestSent) {
      newestSent = ts;
    }
  }

  if (sentCount > 0 && typeof logFn === 'function') {
    logFn(
      `[REPLAY] Delivered ${sentCount} queued messages to ${playerName} for tribe ${tribeName || 'bug'} (since=${sinceMs})`
    );
  }

  return newestSent;
}

/** Test helper: clear all in-memory queues. */
function clearAllPendingMessages() {
  pendingMessages.clear();
}

module.exports = {
  MAX_PENDING_MESSAGES_PER_PLAYER_TRIBE,
  MAX_PENDING_MESSAGE_AGE_MS,
  pendingMessageKey,
  queuePendingMessage,
  replayPendingMessages,
  clearAllPendingMessages,
};
