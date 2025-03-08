const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const reproLib = require("../../libs/reproduction.js");
const locations = require('../../libs/locations.json');
const text = require("../../libs/textprocess.js");
const utils = require("../../libs/util.js");
const pop = require("../../libs/population.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('startwork')
		.setDescription('Start the work round. (Chief only)')
        ,
    async execute(interaction, gameState) {
        var actorName = interaction.member.displayName
        response = startFilter(actorName, gameState)
	},
};

function startFilter(actorName, gameState){
    var player = pop.memberByName(actorName, gameState)
    if ( !player.chief){
        text.addMessage(gameState, actorName,  "startwork requires chief priviliges")
        return
    }
    if (gameState.workRound == true){
        text.addMessage(gameState, actorName,  'already in the workRound')
        return 
    }
    if(gameState.reproductionRound == false){
        text.addMessage(gameState, actorName, 'Can only go to work round from reproduction round')
        return
    }
    return startWork(gameState, actorName)
}

function startWork(gameState, actorName){
    reproLib.restoreSaveLists(gameState);
    gameState.archiveRequired = true;
    // advance the calendar; the if should only skip on the 0->1 transition
    if (gameState.workRound == false){
        nextSeason(gameState)
    }
    // clear out old activities
    for (personName in gameState.population){
        person = pop.memberByName(personName, gameState)
        delete person.activity
    }
    pop.decrementSickness(gameState.population, gameState);
    gameState.workRound = true;
    gameState.foodRound = false;
    gameState.reproductionRound = false;
    gameState.doneMating = false;
    gameState.canJerky = false;
    reproLib.clearReproduction(gameState);
    text.addMessage(gameState, actorName, (utils.gameStateMessage(gameState)));
    text.addMessage(gameState, "tribe", '\n==>Starting the work round.  Guard (or ignore) your children, then craft, gather, hunt, assist or train.<==');
    gameState.saveRequired = true;
    return
}

function nextSeason(gameState){
	if (utils.isColdSeason(gameState)){
		for (locationName in locations){
			modifier = locations[locationName]['game_track_recover']
			oldTrack = gameState.gameTrack[locationName]
			gameState.gameTrack[locationName]  -= modifier
			if (gameState.gameTrack[locationName]< 1){
				gameState.gameTrack[locationName] = 1
			}
			console.log(locationName+' game_track moves from '+oldTrack+' to '+gameState.gameTrack[locationName])
		}
	}
	gameState.seasonCounter += 1
}