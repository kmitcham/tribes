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

        util.startReproduction(gameState, bot);
        if (response){
            response = "Reproduction activities are complete."
        } else {
            response = "Reproduction activities are underway"
        }
        interaction.reply({content:response, ephemeral:true});
	},
};


