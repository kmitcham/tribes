const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const reproLib = require("../../libs/reproduction.js");
const pop = require("../../libs/population.js");
const text = require("../../libs/textprocess.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('consent')
		.setDescription('The list of people you will mate with given an invitation.')
        .addStringOption(option => 
            option
            .setName('consentlist')
            .setDescription('list of names.  !all is an option for the less discriminating')
        )
        ,
    async execute(interaction, gameState, bot) {
        var sourceName = interaction.user.displayName;
        var rawList = interaction.options.getString('consentlist');
        var response = onCommand(gameState, sourceName, rawList);
        console.log("consent updated: "+response)
	},
};

function onCommand(gameState, sourceName, rawList){
    var member = pop.memberByName(gameState, sourceName);

    if (! rawList ) {
        if (member.hasOwnProperty('consentList')){
            return "Current consentList: "+member.consentList.join(" ")
        } else {
            return "No current consentList"
        }   
    }
    let messageArray = rawList.split(" ");
    console.log("updating consentlist: "+messageArray);
    reproLib.consent(sourceName, messageArray,  gameState);
    gameState.saveRequired;
}