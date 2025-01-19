const locations = require('./locations.json');
const util = require("./util.js");
const killlib = require("./kill.js");
const savelib = require("./save.js");

const childSurvivalChance = 
    [ 8, 8, 8, 8, 9, 9,10,10,10,11  // 4 years
	,11,11,12,12,13,13,13,14,14,14  // 9 years
	,15,15,16,16,17,20] // the 20 is to cover aging out?  Not sure why it fails.

module.exports.scoreTribe = scoreTribe
function scoreTribe( gameState){
    population = gameState.population
    banished = gameState.banished
    deadAdults = countDeadAdults(gameState);
    banishCount = 0;
    if (banished != null ){
        banishCount = Object.keys(banished).length;
    }
    initialPlayers = Object.keys(population).length + banishCount + deadAdults
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

module.exports.endGame = endGame;
function endGame(gameState){
	adultCount = 0
    newAdultCount = 0
	population = gameState.population
    deadAdults = countDeadAdults(gameState);
    banishCount = 0;
    if (gameState.banished != null ){
        banishCount = Object.keys(gameState.banished).length;
    }
    children = gameState.children
    if (children){
        response = 'The fate of the children:\n'
        gameState.secretMating = false;
        gameState.gameOver = true;
        for (childName in children){
            var child = children[childName]
            console.log('end game scoring for '+childName+' '+child.newAdult+' '+Number(child.age)+2)
            if (!child.newAdult){
                var roll = util.roll(3)
                response += '\t'+childName+' ['+roll+' vs '+childSurvivalChance[Number(child.age)+2]+'] '
                if (roll <= childSurvivalChance[Number(child.age)+2]){
                    child.newAdult = true
                    response += 'grows up\n'
                } else {
                    response += 'dies young\n'
                    killlib.kill(childName, 'endgame scoring', gameState)
                }
            }
            if (child.newAdult){
                adultCount++
                newAdultCount++ 
            }
        }
    }

	adultCount += Object.keys(population).length
    response += 'The tribe lost '+deadAdults+' members and banished '+banishCount+'.\n';
	response += 'Count of surviving adults is:'+adultCount+' ('+newAdultCount+' new adults)';
	response += '\nThe tribe was '+ scoreTribe(gameState);
    gameState.ended = True
	savelib.saveTribe(gameState);
	return response
}

module.exports.scoreMessage = scoreMessage;
function scoreMessage(gameState, bot){
    tribeResult = scoreTribe(gameState)
    messageText = "---> Score for the tribe:"+tribeResul+" <---\n"
        + scoreChildrenMessage(gameState)
    return messageText
}

module.exports.scoreChildrenMessage = scoreChildrenMessage
function scoreChildrenMessage(gameState){
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
module.exports.countDeadAdults = countDeadAdults
function countDeadAdults( gameState){
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
  