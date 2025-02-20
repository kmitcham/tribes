const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const repro = require("../../libs/reproduction");
const text = require("../../libs/textprocess");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('startreproduction')
		.setDescription('Start the reproduction round. (Chief only)')
        ,
    async execute(interaction, gameState, bot) {
        var actorName = interaction.user.displayName

        repro.startReproduction(gameState, bot);
        if (response){
            response = "Reproduction activities are complete."
        } else {
            response = "Reproduction activities are underway"
        }
        text.addMessage(gameState, "tribe", response);
	},
};


