const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const reproLib = require("../../libs/reproduction.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('decline')
		.setDescription('Comma seperated list of names of people you would NOT mate with. (!none or !all are options)')
        .addStringOption(option => 
            option
            .setName('declinelist')
            .setDescription('takes !none and !all, or names ')
        )
        ,
    async execute(interaction, gameState) {
        reproLib.declinePrep(interaction, gameState)
	},
};