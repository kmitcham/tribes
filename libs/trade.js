'use strict';

const text = require('./textprocess.js');
const pop = require('./population.js');
const general = require('./general.js');
const access = require('./access.js');

const MAX_OFFERS_PER_PAIR_PER_SEASON = 2;
const MAX_OPEN_OUTGOING_OFFERS = 2;

function currentSeason(gameState) {
  const n = Number(gameState && gameState.seasonCounter);
  return Number.isFinite(n) ? Math.floor(n) : 0;
}

function personKey(person, gameState) {
  return pop.getPopulationKey(person, gameState) || person.name;
}

function formatItemAmount(item, amount) {
  const icon = general.itemIcon(item);
  return amount + ' ' + item + (icon ? ' ' + icon : '');
}

/**
 * Normalize open outgoing offers.
 * Legacy saves used a single `outgoingTrade` object; current form is
 * `outgoingTrades` (array), capped at MAX_OPEN_OUTGOING_OFFERS.
 */
function listOutgoingTrades(person) {
  if (!person) {
    return [];
  }
  if (Array.isArray(person.outgoingTrades) && person.outgoingTrades.length > 0) {
    return person.outgoingTrades.filter(Boolean);
  }
  if (person.outgoingTrade) {
    return [person.outgoingTrade];
  }
  return [];
}

function setOutgoingTrades(person, trades) {
  if (!person) {
    return;
  }
  const cleaned = (trades || []).filter(Boolean);
  delete person.outgoingTrade;
  if (cleaned.length === 0) {
    delete person.outgoingTrades;
  } else {
    person.outgoingTrades = cleaned;
  }
}

function namesEqual(a, b) {
  return (
    String(a || '')
      .trim()
      .toLowerCase() ===
    String(b || '')
      .trim()
      .toLowerCase()
  );
}

function offerMatchesPeer(offer, peerName, peerPerson, gameState) {
  if (!offer) {
    return false;
  }
  const to = String(offer.to || '');
  if (namesEqual(to, peerName)) {
    return true;
  }
  if (peerPerson) {
    const key = personKey(peerPerson, gameState);
    if (namesEqual(to, key) || namesEqual(to, peerPerson.name)) {
      return true;
    }
  }
  return false;
}

function findOutgoingTradeTo(person, peerName, gameState) {
  const peer = pop.memberByName(peerName, gameState);
  return (
    listOutgoingTrades(person).find((offer) =>
      offerMatchesPeer(offer, peerName, peer, gameState)
    ) || null
  );
}

function removeOutgoingTrade(person, offerToRemove) {
  if (!person || !offerToRemove) {
    return false;
  }
  const before = listOutgoingTrades(person);
  const after = before.filter((offer) => offer !== offerToRemove);
  if (after.length === before.length) {
    // Fallback: match by peer + season if object identity differs
    const filtered = before.filter(
      (offer) =>
        !(
          namesEqual(offer.to, offerToRemove.to) &&
          Number(offer.season) === Number(offerToRemove.season) &&
          offer.giveItem === offerToRemove.giveItem &&
          offer.wantItem === offerToRemove.wantItem
        )
    );
    if (filtered.length === before.length) {
      return false;
    }
    setOutgoingTrades(person, filtered);
    return true;
  }
  setOutgoingTrades(person, after);
  return true;
}

function offersMadeToPeer(offerer, peerKey, season) {
  const bag = offerer.tradeOffersMade || {};
  const entry = bag[peerKey];
  if (!entry || Number(entry.season) !== season) {
    return 0;
  }
  return Number(entry.count) || 0;
}

function recordOfferMade(offerer, peerKey, season) {
  if (!offerer.tradeOffersMade) {
    offerer.tradeOffersMade = {};
  }
  const prev = offerer.tradeOffersMade[peerKey];
  if (!prev || Number(prev.season) !== season) {
    offerer.tradeOffersMade[peerKey] = { season: season, count: 1 };
  } else {
    offerer.tradeOffersMade[peerKey] = {
      season: season,
      count: (Number(prev.count) || 0) + 1,
    };
  }
}

function findIncomingOfferFrom(gameState, recipientName, offererName) {
  const offerer = pop.memberByName(offererName, gameState);
  const recipient = pop.memberByName(recipientName, gameState);
  if (!offerer || !recipient) {
    return null;
  }
  const offer = findOutgoingTradeTo(offerer, recipientName, gameState);
  if (!offer) {
    return null;
  }
  if (Number(offer.season) !== currentSeason(gameState)) {
    return null;
  }
  return { offerer: offerer, offer: offer };
}

/**
 * Expire all pending outgoing trades (season boundary).
 * Pair offer counts stay keyed by season so a new season starts fresh.
 */
