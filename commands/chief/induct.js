const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const chief = require("../../libs/chief.js");

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
                    { name: 'male', value: 'male' },
                    { name: 'female', value: 'female' },
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
        targetObject = interaction.options.getMember('target')
        var targetName = targetObject.displayName;
        var gender = interaction.options.getString('gender')
        var profession = interaction.options.getString('profession')
        var sourceName = interaction.member.displayName;        
        chief.induct(gameState, sourceName, targetName, gender, profession);
	},
};