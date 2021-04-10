const util = require("./util.js");
const savelib = require("./save.js");
const genders = ['male','female']
const allNames = require('./names.json');


function eligibleMates(name, population, debug=false){
	matcher = population[name]
	var potentialMatches = []
    var response = ""
	if (!matcher){
		return "could not find "+cleanName+" in the tribe"
	}
	for (var matchName in population){
        if (debug) {console.log("checking "+matchName)}
		potentialMatch = population[matchName]
		if (! potentialMatch){
			console.log('no record for '+matchName)
			continue
		}
		if (potentialMatch.gender == matcher.gender){
            if (debug) {console.log("gender fail ") }           
			continue
		}
		if (potentialMatch.isPregnant){
            if (debug) {console.log("pregnant ") }           
			continue
        }
        if (debug) {console.log("possible match!")}
		potentialMatches.push(matchName)
    }
    if (debug) {console.log('matched ='+potentialMatches)}
	if (potentialMatches.length > 0){
		response = potentialMatches.join(', ')
	} else {
		response = "No eligible partners-"+name+" should pass."
	}
	if (debug) {console.log("response:"+response)}
    return response
}
module.exports.eligibleMates = eligibleMates;

function matingObjections(inviter, target){
    response = "";
    if (inviter.isPregnant){
        response += inviter.name+" is pregnant.\n"
    }
    if (target.isPregnant){
        response += target.name+" is pregnant.\n"
    }
    if (inviter.gender == target.gender){
        response += inviter.name+" is the same gender as "+target.name+".\n"
    }
    return response;
}
module.exports.matingObjections = matingObjections;

function showMatingLists(actorName, gameState, bot){
    response = "";
    actor = util.personByName(actorName, gameState)
    if (actor.inviteList){
        response += "Your inviteList is:"+inviteList+"\n"
    }
    if (actor.consentList){
        response += "Your consentList is:"+consentList+"\n"
    }
    if (actor.declineList){
        response += "Your declineList is:"+declineList+"\n"
    }
    return util.messagePlayerName(actorName, response, gameState, bot);
}
module.exports.showMatingLists = showMatingLists    ;

function handleReproductionList(actorName, args, listName, gameState, bot){
    console.log("Building "+listName+" for "+actorName+" args "+args)
    actor = util.personByName(actorName, gameState);
    if (!args || args.length == 0){
        delete actor[listName]
        util.messagePlayerName(actorName,"Deleting your "+listName, gameState, bot);
        return;
    }
    population = gameState.population
    errors = []
    list = []
    for (rawTargetName of args){
        localErrors = "";        
        if (rawTargetName == "!pass"){
            console.log("Detected pass "+args.indexOf(rawTargetName)+"  "+(args.length -1));
            if (args.indexOf(rawTargetName) != (args.length -1)){
                errors.push("Values after '!pass' must be removed.\n")
            }
            break;
        }
        targetName = util.removeSpecialChars(rawTargetName)
        target = util.personByName(targetName, gameState);
        if (target){
            localErrors+= matingObjections(actor, target)
        } else {
            localErrors+= rawTargetName+" is not in the tribe.\n"
        }
        if (localErrors != ""){
            errors.push(localErrors)
        } else {
            list.push(target.name)
        }
    }
    // if just !pass, or no args, or something perverse not thought of
    if (list.length == 0 && errors.length == 0 ){
        errors.push("No valid items for the "+listName+" list.\n");
    }
    if (errors.length > 0){
        console.log(actorName+" "+listName+" has errors")
        for (error of errors){
            util.messagePlayerName(actorName, error, gameState, bot)
        }
        // clean up message?
        return -1 * errors.length;
    }
    actor[listName] = list;
    util.messagePlayerName(actorName, "Setting your "+listName+" list to:"+list, gameState, bot)
    return 0;
}
module.exports.handleReproductionList = handleReproductionList;


function invite(msg, gameState, bot){
    author = msg.author
    actorName = util.removeSpecialChars(author.username)
    person = util.personByName(actorName)
    if (person.cannotInvite){
        util.messagePlayerName(actorName, "You can not mate this season", gameState,bot)
        return;
    }
    if (person.isPregnant){
        util.messagePlayerName(actorName, "You are already pregnant", gameState,bot)
        return;
    }
    let messageArray = msg.content.split(" ");
    messageArray.shift();
    handleReproductionList(actorName, messageArray, "inviteList",gameState, bot )
    return globalMatingCheck(gameState, bot);
}
module.exports.invite = invite;

function consent(msg, gameState, bot){
    author = msg.author
    actorName = util.removeSpecialChars(author.username)
    let messageArray = msg.content.split(" ");
    messageArray.shift();
    handleReproductionList(actorName, messageArray, "consentList",gameState, bot )
    return globalMatingCheck(gameState, bot)
}
module.exports.consent = consent;

