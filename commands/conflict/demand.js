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
            .setRequired(true)
        )
        ,
    async execute(interaction, gameState, bot) {
        var actorName = interaction.user.displayName
        var demandText = interaction.options.getString('demand');

        demand(gameState, actorName, demandText);

	},
};

function demand(gameState, actorName, demandText){
    var player = pop.memberByName(actorName, gameState)
    if (!player){
        text.addMessage(gameState, actorName, 'Only tribe members can make demands')
        return
    }
    if (!demandText || demandText.length < 1 ){
        text.addMessage(gameState, actorName,'Syntax: !demand <text of your demand here>');
        return
    }
    if (gameState.demand || gameState.violence){
        text.addMessage(gameState, actorName,'There is already a demand to be dealt with.')
        return
    }
    response = violencelib.demand(actorName, demandText, gameState)

    return
}