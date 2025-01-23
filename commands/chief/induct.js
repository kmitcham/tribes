const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const utillib = require("../../util.js");
const savelib = require("../../save.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('induct')
		.setDescription('add a person to the tribe. (Chief only')
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
                    { name: 'hunter', value: 'hunter' },
                    { name: 'crafter', value: 'crafter' },
                    { name: 'gatherer', value: 'gatherer' },
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
    var profession = interaction.options.getString('profession')
    var sourceName = interaction.user.displayName;
    var population = gameState.population;
	
    var chief = population[sourceName]
	
    if (!chief || !chief.chief){
        response = "You must be chief to induct a member"
        interaction.reply({content:response, ephemeral:true});
        return
    }
	console.log("message b")

    // check if person is in tribe
    if (targetName in population ) {
        interaction.reply({content:targetName+" is already in the tribe", ephemeral:true});
        return
    }
    var person = {}
	person.gender = gender
	person.food = 10
	person.grain = 4
	person.basket = 0
	person.spearhead = 0
	person.handle = targetObject
	person.name = targetName
	var strRoll = utillib.roll(1)
	response = 'added '+targetName+' '+gender+' to the tribe. '
	if (strRoll == 1){
		person.strength = 'weak'
		response+= targetName +' is weak.'
	} else if (strRoll == 6){
		person.strength = 'strong'
		response+= targetName +' is strong.'
	} 
    targetObject.send(sourceName+" inducts you into the tribe.")
	gameState.population[targetName] = person
	if (profession){
		helpMessage = utillib.specialize(targetName, profession, gameState)
        targetObject.send(helpMessage)
	}
    console.log("message d")

    interaction.reply({content:response, ephemeral:false});
	savelib.saveTribe(gameState);
	if (!person.strength){
		targetObject.send("You are of average strength")
	}
	utillib.history(targetName, "Joined the tribe", gameState)

}
function onError(interaction, response){
    interaction.user.send(response);
        const embed = new EmbedBuilder().setDescription(response);
		interaction.reply({ embeds: [embed], ephemeral: true })
			.catch(console.error);
        return
}