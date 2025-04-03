const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pop = require("../../libs/population.js")
const text = require("../../libs/textprocess.js")
const general = require("../../libs/general.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('inventory')
		.setDescription('Show the inventory a player or the whle tribe; default shows everyone')
        .addUserOption(option => 
            option
                .setName('target')
                .setDescription('Which tribe member to display')
                .setRequired(false)),
    async execute(interaction, gameState) {
		var targetUser = interaction.options.getMember('target');
        var targetName = null;
        if (targetUser){
            targetName = targetUser.name;
        }
		var actorName = interaction.member.displayName;
		var response = general.inventory(gameState, targetName, actorName );
        console.log("inventory response:"+response)
	},
};