function expireStaleTrades(gameState) {
  const population = gameState && gameState.population;
  if (!population) {
    return 0;
  }
  const season = currentSeason(gameState);
  let cleared = 0;
  for (const key of Object.keys(population)) {
    const person = population[key];
    if (!person) {
      continue;
    }
    const trades = listOutgoingTrades(person);
    if (trades.length === 0) {
      continue;
    }
    const kept = [];
    for (const offer of trades) {
      if (Number(offer.season) === season) {
        kept.push(offer);
        continue;
      }
      const peer = offer.to;
      cleared += 1;
      text.addMessage(
        gameState,
        person.name || key,
        'Your trade offer to ' +
          (peer || 'someone') +
          ' expired at the season change.'
      );
      if (peer) {
        text.addMessage(
          gameState,
          peer,
          'A trade offer from ' +
            (person.name || key) +
            ' expired at the season change.'
        );
      }
    }
    if (kept.length !== trades.length) {
      setOutgoingTrades(person, kept);
    }
  }
  return cleared;
}

/** Clear pending trades involving a removed player (death / depart). */
function clearTradesInvolving(gameState, playerName) {
  const population = gameState && gameState.population;
  if (!population || !playerName) {
    return;
  }
  const target = pop.memberByName(playerName, gameState);
  const targetKey = target ? personKey(target, gameState) : playerName;

  for (const key of Object.keys(population)) {
    const person = population[key];
    if (!person) {
      continue;
    }
    const trades = listOutgoingTrades(person);
    if (trades.length === 0) {
      continue;
    }
    const kept = [];
    let removed = false;
    for (const offer of trades) {
      if (offerMatchesPeer(offer, playerName, target, gameState) ||
          namesEqual(offer.to, targetKey)) {
        removed = true;
        text.addMessage(
          gameState,
          person.name || key,
          'Your trade offer to ' +
            playerName +
            ' was cancelled (they left the tribe).'
        );
      } else {
        kept.push(offer);
      }
    }
    if (removed) {
      setOutgoingTrades(person, kept);
    }
  }
}

function offerTrade(
  gameState,
  sourceName,
  targetName,
  giveItemRaw,
  giveAmountRaw,
  wantItemRaw,
  wantAmountRaw
) {
  if (gameState.ended) {
    text.addMessage(
      gameState,
      sourceName,
      'The game is over. Maybe you want to join to start a new game?'
    );
    return false;
  }

  const source = pop.memberByName(sourceName, gameState);
  if (!source) {
    text.addMessage(gameState, sourceName, access.NOT_IN_TRIBE_MESSAGE);
    return false;
  }
  const target = pop.memberByName(targetName, gameState);
  if (!target) {
    text.addMessage(
      gameState,
      sourceName,
      'Target ' + (targetName || '') + ' not found in tribe.'
    );
    return false;
  }
  if (source === target) {
    text.addMessage(
      gameState,
      sourceName,
      'You cannot trade with yourself.'
    );
    return false;
  }

  const openTrades = listOutgoingTrades(source);
  const peerKey = personKey(target, gameState);
  if (findOutgoingTradeTo(source, peerKey, gameState)) {
    text.addMessage(
      gameState,
      sourceName,
      'You already have an outstanding trade offer to ' +
        (target.name || peerKey) +
        '. Accept, reject, or cancel it first.'
    );
    return false;
  }
  if (openTrades.length >= MAX_OPEN_OUTGOING_OFFERS) {
    text.addMessage(
      gameState,
      sourceName,
      'You may only have ' +
        MAX_OPEN_OUTGOING_OFFERS +
        ' outstanding trade offers at a time (to different players). Cancel one first.'
    );
    return false;
  }

  const giveItem = general.normalizeItem(giveItemRaw);
  const wantItem = general.normalizeItem(wantItemRaw);
  if (!giveItem || !wantItem) {
    text.addMessage(
      gameState,
      sourceName,
      'Valid items are: food, grain, basket or spearhead.'
    );
    return false;
  }
  if (giveItem === wantItem) {
    text.addMessage(
      gameState,
      sourceName,
      'Trades must exchange different items (not ' +
        giveItem +
        ' for ' +
        wantItem +
        ').'
    );
    return false;
  }

  const giveAmount = Number(giveAmountRaw);
  const wantAmount = Number(wantAmountRaw);
  if (
    !Number.isFinite(giveAmount) ||
    giveAmount < 1 ||
    !Number.isFinite(wantAmount) ||
    wantAmount < 1
  ) {
    text.addMessage(
      gameState,
      sourceName,
      'Both give and want amounts must be positive numbers.'
    );
    return false;
  }

  const season = currentSeason(gameState);
  const made = offersMadeToPeer(source, peerKey, season);
  if (made >= MAX_OFFERS_PER_PAIR_PER_SEASON) {
    text.addMessage(
      gameState,
      sourceName,
      'You may only make ' +
        MAX_OFFERS_PER_PAIR_PER_SEASON +
        ' trade offers to ' +
        (target.name || peerKey) +
        ' this season.'
    );
    return false;
  }

  if (!general.legalGive(gameState, sourceName, giveItem, giveAmount)) {
    return false;
  }

  // Soft check: peer should have what you want (re-checked on accept).
  const peerHave = Number(target[wantItem]) || 0;
  if (peerHave < wantAmount) {
    text.addMessage(
      gameState,
      sourceName,
      (target.name || peerKey) +
        ' does not have ' +
        wantAmount +
        ' ' +
        wantItem +
        '.'
    );
    return false;
  }

  recordOfferMade(source, peerKey, season);
  const next = openTrades.slice();
  next.push({
    season: season,
    to: peerKey,
    giveItem: giveItem,
    giveAmount: giveAmount,
    wantItem: wantItem,
    wantAmount: wantAmount,
  });
  setOutgoingTrades(source, next);
  gameState.saveRequired = true;

  const summary =
    (source.name || sourceName) +
    ' offers ' +
    formatItemAmount(giveItem, giveAmount) +
    ' for ' +
    (target.name || peerKey) +
    "'s " +
    formatItemAmount(wantItem, wantAmount) +
    '.';

  text.addMessage(gameState, sourceName, 'Offer sent. ' + summary);
  text.addMessage(
    gameState,
    peerKey,
    'Trade offer received. ' +
      summary +
      ' Use trade accept/reject with player ' +
      (source.name || sourceName) +
      '.'
  );
  return true;
}

