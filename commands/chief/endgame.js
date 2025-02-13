const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");
const savelib = require("../../save.js");
const endLib = require("../../endgame.js");


module.exports = {
	data: new SlashCommandBuilder()
		.setName('endgame')
		.setDescription('End the game.  Score the remaining children. (Chief only)')
        ,
    async execute(interaction, gameState, bot) {

        response = endLib.endGame(gameState, bot)
        interaction.reply({content:response, ephemeral:false});
	},
};
