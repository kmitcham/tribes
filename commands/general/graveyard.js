const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const text = require('../../libs/textprocess');
const pop = require('../../libs/population');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('graveyard')
		.setDescription('Show the dead of the tribe')
        ,
    async execute(interaction, gameState) {
        var displayName = interaction.user.displayName;
        pop.graveyard(displayName, gameState)
	},
};

