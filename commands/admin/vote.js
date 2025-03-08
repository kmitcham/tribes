const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const text = require("../../libs/textprocess.js")
const pop = require("../../libs/population.js")

module.exports = {
	data: new SlashCommandBuilder()
		.setName('vote')
		.setDescription('Select someone to be chief.  A majority wins.')
		.addUserOption(option => 
            option
                .setName('candidate')
                .setDescription('Which tribe member to vote for')
                .setRequired(true))
	,
    async execute(interaction, gameState, bot) {
		var actorName = interaction.member.displayName;
		var candidateName = interaction.options.getMember('candidate').displayName;
        pop.vote(gameState, actorName, candidateName)
		gameState.saveRequired = true;
	},
};

