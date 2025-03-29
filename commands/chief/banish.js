const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const { banish } = require('../../libs/banish.js');
const text = require("../../libs/textprocess")
const pop = require("../../libs/population")

module.exports = {
	data: new SlashCommandBuilder()
		.setName('banish')
		.setDescription('End the game.  Score the remaining children. (Chief only)')
        .addUserOption(option => 
            option
                .setName('target')
                .setDescription('Member of the tribe to banish')
                .setRequired(true))
        .addStringOption(option => 
            option
                .setName('reason')
                .setDescription('note about why the person is to be banished')
                .setRequired(false))
        ,
    async execute(interaction, gameState, bot) {
        targetObject = interaction.options.getMember('target')
        var targetName = targetObject.displayName;
        var sourceName = interaction.member.displayName;
        var reason = interaction.options.getString('reason');
        banishAdmin(gameState, sourceName, targetName, reason);
	},
};

function banishAdmin(gameState, actorName, targetName, reason){
    const actingMember = pop.memberByName(actorName, gameState);
    const targetMember = pop.memberByName(targetName, gameState);

    if (!actingMember ) {
        text.addMessage(gameState, actorName, 'Is '+actorName+' even in the tribe?');
        return;
    }
    if (!actingMember.chief ) {
        text.addMessage(gameState, actorName, 'banish requires chief priviliges');
        return;
    }
    if (gameState.demand || gameState.violence){
        text.addMessage(gameState, actorName,'banish can not be used during a conflict')
        return
    }
    if (! targetMember){
        text.addMessage(gameState, actorName, targetName+ ' was not found in the tribe');
        return
    }
    if ( gameState.ended ){
        text.addMessage(gameState, actorName,  'The game is over.  Maybe you want to /join to start a new game?');
        return
    }
    return banish(gameState, targetName, reason)
}