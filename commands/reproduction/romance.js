const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");
const reproLib = require("../../reproduction.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('romance')
		.setDescription('(show your current reproduction lists)')
        ,
    async execute(interaction, gameState) {
        onCommand(interaction, gameState)
	},
};

function onCommand(interaction, gameState){
    var population = gameState.population;
    var sourceName = interaction.user.displayName;

    var player = population[sourceName]
    var message = 'error in romance, message not set';

    if (gameState.secretMating){
        message = reproLib.showMatingLists(sourceName, gameState)
        util.ephemeralResponse(interaction, message);
        return;
    }
    if (gameState.reproductionRound && gameState.reproductionList ){
        message = "The mating invitation order is "+gameState.reproductionList;
        for (personName in population){
            if (population[personName].invite){
                message += personName+' is awaiting a response from '+population[personName].invite;
            }
        }
        util.ephemeralResponse(interaction, message)
        return
    } else {
        message = "Only valid during reproduction round";
        util.ephemeralResponse(interaction, message)
        return;
    }
    return
}