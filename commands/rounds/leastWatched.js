const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");
const guardlib = require("../../guardCode.js")

module.exports = {
	data: new SlashCommandBuilder()
		.setName('leastguarded')
		.setDescription('Show the least protected child.')
        ,
    async execute(interaction, gameState) {
        onCommand(interaction, gameState)
	},
};

function onCommand(interaction, gameState){
    children = gameState.children;
    response  = guardlib.findLeastGuarded(children, gameState.population)
    return util.ephemeralResponse(interaction, response)
}