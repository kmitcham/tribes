const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");
const reproLib = require("../../reproduction.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('romance')
		.setDescription('(show your current reproduction lists)')
        ,
    async execute(interaction, gameState, bot) {
        var sourceName = interaction.user.displayName;
        response = onCommand(sourceName, gameState, bot)
        interaction.reply(response);
	},
};

function onCommand(sourceName, gameState, bot){
    var message = 'error in romance, message not set';
    message = reproLib.showMatingLists(sourceName, gameState)
    util.messagePlayerName(sourceName, message, gameState, bot)
    return message;
}