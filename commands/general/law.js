const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const text = require("../../libs/textprocess")
const pop = require("../../libs/population.js")

module.exports = {
	data: new SlashCommandBuilder()
		.setName('law')
		.setDescription('Show all of the laws, as set down by the chief')
        ,
    async execute(interaction, gameState) {
        doCommand(interaction, gameState)
	},
};

function doCommand(interaction, gameState){
    var displayName = interaction.user.displayName
    var response = 'There are no laws.';
    laws = gameState.laws
    if (laws){
        response = "The laws are:";
    }
    for (number in laws){
        response += '\n\t'+number+'\t'+laws[number]
    }
    text.addMessage(gameState,displayName, response)
}