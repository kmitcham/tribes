const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const reproLib = require("../../libs/reproduction.js");
const text = require("../../libs/textprocess.js");
const pop = require("../../libs/population.js");

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
	},
};

function onCommand(interaction, gameState, bot){
    var sourceName = interaction.member.displayName;
    var rawList = interaction.options.getString('declinelist');

    var player = pop.memberByName(sourceName, gameState);
    if (! rawList ) {
        if (player.declinelist){
            text.addMessage(gameState, sourceName, "Current declinelist: "+player.declinelist.join(" "));
            return;
        } else {
            text.addMessage(gameState, sourceName, "No current declinelist");
            return 
        }
        
    }
    let messageArray = rawList.split(" ");
    console.log("applying decline list to mating for "+sourceName);
    reproLib.decline(sourceName, messageArray,  gameState, bot);
    return 
}