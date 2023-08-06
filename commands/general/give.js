const { SlashCommandBuilder } = require('discord.js');
const util = require("../../util.js");

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
            .setDescription('what item are you giving (food,grain,basket,spearhead')
            .setRequired(true)),
        
    async execute(interaction, gameState) {
        // interaction.user is the object representing the User who ran the command
        // interaction.member is the GuildMember object, which represents the user in the specific guild
        await interaction.reply(give(interaction, gameState));
	},
};

function give(interaction, gameState){
    var targetName = interaction.options.getMember('target').displayname;
    var sourceName = interaction.user.displayname;
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
        return "Unrecognized item "+item;
    }
    var targetPerson = {}
    var sourcePerson = {}
    // check if person is in tribe
    if ((targetName in population ) && (sourceName in population)){
        targetPerson = population.targetName
        sourcePerson = population.sourceName
    } else {
        return "Source or target "+sourceName+":"+targetName+" not found in tribe";
    }
    if (!sourcePerson.item  || targetPerson.item < amount){
        return "You do not have "+amount+" "+item
    }
    sourcePerson.item -= amount;
    targetPerson.item += amount;

    return sourceName + "gives "+targetName+" "+amount+" "+item;
}