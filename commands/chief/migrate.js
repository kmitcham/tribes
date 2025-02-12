const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");
const locations = require('../../locations.json');
const legalLocations = Object.keys(locations)

module.exports = {
	data: new SlashCommandBuilder()
		.setName('migrate')
		.setDescription('Move the tribe to a different location.')
        .addStringOption(option => 
            option
            .setName('destination')
            .setDescription('Where to migrate to: ['+legalLocations.join(' | ')+']')
        )
        .addBooleanOption(option => 
            option
            .setName('force')
            .setDescription('actually do the move, even if people might die')
        )
        ,
    async execute(interaction, gameState, bot) {
        response = onCommand(interaction, gameState, bot)
        interaction.reply({ content: response, ephemeral: true })
	},
};

function onCommand(interaction, gameState, bot){
    var sourceName = interaction.user.displayName;
    var player = util.personByName(sourceName, gameState)
    var destination = interaction.options.getString('destination');
    var force = interaction.options.getBoolean('force');
    if ( !player.chief){
        cleanUpMessage(msg);; 
        return 'Migrate requires chief priviliges'
    }
    if (!destination){
        return 'Migrate requires a destination (and force to make it happen)'
    }
    if ((gameState.demand || gameState.violence)){
        return 'The game can not advance until the demand is dealt with.'
    }
    if (!gameState.reproductionRound){
        return "Migration happens in the reproduction, after chance"
    } else {
        if (gameState.needChanceRoll){
            return "Migration happens in the reproduction, after chance"
        }
    }
    
    message = util.migrate(destination, force,  gameState, bot)
    console.log('migration message is: '+message)
    if (message){
        util.messageChannel(message, gameState, bot)
    }
    return "You lead the tribe to "+destination
}

