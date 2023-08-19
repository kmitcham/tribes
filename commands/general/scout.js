const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");
const huntlib = require("../../hunt.js")

module.exports = {
	data: new SlashCommandBuilder()
		.setName('scout')
		.setDescription('Show the resources of an environment, defaulting to the current one.')
        .addStringOption(option => 
            option
            .setName('location')
            .setDescription('one of (veldt,forest,marsh,hills)')
            .setRequired(false)),
    async execute(interaction, gameState) {
        onCommand(interaction, gameState)
	},
};

function onCommand(interaction, gameState){
    var targetLocation = gameState.currentLocationName;

    if (interaction.options.getString('location')){
        targetLocation = interaction.options.getString('location');
        if (targetLocation.toLowerCase().startsWith('v')){
            targetLocation = 'veldt'
        } else if (targetLocation.toLowerCase().startsWith('f')){
            targetLocation = 'forest'
        } else if (targetLocation.toLowerCase().startsWith('m')){
            targetLocation = 'marsh'
        } else if (targetLocation.toLowerCase().startsWith('h')){
            targetLocation = 'hills'
        } else {
            return util.ephemeralResponse("No such location as "+targetLocation+" Legal locations: veldt,forest,marsh,hills")
        }
    }

    response = huntlib.getScoutMessage(targetLocation, gameState)
    return util.ephemeralResponse(interaction, response)
}