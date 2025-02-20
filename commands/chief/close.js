const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pop = require("../../libs/population")
const text = require("../../libs/textprocess")


module.exports = {
	data: new SlashCommandBuilder()
		.setName('close')
		.setDescription('Set the tribe so that only the chief can induct new members. (Chief only')
        ,
    async execute(interaction, gameState, bot) {
        var actorName = interaction.user.displayName

        response = close(actorName, gameState, bot)
        if (gameState.open){
            interaction.reply("The tribe is open")
        } else {
            interaction.reply("The tribe is closed")
        }
        gameState.saveRequired = true;

	},
};

function close(actorName, gameState, bot){
    var player = pop.personByName(actorName, gameState)
    if ( !player.chief){
        text.addMessage(gameState, actorName,command+' requires chief priviliges' )
        return
    }
    gameState.open = false
    text.addMessage(gameState, "tribe",'The tribe is only open to those the chief inducts' )
    return
}