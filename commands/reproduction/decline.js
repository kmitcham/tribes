const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const reproLib = require("../../libs/reproduction.js");
const text = require("../../libs/textprocess.js");
const pop = require("../../libs/population.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('decline')
		.setDescription('Comma seperated list of names of people you would NOT mate with. ')
        .addStringOption(option => 
            option
            .setName('declinelist')
            .setDescription('takes !none and !all, or names ')
        )
        ,
    async execute(interaction, gameState) {
        declinePrep(interaction, gameState)
	},
};

function declinePrep(interaction, gameState){
    var sourceName = interaction.member.displayName;
    var rawList = interaction.options.getString('declinelist');

    var player = pop.memberByName(sourceName, gameState);
    if (! rawList ) {
        if (player.declineList){
            text.addMessage(gameState, sourceName, "Current declinelist: "+player.declinelist.join(" "));
            return "Current declinelist: "+player.declinelist.join(" ");
        } else {
            text.addMessage(gameState, sourceName, "No current declinelist");
            return  "No current declinelist";
        }
        
    }
    let listAsArray = rawList.split(" ");
    if (rawList.includes(",")){
        listAsArray = rawList.split(",");
    }
    console.log("applying decline list to mating for "+sourceName);
    response = reproLib.decline(sourceName, listAsArray,  gameState);
    console.log("decline response:"+response);
    return 
}