const { SlashCommandBuilder } = require('discord.js');
const util = require("../../util.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('inventory')
		.setDescription('Show the inventory a player or the whle tribe')
        .addUserOption(option => 
            option
                .setName('target')
                .setDescription('Which tribe member to display')
                .setRequired(false)),
    async execute(interaction, gameState) {
        var response = inventory(interaction, gameState)
        //console.log(response)
        return interaction.reply(response);
	},
};

function inventory(interaction, gameState ){
    var target = interaction.options.getMember('target')
    
    if (!target ){
        response = 'Whole Tribe Inventory:'
        for (var personName in gameState.population){
            person = util.personByName(personName, gameState)
            response += '\n  '+inventoryMessage(person)
        }
    }else {
        var targetName = target.displayName;
        person = util.personByName(targetName, gameState)

        if (!person || person == null){
            response = targetName +' does not seem to be a person';
            return response;
        }
        response = inventoryMessage(person)
    }
    return response;
}

function inventoryMessage(person){
	if (!person){
		return 'No person '+person
	}
    message = person.name 
    if (person.nickname ){
		message += " ("+person.nickname+")"
	} 
    message += " "+person.gender.substring(0,1)+'\n\t\t '
	message += person.food+'  food \t'
	message += person.grain+'  grain \t'
	message += person.basket+'  baskets \t'
	message += person.spearhead+'  spearheads \t'
	if (person.profession){
		message += person.profession.padEnd(9,' ')
	} else {
		message += "         "
	}
	if (person.isPregnant && person.isPregnant != ''){
		message += '\n\t\t is pregnant with '+person.isPregnant
	}
	if (person.nursing && person.nursing.length > 0 ){
		message += '\n\t\t is nursing '+person.nursing
	}
	if (person.isInjured && person.isInjured > 0 ){
		message += '\n\t\t is injured and unable to work'
	}	
	if (person.isSick && person.isSick > 0 ){
		message += '\n\t\t is sick and unable to work'
	}
	if (person.guarding){
		message += '\n\t\t is guarding '+person.guarding
	}
	if (person.strength){
		message += '\n\t\t is '+person.strength
	}
	if (person.profession != 'crafter' && person.canCraft){
		message += '\n\t\t is able to craft a little'
	}
	if (person.chief){
		message += '\n\t\t is Chief'
	}
	return message
}