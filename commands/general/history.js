const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const text = require("../../libs/textprocess.js")
const pop = require("../../libs/population.js")

module.exports = {
	data: new SlashCommandBuilder()
		.setName('history')
		.setDescription('History of your activity in the tribe')
       ,
    async execute(interaction, gameState) {
        var playerName = interaction.member.displayName;
        pop.showHistory(playerName, gameState)
	},
};

