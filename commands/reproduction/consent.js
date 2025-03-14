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
            .setDescription('list of names.  !all is an option for the less discriminating, !none is also available')
        )
        ,
    async execute(interaction, gameState, bot) {
        var sourceName = interaction.member.displayName;
        var rawList = interaction.options.getString('consentlist');
        var response = onCommand(gameState, sourceName, rawList);
        console.log("consent updated: "+response)
	},
};

function onCommand(gameState, sourceName, rawList){
    var member = pop.memberByName(sourceName, gameState);

    if (! rawList ) {
        console.log("no rawList for consent");
        if (member.hasOwnProperty('consentList') && member.consentList.length > 0){
            text.addMessage(gameState, sourceName, "Current consentList: "+member.consentList.join(" ") )
            return ;
        } else {
            text.addMessage(gameState, sourceName,  "No current consentList.");
            return;
        }   
    }
    let messageArray = rawList.split(" ");
    if (messageArray.length < 1){
        text.addMessage(gameState, sourceName, "No values parsed from that consentList: "+rawList );
        return ;
    }
    console.log("updating consentlist: "+messageArray);
    reproLib.consent(sourceName, messageArray,  gameState);
    gameState.saveRequired;
}