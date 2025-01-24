const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");
const reproLib = require("../../reproduction.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('consent')
		.setDescription('The list of people you will mate with given an invitation.')
        .addStringOption(option => 
            option
            .setName('consentlist')
            .setDescription('add !save to retain the list. !any')
        )
        ,
    async execute(interaction, gameState, bot) {
        onCommand(interaction, gameState, bot)
        console.log("consent updated"+response)
        interaction.reply({ content: "Consent list updated", ephemeral: true })
	},
};

function onCommand(interaction, gameState, bot){
    var population = gameState.population;
    var sourceName = interaction.user.displayName;

    var player = population[sourceName]
    var rawList = interaction.options.getString('consentlist');
    if (! rawList ) {
        if (player.consentList){
            return "Current consentList: "+player.consentList.join(" ")
        } else {
            return "No current consentList"
        }   
    }
    let messageArray = rawList.split(" ");
    console.log("updating consentlist");
    reproLib.consent(sourceName, messageArray,  gameState, bot);
    return 
}