function acceptTrade(gameState, accepterName, offererName) {
  if (gameState.ended) {
    text.addMessage(
      gameState,
      accepterName,
      'The game is over. Maybe you want to join to start a new game?'
    );
    return false;
  }

  const found = findIncomingOfferFrom(gameState, accepterName, offererName);
  if (!found) {
    text.addMessage(
      gameState,
      accepterName,
      'No outstanding trade offer from ' + (offererName || 'that player') + '.'
    );
    return false;
  }

  const { offerer, offer } = found;
  const accepter = pop.memberByName(accepterName, gameState);

  // Re-validate both legs; leave offer open if either fails.
  if (
    !general.legalGive(
      gameState,
      offerer.name || offererName,
      offer.giveItem,
      offer.giveAmount
    )
  ) {
    text.addMessage(
      gameState,
      accepterName,
      'Trade cannot complete: ' +
        (offerer.name || offererName) +
        ' can no longer provide ' +
        formatItemAmount(offer.giveItem, offer.giveAmount) +
        '. Offer left open.'
    );
    return false;
  }
  if (
    !general.legalGive(
      gameState,
      accepter.name || accepterName,
      offer.wantItem,
      offer.wantAmount
    )
  ) {
    // legalGive already messaged accepter about their shortfall
    text.addMessage(
      gameState,
      accepterName,
      'Trade cannot complete yet. Offer left open.'
    );
    return false;
  }

  offerer[offer.giveItem] -= offer.giveAmount;
  accepter[offer.giveItem] =
    (Number(accepter[offer.giveItem]) || 0) + offer.giveAmount;
  accepter[offer.wantItem] -= offer.wantAmount;
  offerer[offer.wantItem] =
    (Number(offerer[offer.wantItem]) || 0) + offer.wantAmount;

  removeOutgoingTrade(offerer, offer);
  gameState.saveRequired = true;

  const msg =
    '🤝 ' +
    (offerer.name || offererName) +
    ' trades ' +
    formatItemAmount(offer.giveItem, offer.giveAmount) +
    ' to ' +
    (accepter.name || accepterName) +
    ' for ' +
    formatItemAmount(offer.wantItem, offer.wantAmount) +
    '.';

  text.addMessage(gameState, 'tribe', msg);
  pop.history(offerer.name || offererName, msg, gameState);
  pop.history(accepter.name || accepterName, msg, gameState);
  return true;
}

