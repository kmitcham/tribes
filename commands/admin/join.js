const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pop = require("../../libs/population.js");

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
    async execute(interaction, gameState, bot) {
        var actorName = interaction.user.displayName;      
        gender = interaction.options.getString('gender');
        profession = interaction.options.getString('profession');
        response = join(actorName, gameState, gender, profession, interaction.user)
        //interaction.reply(response)
        gameState.saveRequired = true;
	},
};

function join(joiner, gameState, gender, profession, handle){
    if (gameState.population[joiner]){
        return 'You are already a member of this tribe'
    }
    if (! gameState.open){
        return 'You need to be inducted by the chief to join this tribe'
    }
    console.log("display name is "+joiner +" username:"+joiner.username)
    return pop.addToPopulation(gameState, joiner, gender, profession, handle)
}


function onError(interaction, response){
    interaction.user.send(response);
        const embed = new EmbedBuilder().setDescription(response);
		interaction.reply({ embeds: [embed], ephemeral: true })
			.catch(console.error);
        return
}