const { SlashCommandBuilder } = require('discord.js');
const savelib = require("../../libs/save.js");

module.exports = {
	data: new SlashCommandBuilder() 
		.setName('autorefresh')
		.setDescription('Toggle automatic client refresh every 30 seconds')
		.addBooleanOption(option =>
			option
				.setName('enabled')
				.setDescription('Enable (true) or disable (false) auto-refresh')
				.setRequired(true))
	,
	async execute(interaction, gameState) {
		const actorName = interaction.member.displayName;
		const enabled = interaction.options.getBoolean('enabled');
		
		// Set the autoRefresh flag
		gameState.autoRefresh = enabled;
		gameState.saveRequired = true;
		
		const statusText = enabled ? 'enabled' : 'disabled';
		
		interaction.reply({
			content: `Auto-refresh has been ${statusText} by ${actorName}. Clients will ${enabled ? 'automatically refresh every 30 seconds' : 'only refresh manually or after commands'}.`,
			ephemeral: false
		});
	},
};