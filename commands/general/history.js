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
    var playerName = interaction.member.displayName;
    var player = pop.memberByName(playerName, gameState)
    if (!player){
        text.addMessage(gameState, playerName, "You have no history with this tribe");
        return;
    }
    messages = player.history
    if (!messages){
        text.addMessage(gameState, playerName, "You have no history.  How did you get in the tribe?");
        console.log(playerName+" was in tribe but had no history");
        return; 
    }
    for (const message of messages){
        text.addMessage(gameState, playerName, message)
    }
    return
}