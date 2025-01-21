const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('foodcheck')
		.setDescription('examine the food situation for every adult and living child')
        ,
    async execute(interaction, gameState, bot) {
        onCommand(interaction, gameState, bot)
	},
};

function onCommand(interaction, gameState, bot){
	message = util.checkFood(gameState, bot)
    util.ephemeralResponse(interaction, message)
    return
}
