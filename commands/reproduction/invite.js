const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const reproLib = require("../../libs/reproduction.js");
const text = require("../../libs/textprocess");
const pop = require("../../libs/population.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('invite')
		.setDescription('(<partner> [second choice partner] [!save] [!pass] Comma seperated list of who to mate with.')
        .addStringOption(option => 
            option
            .setName('invitelist')
            .setDescription('!save retains it.  If it ENDS with !pass, give up if the players decline.')
        )
        ,
    async execute(interaction, gameState, bot) {
        try {
            var displayName = interaction.member.displayName;
            response = onCommand(interaction, gameState, bot)
            text.addMessage(gameState, displayName, response );
            console.log('invite response was '+response)
        } catch (error) {
                // And of course, make sure you catch and log any errors!
                console.error('invite error'+error);
        }
    },
};

function onCommand(interaction, gameState, bot){
    var population = gameState.population;
    var sourceName = interaction.member.displayName;

    var player = pop.memberByName(sourceName, gameState);
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