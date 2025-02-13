const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const utillib = require("../../util.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('rollsomedice')
		.setDescription('roll at least one die')
        .addIntegerOption(option => 
            option
                .setName('number')
                .setDescription('number of dice')
                .setRequired(false))
        ,
    async execute(interaction, gameState, bot) {
        var count  = interaction.options.getInteger('number') || 1;
        console.log("number of dice = "+count)
        message = "the result of rolling "+count+" dice was "+utillib.roll(count)
        utillib.ephemeralResponse(interaction, message);
	},
};
