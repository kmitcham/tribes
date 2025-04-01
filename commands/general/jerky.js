const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const general = require("../../libs/general.js")

module.exports = {
	data: new SlashCommandBuilder()
		.setName('jerky')
		.setDescription('When conditions allow, convert 3 food to 1 grain')
        .addIntegerOption(option => 
            option.setName('amount')
            .setDescription('amount of food to convert to grain')
            .setRequired(true))
            ,
    async execute(interaction, gameState, bot) {
        const amount = interaction.options.getInteger('amount');
        var sourceName = interaction.member.displayName;
        message = general.makeJerky(sourceName, amount, gameState, bot)
	},
};
