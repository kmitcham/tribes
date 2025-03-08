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
		text.addMessage(gameState, displayName, "Not in a tribe");
		return
	}
    var response = util.gameStateMessage(gameState);
	console.log("status response:"+response);
	text.addMessage(gameState, displayName, response);
	return 
}