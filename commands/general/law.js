const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const text = require("../../libs/textprocess")
const pop = require("../../libs/population.js")
const general = require("../../libs/general.js")

module.exports = {
	data: new SlashCommandBuilder()
		.setName('law')
		.setDescription('Show all of the laws, as set down by the chief')
        ,
    async execute(interaction, gameState) {
        var displayName = interaction.member.displayName
        general.law(displayName, gameState)
	},
};
