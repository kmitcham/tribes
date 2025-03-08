const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const prof = require("../../libs/profession")

module.exports = {
	data: new SlashCommandBuilder()
		.setName('specialize')
		.setDescription('Choose a profession: Hunter, Gatherer, Crafter')
        .addStringOption(option => 
            option
            .setName('profession')
            .setDescription('one of (hunter, gatherer, crafter)')
            .addChoices(
                { name: 'hunter', value: 'hunter' },
                { name: 'crafter', value: 'crafter' },
                { name: 'gatherer', value: 'gatherer' },
            )
            .setRequired(true)),
    async execute(interaction, gameState, bot) {
        var playerName = interaction.member.displayName;
        var profession = interaction.options.getString('profession')
        prof.specialize(playerName, profession, gameState)
        gameState.saveRequired = true;
	},
};

