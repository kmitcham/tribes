const { SlashCommandBuilder } = require('../../libs/command-builders.js');

module.exports = {
    category: 'admin',
    data: new SlashCommandBuilder()
        .setName('importgame')
        .setDescription('[REFEREE ONLY] Import complete game data for a tribe')
        .addStringOption(option =>
            option.setName('tribe')
                .setDescription('Name of the tribe to import data into')
                .setRequired(true)),

    async execute(interaction, gameState, allGames) {
        // This command is handled by the websocket interface
        // This file is for Discord compatibility only
        await interaction.reply({
            content: 'This command must be used through the web interface.',
            ephemeral: true
        });
    }
};