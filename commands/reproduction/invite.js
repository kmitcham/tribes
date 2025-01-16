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
    async execute(interaction, gameState) {
        response = onCommand(interaction, gameState)
        console.log("invite response: "+response)
        interaction.reply({ content: response, ephemeral: true })
	},
};

function onCommand(interaction, gameState){
    var population = gameState.population;
    var sourceName = interaction.user.displayName;

    var player = population[sourceName]
    var message = 'error in invite, message not set';

    if (gameState.secretMating){
        message = reproLib.invite(interaction,  gameState);
        return message;
    }
    var rawList = interaction.options.getString('invitelist');
    let messageArray = rawList.split(" ");
    inviteMessage = '';
    if (gameState.reproductionRound && gameState.reproductionList 
        && gameState.reproductionList[0] && gameState.reproductionList[0].startsWith(actor)){
    } else {
        return 'invite is not appropriate now'
    }
    if (player.invite){
        inviteMessage = "The invitation to "+player.invite+" is cancelled. \n"
    }
    if (messageArray[0] ){
        target = util.removeSpecialChars(messageArray[0])
        if (population[target] ){
            inviteMessage += sourceName+ ' invites '+target+' to reproduce.  !pass or !consent'
            player.invite = target
            return inviteMessage;
        } 
    }
    return ' Empty or unknown target for invite'
    
    //TODO msg the invitee  I think this is impossible.
}