function decline(msg, gameState, bot){
    author = msg.author
    actorName = util.removeSpecialChars(author.username)
    let messageArray = msg.content.split(" ");
    messageArray.shift();
    handleReproductionList(actorName, messageArray, "declineList",gameState, bot )
    return globalMatingCheck(gameState, bot)
}
module.exports.decline = decline;
   

function pass(msg, gameState, bot){
    author = msg.author
    actor = util.personByName(author.username, gameState);
    let messageArray = message.content.split(" ");
    let args = messageArray.splice(0,1);
    actor.cannotInvite = true;
    util.messageChannel(author.username+" passes on mating this turn.", gameState, bot)
    globalMatingCheck(gameState, bot);
    return;
}
module.exports.pass = pass;

function skip(){}

function clearReproduction(gameState, bot){
    population = gameState.population;
	for (var personName in population){
		person = population[personName]
		delete person.cannotInvite;
        delete person.inviteList; 
	}

}
module.exports.clearReproduction = clearReproduction;

/*
// how does the lib know if someone is a referee?
skip <arg>
    if actor is not chief or arg != actor 
		err, exit
	target.cannotInvite = true
    delete target.inviteTargets
    globalMatingCheck


*/
function globalMatingCheck(gameState, bot){
    allDone = true;
    actionableInvites = true;
    if (! gameState.reproductionRound){
        return;
    }
    while (actionableInvites){
        actionableInvites = false;
        var sexList = Object.keys(population)
        doneMating = []
        console.log("a sexlist "+sexList)
        for (personName of sexList){
            console.log("working "+personName)
            person = util.personByName(personName, gameState)
            if (!person){
                console.log(" No person found for "+personName +" sexList "+sexList)
                continue;
            }
            index = sexList.indexOf(personName)
            if (person.cannotInvite ) {
                //remove person from sexList
                doneMating.push(personName)
                console.log("\t cannotInvite.  sexList="+sexList)
                continue
            }
            if (person.inviteList && person.inviteList.length > 0) {
                targetName = person.inviteList[0]
                console.log("\t inviting "+targetName)
                if (targetName == "!pass"){
                    person.cannotInvite = true
                    util.messageChannel(personName+" is passing on mating this round.")
                    delete person.inviteTargets
                    doneMating.push(personName)
                    continue
                }
                target = util.personByName(targetName, gameState)
                if (target.consentList && target.consentList.includes(personName)){
                    // makeLove should message the people
                    makeLove(targetName, personName, gameState, bot)
                    person.cannotInvite = true
                    delete person.inviteTargets
                    doneMating.push(personName)
                    console.log("\t consent "+targetName +" sexList "+sexList)
                    continue
                } else if (target.declineList && target.declineList.includes(personName)){
                    util.messagePlayerName(personName, targetName+" declines your invitation.", gameState, bot)
                    util.messagePlayerName(targetName, personName+" flirts with you.", gameState, bot)
                    person.inviteList.shift()
                    // can't lose your invite power just because of rejection
                    if (person.inviteList.length > 0) {
                        actionableInvites = true
                    }
                    allDone = false
                    console.log("\t decline  "+targetName)
                } else {
                    // this will get spammy, if the function is called every time anyone updates.
                    util.messagePlayerName(targetName, personName+" has invited you to mate.", gameState, bot)
                    util.messagePlayerName(personName, targetName+" considers your invitation.", gameState, bot)
                    doneMating.push(personName)
                    allDone = false
                    console.log("\t no response found  "+targetName)
                }
            } else {
                // person has no invites pending
                sexList.splice(index, 1)
                allDone = false
                console.log("No invites found  ")

            }
            console.log("x sexlist "+sexList)
        }
        tempList = []
        for (personName of sexList){
            if (doneMating.indexOf(personName) >= 0){} else {
                tempList.push(personName)
            }
        }
        sexList = tempList;
        console.log("y sexlist "+sexList)
    }
    console.log("z sexlist "+sexList)
    // allDone = true should also mean sexList is empty.
    if (allDone){
        for (personName in population){
            person = population[personName]
            if (person.hiddenPregnant){
                util.messageChannel(person.name+ " has been blessed with a child.", gameState, bot)
                person.isPregnant = true 
                delete person.hiddenPregnant
            }
            delete person.inviteList  // this should already be empty or done.
        }
        util.messageChannel("There are no outstanding invitations.  Time for chance.", gameState, bot)
    }
    return sexList.length
}
module.exports.globalMatingCheck = globalMatingCheck;

