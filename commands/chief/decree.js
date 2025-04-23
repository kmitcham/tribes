const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pop = require("../../libs/population")
const text = require("../../libs/textprocess")
const chief = require("../../libs/chief.js");


module.exports = {
	data: new SlashCommandBuilder()
		.setName('decree')
		.setDescription('Add a law to the tribes code')
        .addStringOption(option => 
            option
            .setName('law')
            .setDescription('Write the law as the arguement')
            .setRequired(true)
        )
        .addIntegerOption(option => 
            option
            .setName('number')
            .setDescription('The number of the law in the list of laws; append to list if missing')
            .setRequired(false)
        )
        ,
    async execute(interaction, gameState, bot) {
        var actorName = interaction.member.displayName
        var lawText = interaction.options.getString('law');
        var number = interaction.options.getInteger('number');

        chief.decree(gameState, actorName, number, lawText);

	},
};
