const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");
const savelib = require("../../save.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('startreproduction')
		.setDescription('Start the reproduction round. (Chief only)')
        ,
    async execute(interaction, gameState, bot) {
        var actorName = interaction.user.displayName

        response =  util.startReproduction(gameState, bot);
        interaction.reply({content:response, ephemeral:true});
	},
};


