const locations = require('./locations.json');
const util = require("./util.js");

module.exports.endGame = (gameState)=> {
	adultCount = 0
	response = 'The fate of the children:\n'
	children = gameState.children
	population = gameState.population
	gameState.secretMating = false;
	gameState.gameOver = true;
	for (childName in children){
		var child = children[childName]
		console.log('end game scoring for '+childName+' '+child.newAdult+' '+child.age+2)
		if (!child.newAdult){
			var roll = util.roll(3)
			response += '\t'+childName+' ['+roll+' vs '+childSurvivalChance[child.age+2]+'] '
			if (roll <= childSurvivalChance[child.age+2]){
				child.newAdult = true
				response += 'grows up\n'
			} else {
				response += 'dies young\n'
				killlib.kill(childName, 'endgame scoring', gameState)
			}
		}
		if (child.newAdult){
			adultCount++
		}
	}
	adultCount += Object.keys(population).length
	response += 'Count of surviving adults is:'+adultCount
	response += '\nThe tribe was '+scoreTribe(gameState);
	savelib.saveTribe(gameState);
	allGames[gameState.name] = gameState;
	return response
}

module.exports.scoreTribe = ( gameState) =>{
    population = gameState.population
    banished = gameState.banished
    deadAdults = countDeadAdults(gameState);
    initialPlayers = Object.keys(population).length + Object.keys(banished).length + deadAdults
    tribeTotal = Object.keys(population).length + Object.keys(gameState.children).length
    tribeResult = "Unsuccessful"
    if (tribeTotal < (2*initialPlayers)){
        tribeResult = "Marginally successful"
    } else if (tribeTotal < (3*initialPlayers)){
        tribeResult = "Successful"
    } else {
        tribeResult = "Very successful"
    }
    gameState.tribeResult = tribeResult
    return tribeResult;    
}

module.exports.scoreMessage = (gameState, bot) =>{
    tribeResult = scoreTribe(gameState)
    messageText = "---> Score for the tribe:"+tribeResul+" <---\n"
        + scoreChildrenMessage(gameState)
    return messageText
}

module.exports.scoreChildrenMessage = (gameState) => {
    children = gameState.children
	var parentScores = {}
	for (childName in children){
		var child = children[childName]
		if (parentScores[child.mother]){
			parentScores[child.mother]++
		} else {
			parentScores[child.mother] = 1
		}
		if (parentScores[child.father]){
			parentScores[child.father]++
		} else {
			parentScores[child.father] = 1
		}
	}
	message = 'Child scores:\n'
	for (parentName in parentScores){
		player = util.personByName(parentName, gameState)
		if (player){
			message+= '\t'+parentName+'('+player.gender.substring(0, 1)+'): '+parentScores[parentName]
		} else {
			console.log('Cound not find parent '+[parentName]+'with score '+parentScores[parentName])
		}
	}
	return message
}
module.exports.countDeadAdults = ( gameState) =>{
    graveyard = gameState.graveyard
    deadAdults = 0;
    for (entryName in graveyard){
        member = graveyard[entryName]
        if ("profession" in member){
            deadAdults++;
        } else if ("age" in member) {
            // skip the children
        } else {
            console.log("Surprise name in graveyard:"+entryName)
        }
    }
    return deadAdults
}

/*
in startWork:
   remove
*/

function setReminder(gameState, bot){
    // remove existing reminderTimer, if any
    if (gameState.reminderId){
        clearTimeout(gameState.reminderId);
        gameState.reminderId = null;
    }
    if (!gameState.maxSeasons || ! gameState.endTimestamp){
        console.log("Can not setReminder with maxSeasons and endTime")
        return;
    }
    turnsRemaining = 20;
    // get turnsRemaining
    if (gameState.maxSeasons < gameState.seasonCounter){
        turnsRemaining = (gameState.maxSeasons - gameState.seasonCounter)
    } else {
        console.log("Failed to get maxSeasons ")
    }
    // get timeRemaining
    nowStamp = performance.now();
    // set duration = timeRemaining/turnsRemaing in minutes
    if (gameState.endTimestamp > nowStamp){
        timeRemainingMillis = (gameState.endTimestamp - nowStamp)
        targetDuration = timeRemainingMillis/ turnsRemaining
    } else {
        targetDuration = (gameState.endTimestamp - gameState.startStamp)
        targetDuration = timeRemainingMillis/ gameState.maxSeasons 
        console.log("Defaulting time remaining since they went over")
    }
    delayMillis = (targetDuration/turnsRemaining)
    if (delayMillis < (2 * 60 * 1000) ){
        console.log("min interval for reminder is 2 minutes");
        delayMillis = 2 * 60 * 1000;
    }
    // set message = "You have taken more than "+duration+" minutes for this round.  This puts you at risk for taking longer than intended."
    gameState.reminderId = setTimeout(playReminder, delayMillis ,  message, gameState, bot);
    console.log("setting a reminder for "+delayMillis/60000+" minutes from now")
}

function playReminder(message, gameState, bot){
    util.messageChannel(message, gameState, bot)
    setReminder(gameState, bot)
}

module.exports.setEndTime = (gameState, bot, args) =>{
    // parse the args to a timestamp
    // set the endTime
    // announce the gameEnd time
    // trigger a reminder, if possible?
}

module.exports.setMaxSeasons = (gameState, bot, args) =>{
    // parse the args to a timestamp
    // set the reminder
    // announce the maxSeason
    // trigger a reminder, if possible
}


module.exports.run = async (bot, message, args, data) =>{
    if (args instanceof Array && args.length != 1 ) {
        if (message){
            message.reply(module.exports.help.usage);
        }
    } else {
        delay = args
        if (message){
            message.reply('Setting delay to '+delay);
        }
        var oldValue = 0;
        var currentdate = new Date(); 
        var datetime = currentdate.getDate() + "/"
                    + (currentdate.getMonth()+1)  + "/" 
                    + currentdate.getFullYear() + " @ "  
                    + currentdate.getHours() + ":"  
                    + currentdate.getMinutes() + ":" 
                    + currentdate.getSeconds();
        message.reply('It is now '+datetime +' epoch '+currentdate.getTime());
        const delaytime = new Date(currentdate.getTime()+ (1000 * delay))
        setTimeout(myFunc, delay * 1000,  message, data);
        data['delay'] = delaytime
    }
    return data;
}
function myFunc( message, data) {
    
    if (message){
        if (data['delay']){
            message.reply("The delay was still set:"+data['delay']);
        } else {
            message.reply("The delay was cleared");
        }
    }
}
  