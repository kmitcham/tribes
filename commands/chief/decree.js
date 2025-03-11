const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pop = require("../../libs/population")
const text = require("../../libs/textprocess")


module.exports = {
	data: new SlashCommandBuilder()
		.setName('decree')
		.setDescription('Add a law to the tribes code')
        .addStringOption(option => 
            option
            .setName('law')
            .setDescription('Write the law as the arguement')
            .setRequired(true)
        )
        .addIntegerOption(option => 
            option
            .setName('number')
            .setDescription('The number of the law in the list of laws; append to list if missing')
            .setRequired(false)
        )
        ,
    async execute(interaction, gameState, bot) {
        var actorName = interaction.member.displayName
        var lawText = interaction.options.getString('law');
        var number = interaction.options.getInteger('number');

        decree(gameState, actorName, number, lawText);

	},
};

function decree(gameState, actorName, number, lawText){
    var player = pop.memberByName(actorName, gameState)
    if ( !player.chief){
        text.addMessage(gameState, actorName, 'decree requires chief priviliges' )
        return
    }
    law =lawText
    if (! gameState.laws){
        gameState.laws = {};
        console.log("Initializing laws");
    }
    if ( !number ){
        number = Object.keys(gameState.laws).length
        console.log("defauting law number "+number);
    } 
    gameState.laws[number] = law;
    text.addMessage(gameState, "tribe","Your chief creates a new law: "+law);
    gameState.saveRequired = true;
    return
}