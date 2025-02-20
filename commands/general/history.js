const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const text = require("../../libs/textprocess.js")
const pop = require("../../libs/population.js")

module.exports = {
	data: new SlashCommandBuilder()
		.setName('history')
		.setDescription('History of your activity in the tribe')
       ,
    async execute(interaction, gameState) {
        onCommand(interaction, gameState)
	},
};

function onCommand(interaction, gameState){
    var playerName = interaction.user.displayName;
    var player = pop.memberByName(playerName, gameState)
    messages = player.history
    array.forEach(function (message, index) {
        text.addMessage(gameState, playerName, message)
    })
    return
}