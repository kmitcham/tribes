const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const reproLib = require("../../libs/reproduction.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('decline')
		.setDescription('Comma seperated list of names of people you would NOT mate with. (!none or !all are options)')
        .addStringOption(option => 
            option
            .setName('declinelist')
            .setDescription('takes !none and !all, or names ')
        )
        ,
    async execute(interaction, gameState) {
        try {
            var sourceName = interaction.member.displayName;
            var rawList = interaction.options.getString('declinelist');
            
            // Handle array parameters from WebSocket interface
            if (Array.isArray(rawList)) {
                rawList = rawList.length > 0 ? rawList.join(',') : null;
            }
            
            // Call declinePrep with proper parameters
            var player = reproLib.memberByName ? reproLib.memberByName(sourceName, gameState) 
                : require('../../libs/population.js').memberByName(sourceName, gameState);
            
            if (!rawList) {
                if (player && player.declineList && player.declineList.length > 0) {
                    var message = "Current declinelist: " + player.declineList.join(" ");
                    console.log(message);
                    return message;
                } else {
                    var message = "No current declinelist";
                    console.log(message);
                    return message;
                }
            }
            
            let listAsArray = rawList.split(" ");
            if (rawList.includes(",")) {
                listAsArray = rawList.split(",");
            }
            
            // Trim whitespace from each item
            for (var i = 0; i < listAsArray.length; i++) {
                listAsArray[i] = listAsArray[i].trim();
            }
            
            console.log("applying decline list to mating for " + sourceName);
            var response = reproLib.decline ? reproLib.decline(sourceName, listAsArray, gameState)
                : require('../../libs/reproduction.js').decline(sourceName, listAsArray, gameState);
            console.log("decline response:" + response);
            gameState.saveRequired = true;
        } catch (error) {
            console.error('decline error ' + error);
        }
    },
};