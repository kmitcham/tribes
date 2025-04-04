const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const repro = require("../../libs/reproduction");
const text = require("../../libs/textprocess");
const pop = require("../../libs/population");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('startreproduction')
		.setDescription('Start the reproduction round. (Chief only)')
        ,
    async execute(interaction, gameState, bot) {
        var actorName = interaction.member.displayName

        var player = pop.memberByName(actorName, gameState)
        if ( !player.chief){
            text.addMessage(gameState, actorName,  "startreproduction requires chief priviliges")
            return
        }
        if ( gameState.ended ){
            text.addMessage(gameState, actorName,  'The game is over.  Maybe you want to /join to start a new game?');
            return
        }
        if (gameState.reproductionRound == true){
            text.addMessage(gameState, actorName,  'already in the reproductionRound')
            return 
        }
        if(gameState.foodRound == false){
            text.addMessage(gameState, actorName, 'Can only go to reproduction round from food round')
            return
        }
        repro.startReproduction(gameState, bot);
        if (response){
            response = "Reproduction activities are complete."
        } else {
            response = "Reproduction activities are underway"
        }
        text.addMessage(gameState, "tribe", response);
        var d = new Date();
        var saveTime = d.toISOString();
        saveTime = saveTime.replace(/\//g, "-");
        console.log(saveTime+" start reproduction round  season:"+gameState.seasonCounter);
	},
};