function rejectTrade(gameState, rejecterName, offererName) {
  const found = findIncomingOfferFrom(gameState, rejecterName, offererName);
  if (!found) {
    text.addMessage(
      gameState,
      rejecterName,
      'No outstanding trade offer from ' + (offererName || 'that player') + '.'
    );
    return false;
  }
  const { offerer, offer } = found;
  removeOutgoingTrade(offerer, offer);
  gameState.saveRequired = true;

  const rejecter = pop.memberByName(rejecterName, gameState);
  const rejecterLabel =
    (rejecter && rejecter.name) || rejecterName || 'Someone';
  const offererLabel = offerer.name || offererName;
  const offererKey = personKey(offerer, gameState) || offererLabel;
  const rejecterKey =
    (rejecter && personKey(rejecter, gameState)) || rejecterName;
  const deal =
    formatItemAmount(offer.giveItem, offer.giveAmount) +
    ' for ' +
    formatItemAmount(offer.wantItem, offer.wantAmount);

  text.addMessage(
    gameState,
    rejecterKey,
    'You rejected the trade offer from ' + offererLabel + ' (' + deal + ').'
  );
  text.addMessage(
    gameState,
    offererKey,
    rejecterLabel + ' rejected your trade offer (' + deal + ').'
  );
  text.addMessage(
    gameState,
    'tribe',
    '🚫 ' +
      rejecterLabel +
      ' rejected ' +
      offererLabel +
      "'s trade offer (" +
      deal +
      ').'
  );
  return true;
}

function cancelTrade(gameState, sourceName, optionalTargetName) {
  const source = pop.memberByName(sourceName, gameState);
  if (!source) {
    text.addMessage(gameState, sourceName, access.NOT_IN_TRIBE_MESSAGE);
    return false;
  }
  const openTrades = listOutgoingTrades(source);
  if (openTrades.length === 0) {
    text.addMessage(gameState, sourceName, 'You have no outstanding trade offer.');
    return false;
  }

  let offer = null;
  if (optionalTargetName) {
    offer = findOutgoingTradeTo(source, optionalTargetName, gameState);
    if (!offer) {
      const targets = openTrades
        .map((o) => o.to)
        .filter(Boolean)
        .join(', ');
      text.addMessage(
        gameState,
        sourceName,
        'You have no outstanding offer to ' +
          optionalTargetName +
          (targets ? ' (open offers to: ' + targets + ').' : '.')
      );
      return false;
    }
  } else if (openTrades.length === 1) {
    offer = openTrades[0];
  } else {
    const targets = openTrades
      .map((o) => o.to)
      .filter(Boolean)
      .join(', ');
    text.addMessage(
      gameState,
      sourceName,
      'You have multiple outstanding offers (' +
        targets +
        '). Specify which player to cancel.'
    );
    return false;
  }

  const peerName = offer.to;
  const peer = pop.memberByName(peerName, gameState);
  const peerKey = peer ? personKey(peer, gameState) || peerName : peerName;
  const peerLabel = (peer && peer.name) || peerName;
  const sourceLabel = source.name || sourceName;
  const sourceKey = personKey(source, gameState) || sourceName;
  const deal =
    formatItemAmount(offer.giveItem, offer.giveAmount) +
    ' for ' +
    formatItemAmount(offer.wantItem, offer.wantAmount);

  removeOutgoingTrade(source, offer);
  gameState.saveRequired = true;

  text.addMessage(
    gameState,
    sourceKey,
    'You cancelled your trade offer to ' + peerLabel + ' (' + deal + ').'
  );
  text.addMessage(
    gameState,
    peerKey,
    sourceLabel + ' cancelled their trade offer to you (' + deal + ').'
  );
  text.addMessage(
    gameState,
    'tribe',
    '🚫 ' +
      sourceLabel +
      ' cancelled their trade offer to ' +
      peerLabel +
      ' (' +
      deal +
      ').'
  );
  return true;
}

function trade(
  gameState,
  sourceName,
  action,
  targetName,
  giveItem,
  giveAmount,
  wantItem,
  wantAmount
) {
  const act = String(action || '')
    .trim()
    .toLowerCase();
  if (act === 'offer') {
    return offerTrade(
      gameState,
      sourceName,
      targetName,
      giveItem,
      giveAmount,
      wantItem,
      wantAmount
    );
  }
  if (act === 'accept') {
    return acceptTrade(gameState, sourceName, targetName);
  }
  if (act === 'reject') {
    return rejectTrade(gameState, sourceName, targetName);
  }
  if (act === 'cancel') {
    return cancelTrade(gameState, sourceName, targetName);
  }
  text.addMessage(
    gameState,
    sourceName,
    'trade action must be one of: offer, accept, reject, cancel.'
  );
  return false;
}

module.exports = {
  trade,
  offerTrade,
  acceptTrade,
  rejectTrade,
  cancelTrade,
  expireStaleTrades,
  clearTradesInvolving,
  listOutgoingTrades,
  MAX_OFFERS_PER_PAIR_PER_SEASON,
  MAX_OPEN_OUTGOING_OFFERS,
};
