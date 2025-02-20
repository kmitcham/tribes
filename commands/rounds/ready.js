const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const reproLib = require("../../libs/reproduction.js");
const worklib = require("../../libs/work.js");
const text = require("../../libs/textprocess.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ready')
		.setDescription('Show which tribe members are ready to work')
        ,
    async execute(interaction, gameState) {
        onCommand(interaction, gameState)
	},
};

function onCommand(interaction, gameState){
    var population = gameState.population;
    var displayName = interaction.user.displayName;
    var message = 'Nobody seems ready for much of anything right now.'
    if (gameState.workRound){
        message = "People available to work: "+worklib.listReadyToWork(population)
    }	
    if (gameState.reproductionRound){ 
        if (gameState.reproductionList && gameState.reproductionList[0] ){
            message = "The mating invitation order is "+gameState.reproductionList.join(", ")+"\n"
            var cleanName = gameState.reproductionList[0]
            if (cleanName.indexOf('(') > 0){
                startParen = cleanName.indexOf('(')
                cleanName = cleanName.substring(0, startParen)
            }
            message += "Available partners: "+reproLib.eligibleMates(cleanName, gameState.population)
            for (personName in population){
                if (population[personName].invite){
                    message += '\n'+personName+' is awaiting a response from '+population[personName].invite;
                } 
            }
        }
    }
    text.addMessage(gameState, displayName, message );
    return
}