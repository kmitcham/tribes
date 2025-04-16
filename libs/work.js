const pop = require("./population.js")
const text = require("./textprocess.js");
const dice = require("./dice")
const gatherlib = require("./gather.js")
const referees = require("./referees.json");
const locations = require('./locations.json');


//////////////////////////////////////////////////////////
/////  WORK SECTION   
/////////////////////////////////////////////////////////

function gather(gameState, sourceName, forceRoll){
	if ( gameState.ended ){
		text.addMessage(gameState, sourceName,  'The game is over.  Maybe you want to /join to start a new game?');
		return
	}

    player = pop.memberByName(sourceName, gameState);
    msg = canWork(gameState, player);

    if (msg) {
        text.addMessage(gameState, sourceName, msg)
        return
    }
    if (player.guarding && player.guarding.length >= 5){
        text.addMessage(gameState, sourceName, 'You can not gather while guarding more than 4 children.  You are guarding '+player.guarding )
        return
    }
    var gatherRoll = dice.roll(3)
    if (referees.includes(sourceName) && forceRoll){
        gatherRoll = forceRoll;
        if (gatherRoll < 3 || 18 < gatherRoll){
            text.addMessage(gameState, sourceName,'Roll must be 3-18' )
            return
        }
    }
    message = gatherlib.gather( sourceName, player, gatherRoll, gameState)
	pop.history(sourceName, message, gameState);
    gameState.saveRequired = true;

}
module.exports.gather = gather;

function gatherDataFor(locationName, roll){
	resourceData = locations[locationName]['gather']
	maxRoll = resourceData[resourceData.length-1][0]
	minRoll = resourceData[0][0]
	if (roll > maxRoll){
		roll = maxRoll
	}
	if (roll < minRoll){
		roll = minRoll
	}
	for (var i=0; i < resourceData.length; i++){
		if (resourceData[i][0] == roll){
			return resourceData[i]
		}
	}
	console.log('error looking up resourceData for '+locationName+' '+type+' '+roll)
}
module.exports.gatherDataFor = gatherDataFor;

// this is used by Ready
function listReadyToWork(population){
	var unworked = []
	for (playerName in population){
		person = population[playerName]
		// edit can leave isinjured as the string 'false'
		if (person.worked || (person.isInjured && person.isInjured > 0)
			||(person.isSick && person.isSick > 0 )){
			// do nothing
		} else {
			unworked.push(playerName)
		}
	}
	return unworked
}
module.exports.listReadyToWork = listReadyToWork;

function canWork(gameState, player){

	if (gameState.workRound == false ){
		msg = 'Can only work during the work round';
		return msg;
	}
	if (player == null){
		msg = 'Only tribe members can work.  Maybe !join';
		return msg;
	}
	if (player.isInjured && player.isInjured > 0 ){
		msg = 'You cannot work while you are injured';
		return msg;
	}
	if (player.isSick && player.isSick > 0 ){
		msg = 'You cannot work while you are sick'
		return msg;
	}
	if (player.worked == true){
		msg = 'You cannot work (again) this round'
		return msg;
	}
	return null;
}
module.exports.canWork = canWork;

function craft(gameState, sourceName, item, forceRoll){

    player = pop.memberByName(sourceName, gameState);
    msg = canWork(gameState, player);

    if (msg) {
        text.addMessage(gameState, sourceName, msg)
        return
    }
    if (player.canCraft == false){
        text.addMessage(gameState, sourceName, 'You do not know how to craft')
        return
    }
    if (player.guarding && player.guarding.length > 2){
        text.addMessage(gameState, sourceName,  'You can not craft while guarding more than 2 children.  You are guarding '+player.guarding)
        return
    }

    if (item.startsWith('b') ) {
        item = 'basket'
    } else if ( item.startsWith('s')){
        item = 'spearhead'
    } else {
        response = "Unrecognized item "+item;
        return onError(interaction, response);
    }
    
    var craftRoll = dice.roll(1)
	if (referees.includes(sourceName) && forceRoll){
		craftRoll = forceRoll
        if (craftRoll < 1 || 6 < craftRoll){
            text.addMessage(gameState, sourceName, "forceRoll must be 1-6")
		    return
		}
	}
    var rollValue = craftRoll;
	console.log('craft type '+item+' roll '+craftRoll)
	player.worked = true
	var message = sourceName+' crafts['+craftRoll+'] a '+item
	if (player.profession != 'crafter'){
		rollValue -= 1
	}
	if (rollValue > 1 && item == 'basket'){
			player.basket += 1
	} else if (rollValue > 2 && item == 'spearhead') {		
			player.spearhead += 1
	} else {
		message =  sourceName+ ' creates something['+craftRoll+'], but it is not a '+item
	}
	pop.history(sourceName,message, gameState)
	player.activity = 'craft'    
    player.worked = true;
    gameState.saveRequired=true;

    text.addMessage(gameState, "tribe", message)

}
module.exports.craft = craft;

function train(gameState, sourceName, forceRoll){
	var population = gameState.population;
	player = pop.memberByName(sourceName, gameState);
	msg = canWork(gameState, player);

	if (msg) {
		text.addMessage(gameState, sourceName,msg )
		return
	}
	if (player.canCraft){
		text.addMessage(gameState, sourceName,'You already know how to craft.' )
		return
	}
	if (player.guarding && player.guarding.length > 2){
		text.addMessage(gameState, sourceName,'You can not learn crafting while guarding more than 2 children.  You are guarding '+player.guarding )
		return
	}
	var crafters = pop.countByType(population, 'canCraft', true)
	var noTeachers = pop.countByType(population, 'noTeach', true)
	if (crafters <= noTeachers){
		text.addMessage(gameState, sourceName,'No one in the tribe is able and willing to teach you crafting.' )
		return
	}
	learnRoll = dice.roll(2)
	if (referees.includes(sourceName) && forceRoll){
		learnRoll = forceRoll;
		if (learnRoll < 2 || 12 < learnRoll){
			text.addMessage(gameState, sourceName,'Roll must be 2-12' )
			return
		}
	}
	if ( learnRoll >= 10 ){
		player.canCraft = true
		message = player.name+' learns to craft. ['+learnRoll+']'
	} else {
		message = player.name+' studies crafting technique, but does not understand it yet. ['+learnRoll+']'
	}
	player.activity = 'training'
	player.worked = true;
	pop.history(sourceName, message, gameState);
	gameState.required = true;
	text.addMessage(gameState, "tribe", message );
	return;
}
module.exports.train = train;

function setSecrets(gameState, actorName, willTrain){
	member = pop.memberByName(actorName, gameState);
	if (member && member.canCraft == true){
		if (willTrain){
			delete member.noTeach;
			text.addMessage(gameState, actorName, 'You will try to teach those willing to learn')
		} else {
			member.noTeach = true
			text.addMessage(gameState, actorName,'You will no longer teach others to craft')
		}
	} else {
		text.addMessage(gameState, actorName,'You do not know any crafting secrets')
	}
	gameState.saveRequired = true;
}
module.exports.setSecrets = setSecrets;
