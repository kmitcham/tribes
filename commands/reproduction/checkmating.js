const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const text = require("../../libs/textprocess.js");
const reproLib = require("../../libs/reproduction.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('checkmating')
		.setDescription('Show who needs to complete romance round activities')
        ,
    async execute(interaction, gameState) {
		var nickName = interaction.nickName;   // set by tribesBot in main handling, since it needed the client
        reproLib.checkMating( gameState, nickName);
	},
};
