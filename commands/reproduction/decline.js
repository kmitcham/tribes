const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");
const reproLib = require("../../reproduction.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('decline')
		.setDescription('Space seperated list of names of people you would NOT mate with.')
        .addStringOption(option => 
            option
            .setName('declinelist')
            .setDescription('add !save to retain the list. ')
        )
        ,
    async execute(interaction, gameState, bot) {
        onCommand(interaction, gameState, bot)
        console.log("decline response: "+response)
        interaction.reply({ content: "decline updated", ephemeral: true })
	},
};

function onCommand(interaction, gameState, bot){
    var population = gameState.population;
    var sourceName = interaction.user.displayName;

    var player = population[sourceName]
    var message = 'error in invite, message not set';
    var rawList = interaction.options.getString('declinelist');
    if (! rawList ) {
        if (player.declinelist){
            return "Current declinelist: "+player.declinelist.join(" ")
        } else {
            return "No current declinelist"
        }
        
    }
    let messageArray = rawList.split(" ");
    console.log("diverting for secret mating");
    reproLib.decline(sourceName, messageArray,  gameState, bot);
    return 
}