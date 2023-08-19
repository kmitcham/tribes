const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");
const savelib = require("../../save.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('specialize')
		.setDescription('Choose a profession: Hunt, Gather, Craft')
        .addStringOption(option => 
            option
            .setName('profession')
            .setDescription('one of (hunt, gather, craft)')
            .setRequired(true)),
    async execute(interaction, gameState) {
        onCommand(interaction, gameState)
	},
};

function onCommand(interaction, gameState){
    var profession = 'invalid';
    var actorName = interaction.user.displayName;
    var person = gameState.population[actorName]

    if (interaction.options.getString('profession')){
        profession = interaction.options.getString('profession');
        if (profession.toLowerCase().startsWith('c')){
            profession = 'crafter'
        } else if (profession.toLowerCase().startsWith('h')){
            profession = 'hunter'
        } else if (profession.toLowerCase().startsWith('g')){
            profession = 'gatherer'
        } else {
            return util.ephemeralResponse(interaction, "No such profession as "+profession+" Legal professions: hunter, gatherer, crafter")
        }
    }

	if (!person ){
        util.ephemeralResponse(interaction, 'You must be in the tribe to specialize')
		return
	}
	if (person.profession){
		util.ephemeralResponse(interaction, 'You already have a profession:'+person.profession)
		return
	}
		
	helpMessage = "Welcome new hunter.  \n"
	helpMessage+= "To hunt, do /hunt and the bot rolls 3d6.  Higher numbers are bigger animals, and very low numbers are bad - you could get injured. \n"
	helpMessage+= "You cannot guard children while hunting. \n"
	helpMessage+= "Before you set out, you might consider waiting for a crafter to make you a spearhead which gives you a bonus to your roll. \n"
	helpMessage+= "You can also `/gather`, but at a penalty. If your tribe has someone who knows how to craft, you can try to learn that skill with `/train`";

	if (profession.startsWith('h')){
		profession = 'hunter'
		// use default helpMessage
	}
	if (profession.startsWith('c')){
		profession = 'crafter';
		person.canCraft = true
		helpMessage = "Welcome new crafter.  To craft, do `/craft basket` or `/craft spearhead`.  There is a 1/6 (basket) or 1/3 (spearhead) chance of failing.. \n"
		helpMessage+= "You can guard up to two children while crafting. \n"
		helpMessage+= "You can also `/gather`  or `/hunt`, but at a penalty. \n"
		helpMessage+= "By default, you will train others in crafting if they take a season to train.  To toggle this setting, use `!secrets`.";
	}
	if (profession.startsWith('g')){
		profession = 'gatherer';
		helpMessage = "Welcome new gatherer.  To gather, do `/gather`, and the bot rolls 3d6.  Higher numbers generally produce more food. \n"
		helpMessage+= "You can guard 2 children without penalty; watching 3 or 4 gives an increasing penalty; 5 is too many to gather with. \n"
		helpMessage+= "Before you set out, you might consider waiting for a crafter to make you a basket which gives you an additional gather attempt. \n"
		helpMessage+= "You can also `/hunt`, but at a penalty. If your tribe has someone who knows how to craft, you can try to learn that skill with `/train`";
	}
	person.profession = profession
    interaction.reply(actorName +" is a skilled "+profession);
    savelib.saveTribe(gameState);

    return util.ephemeralResponse(interaction, helpMessage);
}