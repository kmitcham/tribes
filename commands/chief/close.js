const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const chief = require("../../libs/chief.js");


module.exports = {
	data: new SlashCommandBuilder()
		.setName('close')
		.setDescription('Set the tribe so that only the chief can induct new members. (Chief only)')
        ,
    async execute(interaction, gameState, bot) {
        var actorName = interaction.member.displayName

        response = chief.close(actorName, gameState)
	},
};