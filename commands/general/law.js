const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const text = require("../../libs/textprocess")
const pop = require("../../libs/population.js")

module.exports = {
	data: new SlashCommandBuilder()
		.setName('law')
		.setDescription('Show all of the laws, as set down by the chief')
        ,
    async execute(interaction, gameState) {
        var displayName = interaction.member.displayName
        law(displayName, gameState)
	},
};

function law(displayName, gameState){
    var member = pop.memberByName(displayName, gameState);
    var response = 'There are no laws.';
    if ( gameState.ended ){
        text.addMessage(gameState, displayName,  'The game is over.  Maybe you want to /join to start a new game?');
        return
    }
    laws = gameState.laws
    if (laws){
        response = "The laws are:";
    }
    for (number in laws){
        response += '\n\t'+number+'\t'+laws[number]
    }
    text.addMessage(gameState,member.name, response);
    gameState.saveRequired = true;
    return;
}