const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");
const helplib = require("../../help.js")

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Overview of commands')
       ,
    async execute(interaction, gameState) {
        onCommand(interaction, gameState)
	},
};

function onCommand(interaction, gameState){
    var playerName = interaction.user.displayName;
    var population = gameState.population;
    var player = population[playerName]
    
    util.ephemeralResponse(interaction, helplib.playerHelpBasic());
    util.ephemeralResponse(interaction, helplib.playerHelpRounds());
    util.ephemeralResponse(interaction, helplib.playerHelpConflict());
    
    if ((player && player.chief) ){
        util.ephemeralResponse(interaction, helplib.chiefHelp());
    }
    
    return
}