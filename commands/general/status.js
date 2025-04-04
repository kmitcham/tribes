const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../libs/util.js");
const text = require("../../libs/textprocess.js")

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
	var displayName = interaction.member.displayName;
	if (!gameState){
		// can this even happen?
		console.warn("Status called with no gameState");
		text.addMessage(gameState, displayName, "No tribe in this channel.  Do you want to /join and create one?");
		return
	}
    var response = util.gameStateMessage(gameState);
	text.addMessage(gameState, displayName, response);
	return 
}