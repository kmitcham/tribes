const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const helplib = require("../../libs/help.js")
const text = require("../../libs/textprocess.js")

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
    
    
    text.addMessage(gameState,playerName,helplib.playerHelpBasic());
    text.addMessage(gameState,playerName, helplib.playerHelpRounds());
    text.addMessage(gameState,playerName,helplib.playerHelpConflict());
    
    if ((player && player.chief) ){
        text.addMessage(gameState,playerName, helplib.chiefHelp());
    }
    
    return
}