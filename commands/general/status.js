const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('status')
		.setDescription('Show the status of the tribe')
        ,
    async execute(interaction, gameState) {
        onCommand(interaction, gameState)
	},
};

function onCommand(interaction, gameState){
	if (!gameState){
		return util.ephemeralResponse(interaction, "Not in a tribe")
	}
    var response = util.gameStateMessage(gameState)
	return util.ephemeralResponse(interaction, response)
}