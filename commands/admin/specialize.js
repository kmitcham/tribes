const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const prof = require("../../libs/profession")

module.exports = {
	data: new SlashCommandBuilder()
		.setName('specialize')
		.setDescription('Choose a profession: Hunt, Gather, Craft')
        .addStringOption(option => 
            option
            .setName('profession')
            .setDescription('one of (hunt, gather, craft)')
            .addChoices(
                { name: 'hunter', value: 'hunt' },
                { name: 'crafter', value: 'craft' },
                { name: 'gatherer', value: 'gather' },
            )
            .setRequired(true)),
    async execute(interaction, gameState, bot) {
        var playerName = interaction.user.displayName;
        var profession = interaction.options.getString('profession')
        prof.specialize(playerName, profession, gameState, bot)
        interaction.reply(playerName+" knows how to "+profession)
        gameState.saveRequired = true;
	},
};

