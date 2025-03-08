const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pop = require("../../libs/population")
const text = require("../../libs/textprocess")


module.exports = {
	data: new SlashCommandBuilder()
		.setName('close')
		.setDescription('Set the tribe so that only the chief can induct new members. (Chief only)')
        ,
    async execute(interaction, gameState, bot) {
        var actorName = interaction.member.displayName

        response = close(actorName, gameState)
	},
};

function close(actorName, gameState){
    var player = pop.memberByName(actorName, gameState)
    if ( !player.chief){
        text.addMessage(gameState, actorName,'close requires chief priviliges' )
        return
    }
    gameState.open = false
    if (gameState.open){
        text.addMessage(gameState, "tribe", "The tribe is open")
    } else {
       text.addMessage(gameState, "tribe", "The tribe is closed")
    }
    gameState.saveRequired = true;

    return
}