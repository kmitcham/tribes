const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pop = require("../../libs/population")
const text = require("../../libs/textprocess")
const violence = require("../../libs/violence")


module.exports = {
	data: new SlashCommandBuilder()
		.setName('defend')
		.setDescription('If a fight happens, you will try to defend yourself with deadly force.')
        ,
    async execute(interaction, gameState, bot) {
        var actorName = interaction.user.displayName

        defend( gameState, actorName);

	},
};

function defend(gameState, actorName){
    var player = pop.personByName(actorName, gameState);
    if (!player){
        text.addMessage(gameState, actorName, "Not in the tribe");
        return;
    }
    text.addMessage(gameState, actorName, 'If a fight happens, you will try to defend yourself with deadly force.');
    player.strategy = 'defend'
    delete player.attack_target 
    violence.resolveViolence(gameState)
    gameState.saveRequired = true;

    return;
}