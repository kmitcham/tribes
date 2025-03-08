const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong to confirm the TribesBot is alive.'),
	async execute(interaction) {
		return interaction.reply('Pong!');
	},
};
