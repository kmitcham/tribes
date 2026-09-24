'use strict';

const text = require('./textprocess.js');
const pop = require('./population.js');
const general = require('./general.js');
const access = require('./access.js');

const MAX_OFFERS_PER_PAIR_PER_SEASON = 2;

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

function getOutgoingTrade(person) {
  return person && person.outgoingTrade ? person.outgoingTrade : null;
}

function clearOutgoingTrade(person) {
  if (person && person.outgoingTrade) {
    delete person.outgoingTrade;
  }
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
  const offer = getOutgoingTrade(offerer);
  if (!offer) {
    return null;
  }
  const toPerson = pop.memberByName(offer.to, gameState);
  if (!toPerson || toPerson !== recipient) {
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
    if (!person || !person.outgoingTrade) {
      continue;
    }
    if (Number(person.outgoingTrade.season) !== season) {
      const peer = person.outgoingTrade.to;
      clearOutgoingTrade(person);
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
  const targetLower = String(playerName).toLowerCase();

  for (const key of Object.keys(population)) {
    const person = population[key];
    if (!person || !person.outgoingTrade) {
      continue;
    }
    const to = String(person.outgoingTrade.to || '');
    const toLower = to.toLowerCase();
    const isToTarget =
      to === targetKey ||
      toLower === targetLower ||
      (target && toLower === String(target.name || '').toLowerCase());
    if (isToTarget) {
      clearOutgoingTrade(person);
      text.addMessage(
        gameState,
        person.name || key,
        'Your trade offer to ' + playerName + ' was cancelled (they left the tribe).'
      );
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

  if (getOutgoingTrade(source)) {
    text.addMessage(
      gameState,
      sourceName,
      'You already have an outstanding trade offer. Accept, reject, or cancel it first (or wait for the season to change).'
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
      'Trades must exchange different items (not ' + giveItem + ' for ' + wantItem + ').'
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
  const peerKey = personKey(target, gameState);
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
  source.outgoingTrade = {
    season: season,
    to: peerKey,
    giveItem: giveItem,
    giveAmount: giveAmount,
    wantItem: wantItem,
    wantAmount: wantAmount,
  };
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

  clearOutgoingTrade(offerer);
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
  clearOutgoingTrade(offerer);
  gameState.saveRequired = true;

  text.addMessage(
    gameState,
    rejecterName,
    'You rejected the trade offer from ' + (offerer.name || offererName) + '.'
  );
  const rejecter = pop.memberByName(rejecterName, gameState);
  const rejecterLabel =
    (rejecter && rejecter.name) || rejecterName || 'Someone';
  text.addMessage(
    gameState,
    offerer.name || offererName,
    rejecterLabel +
      ' rejected your trade offer (' +
      formatItemAmount(offer.giveItem, offer.giveAmount) +
      ' for ' +
      formatItemAmount(offer.wantItem, offer.wantAmount) +
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
  const offer = getOutgoingTrade(source);
  if (!offer) {
    text.addMessage(gameState, sourceName, 'You have no outstanding trade offer.');
    return false;
  }
  if (optionalTargetName) {
    const target = pop.memberByName(optionalTargetName, gameState);
    const peer = pop.memberByName(offer.to, gameState);
    if (target && peer && target !== peer) {
      text.addMessage(
        gameState,
        sourceName,
        'Your outstanding offer is to ' +
          (peer.name || offer.to) +
          ', not ' +
          (target.name || optionalTargetName) +
          '.'
      );
      return false;
    }
  }

  const peerName = offer.to;
  clearOutgoingTrade(source);
  gameState.saveRequired = true;

  text.addMessage(gameState, sourceName, 'You cancelled your trade offer.');
  text.addMessage(
    gameState,
    peerName,
    (source.name || sourceName) + ' cancelled their trade offer to you.'
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
  MAX_OFFERS_PER_PAIR_PER_SEASON,
};