// a weak clone of the existing 'spawnFunction'  only works for secret mating
function makeLove(motherName, fatherName, gameState, bot, force = false){
    population = gameState.population
    mother = util.personByName(motherName, gameState)
    father = util.personByName(fatherName, gameState)
	if (mother.gender != 'female' && father.gender == 'female'){
		temp = motherName;
		motherName = fatherName;
		fatherName = temp
	}
	spawnChance = 9
	if (population[motherName].nursing && population[motherName].nursing.length > 0){
		spawnChance = 10
	}
	mroll = util.roll(1)
	droll = util.roll(1)
	if (force != false || (mroll+droll) >= spawnChance ){
        if (mother.hiddenPregnant){
            console.log(motherName+" is secretly already pregnant")
        } else {
		    var child = addChild(motherName, fatherName, gameState)
            mother.hiddenPregnant = child.name;
            savelib.saveTribe(gameState);
        }
	} 
    util.messagePlayerName(motherName, fatherName +' shares good feelings with you ['+mroll+']', gameState, bot)
    util.messagePlayerName(fatherName, motherName +' shares good feelings with you ['+droll+']', gameState, bot)

	return
}
module.exports.makeLove = makeLove;

function getNextChildName(children, childNames, nextIndex){
	var currentNames = Object.keys(children)
	if (!nextIndex){
		numberOfChildren = currentNames.length
		nextIndex = (numberOfChildren % 26 )
		console.log('getNextChild with default index '+nextIndex)
	}
	possibles = childNames['names'][nextIndex]
	counter = 0
	possibleName = possibles[ (Math.trunc( Math.random ( ) * possibles.length))]
	while (counter < 10 && (currentNames.indexOf(possibleName) != -1 ) ){
		possibleName = possibles[ (Math.trunc( Math.random ( ) * possibles.length))]	
	}
	if (counter == 10){
		console.log('could not get a unique child name. '+currentNames+' tried:'+possibleName)
	}
	if (!possibleName){
		console.log('Failed to get a possible name.  counter:'+counter+' nextIndex='+nextIndex)
		possibleName = 'Bug'
	}
	return possibleName
}
module.exports.getNextChildName = getNextChildName

function addChild(mother, father, gameState){
	var child = Object()
	child.mother = mother
	child.father = father
	child.age = -2
	child.food = 0
	child.gender = genders[ (Math.trunc( Math.random ( ) * genders.length))]
	nextIndex = (gameState.conceptionCounter % 26 )
	child.name = getNextChildName(gameState.children, allNames, nextIndex)
	gameState.children[child.name] = child	
	console.log('added child '+child.name)
	person = util.personByName(mother, gameState)
	gameState.population[child.mother].isPregnant = child.name
	if (gameState.reproductionList){
		const indexOfPreggers = gameState.reproductionList.indexOf(mother);
		if (indexOfPreggers > -1) {
			gameState.reproductionList.splice(indexOfPreggers, 1);
			console.log('attempting to remove pregnant woman from reproduction list')
		}
	}
	gameState.conceptionCounter++
	return child
}
module.exports.addChild = addChild;
/* 
globalMatingCheck(gamestate, bot)
    allDone = true;
    actionableInvites = true;    
    while (actionableInvites){
        actionableInvites = false;
        sexList = keys(population)
        for every person in sexList{
            if (person.cannotInvite) {
                remove person from sexList
                continue
            }
            if person.inviteTargets.length > 0 {
                targetName = inviteTargets[0]
                if (targetName == "!pass"){
                    person.cannotInvite = true
                    message channel person is passing
                    remove person from sexList
                    continue
                }
                target = personForName(targetName)
                if (target.consentList.includes(personName)){
                    spawn(target, person)
                    person.cannotInvite = true
                    delete person.inviteTargets
                    remove person from sexList
                    continue
                } else if (target.declineList.includes(personNamne)){
                    message person (target declines your invitation)
                    message target (person tried to flirt with you)
                    person.inviteTargets.shift()
                    // can't lose your invite power just because of rejection
                    if (person.inviteTargets.length > 0) {
                        actionableInvites = true
                    }
                    allDone = false
                } else {
                    // this will get spammy, if the function is called every time anyone updates.
                    message target (person wants to mate with you)
                    message person (target is considering your invitation)
                    remove person from sexList
                    allDone = false
                }
            } else {
                // person has no invites pending
                remove person from sexList
                allDone = false
            }
        }
    }
    // allDone = true should also mean sexList is empty.
    if (allDone){
        message the channel repro is over, time for chance
        for person in tribe{
            if (person.hiddenPregnant){
                announce pregnancy in channel
                person.isPregnant = true 
                delete person.hiddenPregnant
            }
            delete person.inviteList  // this should already be empty or done.
        }
    }
}
*/
/*
spawn 
    <existing dice roll code>
	if (roll1+roll2 > 9 && ! (mother.hiddenPregnant || mother.isPregnant) ){
        addChild
        if (gameData.secretMating)
            mother.hiddenPregnant = true
        else 
            mother.isPregnant
    }
    if gameData.secretMating
        message the parents about feelings (show each their own roll)
    else 
        message the channel feelings (showing rolls)

children 
    if gameData.secretMating
        don't show the fathers of children
scoreChildren
    if gameData.secretMating
        don't show the fathers of children


ready
    (tracking status of mating needs to change)
*/