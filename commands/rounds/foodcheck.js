const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('foodcheck')
		.setDescription('examine the food situation for every adult and living child')
        ,
    async execute(interaction, gameState) {
        onCommand(interaction, gameState)
	},
};

function onCommand(interaction, gameState){
    var population = gameState.population;
    var message = 'Nobody seems ready for much of anything right now.'
    message = ''
	hungryAdults = []
	happyAdults = []
	worriedAdults = []
	hungryChildren = []
	satedChildren = []
	children = gameState.children
	population = gameState.population
	for  (var targetName in population) {
		person = population[targetName]
		hunger = 4
		if (person.gender == 'female' && util.countChildrenOfParentUnderAge(children, targetName, 4) > 1){
			hunger = 6
		}
		if (person.food >= hunger) {
			happyAdults.push(targetName);
		} else if ( ((person.food+person.grain) >= hunger )){
			worriedAdults.push(targetName);
		} else {
			hungryAdults.push(targetName);
		}
	}
	for (var childName in children){
		var child = children[childName]
		if (child.newAdult && child.newAdult== true){
			continue;
		}
		if (child.food >= 2 ){
			satedChildren.push(childName)
		}else {
			hungryChildren.push(childName)
		}
	}
	message = 'Happy People: '+happyAdults+", "+satedChildren
	message += '\nWorried adults: '+worriedAdults
	message += '\nHungry adults: '+hungryAdults
	message += '\nHungry children: '+hungryChildren
	if (!worriedAdults.length && !hungryAdults.length && !hungryChildren.length && gameState.foodRound ){
		gameState.enoughFood = true
		interaction.reply("Everyone has enough food, starting reproduction automatically.")
        return;
	}
    util.ephemeralResponse(interaction, message)
    return
}
