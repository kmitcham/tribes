const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");
const savelib = require("../../save.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('startfood')
		.setDescription('Start the food round. (Chief only)')
        ,
    async execute(interaction, gameState, bot) {
        var actorName = interaction.user.displayName

        response = startFoodFilter(actorName, gameState, bot)
        interaction.reply(response)
	},
};

function startFoodFilter(actorName, gameState, bot){
    var player = util.personByName(actorName, gameState)
    if ( !player.chief){
        return "startfood requires chief priviliges"
    }
    if (gameState.foodRound == true){
        return 'already in the foodRound'
    }
    if(gameState.workRound == false){
        return 'Can only go to food round from work round'
    }
    return startFood(gameState, bot)
}

function startFood(gameState, bot){
    savelib.archiveTribe(gameState);
    gameState.workRound = false
    gameState.foodRound = true
    gameState.reproductionRound = false
    population = gameState.population
    clearWorkFlags(population)
    util.decrementSickness(population, gameState, bot)
    message = util.gameStateMessage(gameState)
    console.log("2 "+gameState.population)

    util.messageChannel(message, gameState, bot)
    savelib.saveTribe(gameState);
    foodMessage = util.checkFood(gameState, bot)
    util.messageChannel(message+'\n==>Starting the food and trading round.  Make sure everyone has enough to eat, or they will starve<==', gameState, bot)
    return foodMessage
}

function clearWorkFlags(population){
    // for every person
    // if injured and !worked, injured = false
    // worked = false
    for  (var targetName in population) {
        person = population[targetName]
        if (! person){
            console.log('null person for name '+targetName)
            continue
        }
        if (person.isInjured && person.isInjured > 0 && person.worked == false){
            // did not work means rested
            person.activity = 'recovery'
            util.history(person.name, "recovered from injury", gameState)
        }
        if (person.isSick && person.isSick > 0 && person.worked == false){
            // did not work means rested
            person.activity = 'recovery'
            util.history(person.name, "recovered from illness", gameState)
        }
        person.worked = false
    }
}

