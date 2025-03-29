const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pop = require("../../libs/population")
const violencelib = require("../../libs/violence")
const text = require("../../libs/textprocess")


module.exports = {
	data: new SlashCommandBuilder()
		.setName('demand')
		.setDescription('Make a demand, something you will fight about if needed.')
        .addStringOption(option => 
            option
            .setName('demand')
            .setDescription('Write the demand as the arguement')
            .setRequired(false)
        )
        ,
    async execute(interaction, gameState, bot) {
        var actorName = interaction.member.displayName
        var demandText = interaction.options.getString('demand');

        demand(gameState, actorName, demandText);

	},
};

function demand(gameState, actorName, demandText){
    var player = pop.memberByName(actorName, gameState)
    var currentDemand = "";
    if ( gameState.ended ){
        text.addMessage(gameState, actorName,  'The game is over.  Maybe you want to /join to start a new game?');
        return
    }
    if (gameState.hasOwnProperty('demand')) {
        currentDemand = gameState["demand"];
    }
    if (!player){
        text.addMessage(gameState, actorName, 'Only tribe members can make demands')
        return
    }
    if (currentDemand || gameState.violence){
        text.addMessage(gameState, actorName, "The current demand is : "+currentDemand)
        return
    }
    // only get here if there is NOT a current demand
    if (!demandText || demandText.length < 1 ){
        text.addMessage(gameState, actorName,'Syntax: !demand <text of your demand here>');
        return
    }

    response = violencelib.demand(actorName, demandText, gameState)

    return
}