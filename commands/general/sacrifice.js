const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const dice = require("../../libs/dice.js");
const pop = require("../../libs/population.js");
const text = require("../../libs/textprocess.js")

module.exports = {
	data: new SlashCommandBuilder()
		.setName('sacrifice')
		.setDescription('Place an item beyond use for ritual or other reasons')
        .addIntegerOption(option => 
            option.setName('amount')
            .setDescription('amount to sacrifice')
            .setRequired(true))
        .addStringOption(option => 
            option
            .setName('item')
            .setDescription('one of (food,grain,basket,spearhead')
            .setRequired(true))
        ,
    async execute(interaction, gameState) {
        var sourceName = interaction.user.displayName;
        var amount = interaction.options.getInteger('amount');
        var item = interaction.options.getString('item');
        doCommand(gameState, sourceName, item, amount);
	},
};

function doCommand(gameState, sourceName, item, amount){

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
        text.addMessage(gameState,sourceName, response);
        return
    }

    if (amount <= 0  ){
        response = 'Must sacrifice at least one item';
        text.addMessage(gameState,sourceName, response);
        return;
    }
    var sourcePerson = pop.memberByName(sourceName);
    // check if person is in tribe
    if (!sourcePerson){
        response = sourceName+" not found in tribe";
        text.addMessage(gameState,sourceName, response);
        return 
    }
    if (!sourcePerson[item] || sourcePerson[item] < amount){
        response = sourceName+" does not have "+amount+" "+item;
        text.addMessage(gameState,sourceName, response);
        return 
    }

    if (  sourcePerson[item] >= amount){
        ritualResults = [
            'The ritual seems clumsy.'    				// 0  Impossible result?
            ,'You feel a vague sense of unease.'    				// 1
            ,'Nothing seems to happen.'    				// 2
            , sourceName+"'s eyes gleam wildly."					// 3
            ,'A hawk flies directly overhead.'				// 4
            ,'There is the distant sound of thunder.'		// 5  
            ,'The campfire flickers brightly.'				// 6
            ,'The sun goes behind a cloud.'					// 7   
            ,'The night goes very still and quiet when the ritual is complete.'
            ,'An owl hoots three times.'					// 9
            ,'In the distance, a wolf howls.'				// 10   highest base roll
            ,'You remember the way your mother held you as a child.'  // 11
            ,'You feel protected.'   						// 12
            ,'You remember learning from the ones who came before you.'
            ,'You feel warm and satisfied.' 				// 14
            ,'You feel content.'		   					// 15
        ]
        random = dice.roll(2) - 2;// 0-10
        net = random + Math.trunc(Math.log(amount)) ;
        console.log(sourceName+' sacrifice roll was '+random+ '  plus bonus = '+net)
        rndMsg = ritualResults[net] || 'The ritual is clearly wrong.' 
        sourcePerson[item] -= Number(amount)
    } else {
        response = 'You do not have that many '+item+': '+ population[actor][item]
        text.addMessage(gameState,sourceName, response);
        return;
    }
    gameState.saveRequired = true;
    text.addMessage(gameState, "tribe", sourceName+' deliberately destroys '+amount+' '+item+' as part of a ritual.\n'+rndMsg+"\n")
}