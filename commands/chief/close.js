const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");
const savelib = require("../../save.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('close')
		.setDescription('Set the tribe so that only the chief can induct new members.')
        ,
    async execute(interaction, gameState, bot) {
        var actorName = interaction.user.displayName

        response = close(actorName, gameState, bot)
        if (gameState.open){
            interaction.reply("The tribe is open")
        } else {
            interaction.reply("The tribe is closed")
        }
	},
};

function close(actorName, gameState, bot){
    var player = util.personByName(actorName, gameState)
    if ( !player.chief){
        msg.author.send(command+' requires chief priviliges')
        cleanUpMessage(msg);; 
        return
    }
    gameState.open = false
    util.messageChannel('The tribe is only open to those the chief inducts', gameState, bot)
    return
}