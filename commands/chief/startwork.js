const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");
const savelib = require("../../save.js");
const reproLib = require("../../reproduction.js");
const locations = require('../../locations.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('startwork')
		.setDescription('Start the work round. (Chief only)')
        ,
    async execute(interaction, gameState, bot) {
        var actorName = interaction.user.displayName
        response = startFilter(actorName, gameState, bot)
        interaction.reply(response)
	},
};

function startFilter(actorName, gameState, bot){
    var player = util.personByName(actorName, gameState)
    if ( !player.chief){
        return "startfood requires chief priviliges"
    }
    if (gameState.workRound == true){
        return 'already in the workRound'
    }
    if(gameState.reproductionRound == false){
        return 'Can only go to work round from reproduction round'
    }
    return startWork(gameState, bot)
}

function startWork(gameState, bot){
    reproLib.restoreSaveLists(gameState, bot);
    savelib.archiveTribe(gameState);
    // advance the calendar; the if should only skip on the 0->1 transition
    if (gameState.workRound == false){
        nextSeason(gameState)
    }
    // clear out old activities
    for (personName in gameState.population){
        person = population[personName]
        delete person.activity
    }
    util.decrementSickness(gameState.population, gameState, bot)
    gameState.workRound = true;
    gameState.foodRound = false;
    gameState.reproductionRound = false;
    gameState.doneMating = false;
    gameState.canJerky = false;
    reproLib.clearReproduction(gameState, bot)
    util.messageChannel(util.gameStateMessage(gameState, bot), gameState, bot)
    util.messageChannel('\n==>Starting the work round.  Guard (or ignore) your children, then craft, gather, hunt, assist or train.<==', gameState, bot)
    savelib.saveTribe(gameState);
    return "Started the work round"
}

function nextSeason(gameState){
	if (util.isColdSeason(gameState)){
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