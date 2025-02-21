const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pop = require("../../libs/population");
const text = require("../../libs/textprocess");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('open')
		.setDescription('Set the tribe so that anyone can join. (Chief only')
        ,
    async execute(interaction, gameState, bot) {
        var actorName = interaction.user.displayName

        response = close(actorName, gameState, bot)
	},
};

function close(actorName, gameState, bot){
    var player = pop.memberByName(actorName, gameState)
    if ( !player.chief){
        text.addMessage(gameState,actorName, command+' requires chief priviliges')
        return
    }
    gameState.open = true
    gameState.saveRequired = true
    text.addMessage(gameState,"tribe", 'The tribe is open to all')
    return
}