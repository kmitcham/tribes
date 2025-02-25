const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const text = require("../../libs/textprocess.js");
const reproLib = require("../../libs/reproduction.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('checkmating')
		.setDescription('Show who needs to complete romance round activities')
        ,
    async execute(interaction, gameState) {
        reproLib.checkMating(interaction, gameState)
	},
};
