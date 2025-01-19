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
    async execute(interaction, gameState, bot) {
        const actor = interaction.member;
        const profession = interaction.options.getString('profession')
        message = specialize(actor, gameState, bot, profession)
        interaction.reply(message)
	},
};

function onCommand(joiner, gameState, bot, profession){
    var profession = 'invalid';
    var actorName = joinder.displayName;
    var person = gameState.population[actorName]

    if (profession ){
        if (profession.toLowerCase().startsWith('c')){
            profession = 'crafter'
        } else if (profession.toLowerCase().startsWith('h')){
            profession = 'hunter'
        } else if (profession.toLowerCase().startsWith('g')){
            profession = 'gatherer'
        } else {
            return "No such profession as "+profession+" Legal professions: hunter, gatherer, crafter"
        }
    }

	if (!person ){
        return 'You must be in the tribe to specialize'
	}
	if (person.profession){
		return  'You already have a profession:'+person.profession
	}
	helpMessage = util.specialize(actorName, profession, gameState)
    util.messagePlayerName(actorName, helpMessage, bot)
    savelib.saveTribe(gameState);
	return actorName +" is a skilled "+profession;

}