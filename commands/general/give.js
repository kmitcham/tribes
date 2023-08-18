const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");
const savelib = require("../../save.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('give')
		.setDescription('give items to another player')
        .addUserOption(option => 
            option
                .setName('target')
                .setDescription('Which tribe member to give to')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('amount')
            .setDescription('amount to give')
            .setRequired(true))
        .addStringOption(option => 
            option
            .setName('item')
            .setDescription('one of (food,grain,basket,spearhead')
            .setRequired(true)),
    async execute(interaction, gameState) {
        await give(interaction, gameState)
        
	},
};

function give(interaction, gameState){
    var targetName = interaction.options.getMember('target').displayName;
    var sourceName = interaction.user.displayName;
    var amount = interaction.options.getInteger('amount');
    var item = interaction.options.getString('item');
    var population = gameState.population;

    if (item.startsWith('g')){
        item = 'grain'
    } else if ( item.startsWith('f')){
        item = 'food'
    } else if (item.startsWith('b') ) {
        item = 'basket'
    } else if ( item.startsWith('s')){
        item = 'spearhead'
    } else {
        response = "Unrecognized item "+item;
        return onError(interaction, response);
    }
    var targetPerson = {}
    var sourcePerson = {}
    // check if person is in tribe
    if ((targetName in population ) && (sourceName in population)){
        targetPerson = population[targetName];
        sourcePerson = population[sourceName];
    } else {
        response = "Source or target "+sourceName+":"+targetName+" not found in tribe";
        return onError(interaction, response)
    }
    if (!sourcePerson[item] || sourcePerson[item] < amount){
        response = sourceName+" does not have "+amount+" "+item;
        return onError(interaction, response)
    }
    sourcePerson[item] -= amount;
    targetPerson[item] += amount;
    savelib.saveTribe(gameState);

    response = sourceName + " gives "+targetName+" "+amount+" "+item;
    interaction.reply(response);
}
function onError(interaction, response){
    interaction.user.send(response);
        const embed = new EmbedBuilder().setDescription(response);
		interaction.reply({ embeds: [embed], ephemeral: true })
			.catch(console.error);
        return
}