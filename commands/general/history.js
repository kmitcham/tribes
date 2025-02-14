const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");
const helplib = require("../../help.js")

module.exports = {
	data: new SlashCommandBuilder()
		.setName('history')
		.setDescription('History of your activity in the tribe')
       ,
    async execute(interaction, gameState) {
        onCommand(interaction, gameState)
	},
};

function onCommand(interaction, gameState){
    var playerName = interaction.user.displayName;
    var player = util.personByName(playerName, gameState)
    util.ephemeralResponse(interaction, "Your history will be messaged to you.");
    messages = player.history
    // might be better to batch these?
    array.forEach(function (message, index) {
        util.messagePlayerName(playerName, message, gameState, bot)
    })
    return
}