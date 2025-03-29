const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pop = require("../../libs/population.js");
const text = require("../../libs/textprocess");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('join')
		.setDescription('join a tribe with open enrollment')
        .addStringOption(option => 
            option
                .setName('gender')
                .setDescription('one of (male, female)')
                .addChoices(
                    { name: 'male', value: 'm' },
                    { name: 'female', value: 'f' },
                )
                .setRequired(true))
        .addStringOption(option => 
            option
                .setName('profession')
                .setDescription('one of (hunter, gatherer, crafter)')
                .addChoices(
                    { name: 'hunter', value: 'hunter' },
                    { name: 'crafter', value: 'crafter' },
                    { name: 'gatherer', value: 'gatherer' },
                )
                .setRequired(false))
        ,
    async execute(interaction, gameState) {
        var nickName = interaction.nickName;   // set by tribesBot in main handling, since it needed the client    
        gender = interaction.options.getString('gender');
        profession = interaction.options.getString('profession');
        join(nickName, gameState, gender, profession, interaction.user)
	},
};

function join(actorName, gameState, gender, profession, handle){
    member = pop.memberByName(actorName, gameState);
    if (member){
        text.addMessage(gameState, actorName, 'You are already a member of this tribe');
        return 
    }
    if (! gameState.open){
        text.addMessage(gameState, actorName, 'You need to be inducted by the chief to join this tribe');
        return 
    }
    if ( gameState.ended ){
        console.log('resetting game when '+member.name+' joined. ');
        text.addMessage(gameState, actorName, 'You are the first member of a new tribe.');
        gameState = savelib.initGame(channel.name, client )
    }
    console.log("display name is "+actorName +" username:"+actorName.username)
    pop.addToPopulation(gameState, actorName, gender, profession, handle)
    gameState.saveRequired = true;
    return 

}


function onError(interaction, response){
    interaction.user.send(response);
        const embed = new EmbedBuilder().setDescription(response);
		interaction.reply({ embeds: [embed], ephemeral: true }) // error message
			.catch(console.error);
        return
}