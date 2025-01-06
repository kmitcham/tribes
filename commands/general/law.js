const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");

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

    var response = 'There are no laws.';
    laws = gameState.laws
    if (laws){
        response = "The laws are:";
    }
    for (number in laws){
        response += '\n\t'+number+'\t'+laws[number]
    }
    return util.ephemeralResponse(interaction, response)
}