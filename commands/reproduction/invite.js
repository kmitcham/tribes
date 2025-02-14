const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");
const reproLib = require("../../reproduction.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('invite')
		.setDescription('(<partner> [second choice partner] [!save] [!pass] Space seperated list of who to mate with.')
        .addStringOption(option => 
            option
            .setName('invitelist')
            .setDescription('!save retains it.  If it ENDS with !pass, give up if the players decline.')
        )
        ,
    async execute(interaction, gameState, bot) {
        try {
            response = onCommand(interaction, gameState, bot)
            util.ephemeralResponse(interaction,response)
            console.log('invite response was '+response)
        } catch (error) {
                // And of course, make sure you catch and log any errors!
                console.error('invite error'+error);
        }
    },
};

function onCommand(interaction, gameState, bot){
    var population = gameState.population;
    var sourceName = interaction.user.displayName;

    var player = population[sourceName]
    var message = 'error in invite, message not set';
    var rawList = interaction.options.getString('invitelist');
    if (! rawList ) {
        if (player.inviteList){
            return "Current invitelist: "+player.inviteList.join(" ")
        } else {
            return "No current inviteList"
        }
    }
    let messageArray = rawList.split(" ");
    if (rawList.includes(",")){
        messageArray = rawList.split(",");
    }
    message = reproLib.invite(sourceName, messageArray,  gameState, bot);
    return message;
}