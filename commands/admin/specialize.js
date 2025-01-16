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
	helpMessage = util.specialize(null, actorName, profession, gameState)
	interaction.reply(actorName +" is a skilled "+profession);
    savelib.saveTribe(gameState);

    return util.ephemeralResponse(interaction, helpMessage);
}