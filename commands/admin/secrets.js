const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const text = require("../../libs/textprocess.js")
const pop = require("../../libs/population.js")

module.exports = {
	data: new SlashCommandBuilder()
		.setName('secrets')
		.setDescription('Setting this to true indicates you are willing to teach others how to craft.')
		.addBooleanOption(option => 
            option
            .setName('willtrain')
            .setDescription('You will train others')
            .setRequired(true),
        ),
    async execute(interaction, gameState, bot) {
		var actorName = interaction.user.displayName;
		var willTrain = interaction.options.getBoolean('willTrain');
        setSecrets(gameState, actorName, willTrain);
	},
};

function setSecrets(gameState, actorName, willTrain){
	member = pop.memberByName(actorName, gameState)
	if (member && member.canCraft){
		if (willTrain){
			delete player.noTeach;
			text.addMessage(gameState, actorName, 'You will try to teach those willing to learn')
		} else {
			member.noTeach = true
			text.addMessage(gameState, actorName,'You will no longer teach others to craft')
		}
	} else {
		text.addMessage(gameState, actorName,'You do not know any crafting secrets')
	}
	gameState.saveRequired = true;
}

