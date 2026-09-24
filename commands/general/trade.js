'use strict';

const { SlashCommandBuilder } = require('../../libs/command-builders.js');
const tradeLib = require('../../libs/trade.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trade')
    .setDescription(
      'Offer, accept, reject, or cancel an item trade (food, grain, basket, spearhead)'
    )
    .addStringOption((option) =>
      option
        .setName('action')
        .setDescription('offer | accept | reject | cancel')
        .addChoices(
          { name: 'offer', value: 'offer' },
          { name: 'accept', value: 'accept' },
          { name: 'reject', value: 'reject' },
          { name: 'cancel', value: 'cancel' }
        )
        .setRequired(true)
    )
    .addUserOption((option) =>
      option
        .setName('player')
        .setDescription(
          'Counterparty (required for offer/accept/reject; optional for cancel)'
        )
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('giveitem')
        .setDescription('Item you give (offer only): food, grain, basket, spearhead')
        .addChoices(
          { name: 'food', value: 'food' },
          { name: 'grain', value: 'grain' },
          { name: 'basket', value: 'basket' },
          { name: 'spearhead', value: 'spearhead' }
        )
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName('giveamount')
        .setDescription('Amount you give (offer only)')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('wantitem')
        .setDescription(
          'Item you want from them (offer only): food, grain, basket, spearhead'
        )
        .addChoices(
          { name: 'food', value: 'food' },
          { name: 'grain', value: 'grain' },
          { name: 'basket', value: 'basket' },
          { name: 'spearhead', value: 'spearhead' }
        )
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName('wantamount')
        .setDescription('Amount you want from them (offer only)')
        .setRequired(false)
    ),
  async execute(interaction, gameState) {
    const sourceName = interaction.member.displayName;
    const action = interaction.options.getString('action');
    const targetMember =
      interaction.options.getMember('player') ||
      interaction.options.getMember('target');
    const targetName = targetMember ? targetMember.displayName : null;
    const giveItem = interaction.options.getString('giveitem');
    const giveAmount = interaction.options.getInteger('giveamount');
    const wantItem = interaction.options.getString('wantitem');
    const wantAmount = interaction.options.getInteger('wantamount');

    tradeLib.trade(
      gameState,
      sourceName,
      action,
      targetName,
      giveItem,
      giveAmount,
      wantItem,
      wantAmount
    );
  },
};
