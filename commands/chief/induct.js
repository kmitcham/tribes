const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");
const savelib = require("../../save.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('induct')
		.setDescription('add a person to the tribe')
        .addUserOption(option => 
            option
                .setName('target')
                .setDescription('Discord user to add to the tribe')
                .setRequired(true))
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
                    { name: 'hunter', value: 'h' },
                    { name: 'crafter', value: 'c' },
                    { name: 'gatherer', value: 'g' },
                )
                .setRequired(false))
        ,
    async execute(interaction, gameState) {
        await induct(interaction, gameState)
	},
};

function induct(interaction, gameState){
    targetObject = interaction.options.getMember('target')
    var targetName = targetObject.displayName;
    var gender = interaction.options.getString('gender')
    var profession = interaction.option.getString('profession')
    var sourceName = interaction.user.displayName;
    var population = gameState.population;

    var chief = population[sourceName]
    if (!chief || !chief.isChief){
        response = "You must be chief to induct a member"
        return onError(interaction, response)
    }

    // check if person is in tribe
    if (targetName in population ) {
        return onError(targetName+" is already in the tribe")
    }
    var person = {}
	person.gender = gender
	person.food = 10
	person.grain = 4
	person.basket = 0
	person.spearhead = 0
	person.handle = targetObject
	person.name = target
	var strRoll = util.roll(1)
	response = 'added '+target+' '+gender+' to the tribe. '
	if (strRoll == 1){
		person.strength = 'weak'
		response+= target +' is weak.'
	} else if (strRoll == 6){
		person.strength = 'strong'
		response+= target +' is strong.'
	} 
	gameState.population[target] = person
	if (profession){
		util.specialize(msg, target, profession, gameState)
	}
	util.messageChannel(response, gameState, bot)
	savelib.saveTribe(gameState);
	if (!person.strength){
		util.messagePlayerName(target, "You are of average strength", gameState, bot)
	}
	util.history(target, "Joined the tribe", gameState)

}
function onError(interaction, response){
    interaction.user.send(response);
        const embed = new EmbedBuilder().setDescription(response);
		interaction.reply({ embeds: [embed], ephemeral: true })
			.catch(console.error);
        return
}