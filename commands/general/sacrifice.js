const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const dice = require("../../libs/dice.js");

const general = require("../../libs/general.js")

module.exports = {
	data: new SlashCommandBuilder()
		.setName('sacrifice')
		.setDescription('Place an item beyond use for ritual or other reasons')
        .addIntegerOption(option => 
            option.setName('amount')
            .setDescription('amount to sacrifice')
            .setRequired(true))
        .addStringOption(option => 
            option
            .setName('item')
            .setDescription('one of (food,grain,basket,spearhead')
            .setRequired(true))
        ,
    async execute(interaction, gameState) {
        var sourceName = interaction.member.displayName;
        var amount = interaction.options.getInteger('amount');
        var item = interaction.options.getString('item');
        var rollOf2dice = dice.roll(2);
        general.sacrifice(gameState, sourceName, item, amount, rollOf2dice);
	},
};