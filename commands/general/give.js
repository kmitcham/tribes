const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const text = require("../../libs/textprocess.js")

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
            .setDescription('one of (food,grain,basket,spearhead)')
            .addChoices(
                { name: 'food', value: 'food' },
                { name: 'grain', value: 'grain' },
                { name: 'basket', value: 'basket' },
                { name: 'spearhead', value: 'spearhead'},
            )
            .setRequired(true)),
    async execute(interaction, gameState) {
        var targetName = interaction.options.getMember('target').displayName;
        var sourceName = interaction.user.displayName;
        var amount = interaction.options.getInteger('amount');
        var item = interaction.options.getString('item');
        await give( gameState, sourceName, targetName, amount, item);
	},
};

function give(gameState, sourceName, targetName, amount, item){
    var population = gameState.population;

    if (targetName == sourceName){
        response = "Giving things to yourself is useful self-care.  Nobody loves you like you love you.";
        console.log("self give: "+targetName +" "+sourceName);
        text.addMessage(gameState, "tribe", response);
        return;
    }
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
        text.addMessage(gameState, "tribe", response)
        return ;
    }
    var targetPerson = {}
    var sourcePerson = {}
    // check if person is in tribe
    if ((targetName in population ) && (sourceName in population)){
        targetPerson = population[targetName];
        sourcePerson = population[sourceName];
    } else {
        response = "Source or target "+sourceName+":"+targetName+" not found in tribe";
        text.addMessage(gameState, "tribe", response)
        return ;
    }
    if (!sourcePerson[item] || sourcePerson[item] < amount){
        response = sourceName+" does not have "+amount+" "+item;
        text.addMessage(gameState, "tribe", response)
        return ;
    }
    if (sourcePerson.activity == 'hunt' && item == 'spearhead' && gameState.round== 'work'){
        response = sourceName+" already hunted with a spearhead, and cannot trade spearheads during the work round";
        text.addMessage(gameState, "tribe", response)
        return ;
    }
    sourcePerson[item] -= amount;
    targetPerson[item] += amount;
    gameState.saveRequired = true

    response = sourceName + " gives "+targetName+" "+amount+" "+item;
    text.addMessage(gameState, "tribe", response)
}
