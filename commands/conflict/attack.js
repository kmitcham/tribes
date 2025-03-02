const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pop = require("../../libs/population")
const text = require("../../libs/textprocess")
const violence = require("../../libs/violence")


module.exports = {
	data: new SlashCommandBuilder()
		.setName('attack')
		.setDescription('Who to attack, but only after after intimidation has failed')
        .addUserOption(option => 
            option
                .setName('target')
                .setDescription('Player to attack')
                .setRequired(true))

        ,
    async execute(interaction, gameState, bot) {
        var actorName = interaction.user.displayName
        var targetObject = interaction.options.getMember('target')
        var targetName = targetObject.displayName;

        attack( gameState, actorName, targetName);

	},
};

function attack(gameState, actorName, targetName){
    var player = pop.memberByName(actorName, gameState);
    targetPlayer = pop.memberByName(targetName, gameState);
    if (! targetPlayer ){
        text.addMessage(gameState, actorName,targetName+' was not found in the tribe' )
        return
    }
    if (targetPlayer.escaped){
        text.addMessage(gameState, actorName,targetName+' has already run away and can not be attacked.')
        return
    }
    text.addMessage(gameState, actorName,'If a fight happens, you will try to kill '+targetPlayer.name)
    player.attack_target = targetPlayer.name
    player.strategy = 'attack'
    violence.resolveViolence(gameState);
    gameState.saveRequired = true;

    return;
}