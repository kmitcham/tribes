const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");
const reproLib = require("../../reproduction.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('invite')
		.setDescription('(<partner> [second choice partner] [!pass]   Space seperated list of names to invite to mate.')
        .addStringOption(option => 
            option
            .setName('invitelist')
            .setDescription('add !save to retain the list.  If list ENDS with !pass, give up if the listed players decline.')
        )
        ,
    async execute(interaction, gameState, bot) {
        response = onCommand(interaction, gameState, bot)
        console.log("invite response: "+response)
        interaction.reply({ content: response, ephemeral: true })
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
    console.log("diverting for secret mating");
    message = reproLib.invite(sourceName, messageArray,  gameState, bot);
    return message;
}