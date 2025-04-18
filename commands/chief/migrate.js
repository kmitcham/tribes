const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const migrate = require("../../libs/migrateLib.js");
const locations = require('../../libs/locations.json');
const text = require('../../libs/textprocess');
const legalLocations = Object.keys(locations)


module.exports = {
	data: new SlashCommandBuilder()
		.setName('migrate')
		.setDescription('Move the tribe to a different location.')
        .addStringOption(option => 
            option
            .setName('destination')
            .setDescription('Where to migrate to: ['+legalLocations.join(' | ')+']')
            // is there a way to do this from legalLocations dynamically?
            .addChoices(
                { name: 'veldt', value: 'veldt' },
                { name: 'marsh', value: 'marsh' },
                { name: 'hills', value: 'hills' },
                { name: 'forest', value: 'forest'}
            )
        )
        .addBooleanOption(option => 
            option
            .setName('go')
            .setDescription('when false, just show who needs food to make the trip alive')
        )
        ,
    async execute(interaction, gameState, bot) {
        var sourceName = interaction.member.displayName;
        var destination = interaction.options.getString('destination');
        var force = interaction.options.getBoolean('go');
        value = migrate.migrate(sourceName, destination, force, gameState)
        if (value == 0){
            text.addMessage(gameState, sourceName, "You lead the tribe to "+destination)
        }
        console.log("response to migrate was "+value)
        gameState.saveRequired = true;
	},
};

