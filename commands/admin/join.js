const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const utillib = require("../../util.js");
const savelib = require("../../save.js");

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
        const joiner = interaction.member;
        gender = interaction.options.getString('gender');
        profession = interaction.options.getString('profession');
        message = join(joiner, gameState, bot, gender, profession)
        interaction.reply(message)
	},
};

function join(joiner, gameState, bot, gender, profession){
    if (gameState.population[joiner.displayName]){
        return 'You are already a memeber of this tribe'
    }
    if (! gameState.open){
        return 'You need to be inducted by the chief to join this tribe'
    }
    console.log("joining name is "+joiner.displayName +" actor:"+joiner.username)
    return utillib.addToPopulation(gameState, bot, 
        joiner, gender, profession)
    }


function onError(interaction, response){
    interaction.user.send(response);
        const embed = new EmbedBuilder().setDescription(response);
		interaction.reply({ embeds: [embed], ephemeral: true })
			.catch(console.error);
        return
}