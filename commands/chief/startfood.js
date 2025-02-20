const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pop = require("../../libs/population");
const util = require("../../libs/util");
const feed = require("../../libs/feed");
const text = require("../../libs/textprocess")



module.exports = {
	data: new SlashCommandBuilder()
		.setName('startfood')
		.setDescription('Start the food round. (Chief only)')
        ,
    async execute(interaction, gameState, bot) {
        var actorName = interaction.user.displayName

        response = startFoodFilter(actorName, gameState, bot)
        interaction.reply(response);
        gameState.saveRequired = true;
	},
};

function startFoodFilter(actorName, gameState, bot){
    var player = pop.memberByName(actorName, gameState)
    if ( !player.chief){
        return "startfood requires chief privileges"
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
    gameState.workRound = false
    gameState.foodRound = true
    gameState.reproductionRound = false;
    population = gameState.population;
    clearWorkFlags(population);
    pop.decrementSickness(population, gameState, bot);
    text.addMessage(gameState, "tribe", '\n==>Starting the food and trading round.  Make sure everyone has enough to eat, or they will starve<==');
    message = util.gameStateMessage(gameState)
    console.log("start food population:"+gameState.population)
    text.addMessage(gameState, "tribe", message);

    foodMessage = feed.checkFood(gameState,bot)
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

