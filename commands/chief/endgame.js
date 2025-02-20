const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const endLib = require("../../libs/endgame.js");


module.exports = {
	data: new SlashCommandBuilder()
		.setName('endgame')
		.setDescription('End the game.  Score the remaining children. (Chief only)')
        ,
    async execute(interaction, gameState, bot) {

        response = endLib.endGame(gameState, bot)
        interaction.reply({content:response, ephemeral:false});
        gameState.saveRequired = true;
        gameState.archiveRequired = true;
	},
};
