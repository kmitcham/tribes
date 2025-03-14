const genders = ['male','female']
const allNames = require('./names.json');
const text = require("./textprocess")
const dice = require("./dice")
const pop = require("./population")
const feed = require("./feed")

function eligibleMates(name, population, debug=false){
	matcher = population[name]
    cleanName = name;
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
		response = potentialMatches.join(' ')
	} else {
		response = "No eligible partners-"+name+" should pass."
	}
	if (debug) {console.log("response:"+response)}
    return response
}
module.exports.eligibleMates = eligibleMates;

function matingObjections(inviter, target){
    response = "";
    if (target.isPregnant){
        // maybe check the age of the child; -2 is bad, but -1 is on the market
        //response += target.name+" is pregnant.\n"
    }
    if (inviter.gender == target.gender){
        response += inviter.name+" is the same gender as "+target.name+".\n"
    }
    return response;
}
module.exports.matingObjections = matingObjections;

function showMatingLists(actorName, gameState){
    response = "";
    actor = pop.memberByName(actorName, gameState)
    if (!actor){
        return actorName+" not found"
    }
    if ('inviteList' in actor && actor.inviteList && actor.inviteList.length > 0){
        response += "Your inviteList is:"+actor.inviteList+"\n"
    } else {
        actor.inviteList = []
        response += "Your inviteList is empty\n"
    }
    if ('consentList' in actor && actor.consentList && actor.consentList.length > 0){
        response += "Your consentList is:"+actor.consentList+"\n"
    }else {
        actor.consentList = []
        response += "Your consentList is empty\n"
    }
    if ('declineList' in actor && actor.declineList && actor.declineList.length > 0){
        response += "Your declineList is:"+actor.declineList+"\n"
    }else {
        actor.declineList = []
        response += "Your declineList is empty\n"
    }
    return response
}
module.exports.showMatingLists = showMatingLists  ;

function canStillInvite(gameState){
    population = gameState.population
    var canInvite = []
    for (personName in population){
        person = population[personName]
        if (person.cannotInvite ){
            // do nothing
        } else {
            canInvite.push(personName)
        }
    }
    return canInvite.join(' ');
}
module.exports.canStillInvite = canStillInvite ;

function checkCompleteLists(gameState){
    // unresolvable = []
    // malelist = getPlayersByKeyValue("gender","male")
    // femaleList = getPlayersByKeyValue("gender","female")
    // for every player
        // if cannotInvite
        // else if !inviteList || inviteList doesn't end with !pass
        //  unreslvable.append[playername]
        // if consent+decline != genderList
        //   unresolvable.append[playename]
}


function handleReproductionList(actorName, args, listName, gameState){
    console.log("Building "+listName+" for "+actorName+" args "+args)
    actor = pop.memberByName(actorName, gameState);
    if (!args || args.length == 0){
        delete actor[listName]
        return "Deleting your empty "+listName
    }
    population = gameState.population
    errors = []
    list = []
    save = false;
    for (rawTargetName of args){
        console.log("arg: "+rawTargetName)
        localErrors = "";   
        rawTargetName = text.removeSpecialChars(rawTargetName)     
        if (rawTargetName.toLowerCase() == "!pass"){
            if (listName == 'inviteList'){
                if (args.indexOf(rawTargetName) != (args.length -1)){
                    errors.push("Values after '!pass' must be removed.\n")
                }
                list.push(rawTargetName);
                break;
            } else {
                errors.push("!pass is only valid in the inviteList.")
            }
        } else if (rawTargetName.toLowerCase() == '!none'){
            list = [];
            save = true
            break;
        } else if (rawTargetName.toLowerCase() == '!save'){
            if (listName == 'inviteList'){
                list.push(rawTargetName)
                save = true
            } else {
                errors.push("!save is only valid in the inviteList.")
            }
        } else if (rawTargetName.toLowerCase() == '!all'){
            if (listName != 'inviteList'){
                list.push(rawTargetName)
            } else {
                errors.push("!all is only valid in the consentList and declineList.")
            }
        } else {
            targetName = text.removeSpecialChars(rawTargetName)
            target = pop.memberByName(targetName, gameState);
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
    }
    returnMessage = ""
    if (errors.length > 0){
        console.log(actorName+" "+listName+" has errors:"+errors)
        for (error of errors){
            returnMessage += error+"\n"
        }
        // clean up message?
        returnMessage += ("Please try again to set the "+listName +"\n")
    } else {
        actor[listName] = list;
        returnMessage += ("Setting your "+listName+" list to:"+list+"\n")
        if (save){
            returnMessage += ("Saving your "+listName+" list be used in future rounds\n")
            if (gameState.reproductionRound){
                returnMessage += "Changing your list during the reproduction means changes will not be saved, sorry.\n"
            }
        }
    }
    return returnMessage;
}
module.exports.handleReproductionList = handleReproductionList;


function invite(author, invitelist, gameState){
    console.log('author '+author)
    actorName = text.removeSpecialChars(author)
    console.log('actorName:'+actorName)
    person = pop.memberByName(actorName, gameState)
    if (!person){
        return "Can not find you in the tribe, sorry"
    }
    if (person.cannotInvite){
        message = 
             "Your invitations for this season are used up.  You will be able to edit your invites for next season after the work round starts."
        return message;
    }
    if (person.isPregnant && gameState.children[person.isPregnant] && gameState.children[person.isPregnant].age == -2){
        return "You are already pregnant, and will not invite this round.";
    }
    if (! invitelist){
        console.log("No list found; return existing list")
        message = "invitelist: "+person.inviteList;
        return message
    }
    console.log('got messageArray:'+invitelist)
    message = handleReproductionList(actorName, invitelist, "inviteList",gameState )
    globalMatingCheck(gameState);
    console.log("message at end of reprolib invite:"+message)
    if (person.inviteList){
        console.log("Invitelist: "+person.inviteList.join(" "))
    } else {

    }
    
    return message
}
module.exports.invite = invite;

function intersect(a, b) {
    var t;
    if (!a || !b){
        return []
    }
    if (b.length > a.length) t = b, b = a, a = t; // indexOf to loop over shorter
    return a.filter(function (e) {
        return b.indexOf(e) > -1;
    });
}

function consent(actorName, messageArray,  gameState){
    handleReproductionList(actorName, messageArray, "consentList",gameState )
    person = pop.memberByName(actorName, gameState);
    intersectList = intersect(person.consentList, person.declineList)
    if (intersectList && intersectList.length > 0){
        text.addMessage(gameState, actorName, "Your consent and decline lists have overlaps.  Consent is checked first.")
    }
    text.addMessage(gameState, actorName, "Updated consentlist to "+person.consentList);
    return globalMatingCheck(gameState)
}
module.exports.consent = consent;

function decline(actorName, messageArray,  gameState){
    person = pop.memberByName(actorName, gameState);
    if (messageArray.includes("!none")){
        person.declineList = [];
        text.addMessage(gameState, actorName, "Emptying your declineList");
    } else if (messageArray.includes("!all")){
        var matchGender = "male";
        if (person.gender == "male"){
            matchGender = "female";
        }
        declineArray = pop.getAllNamesByGender(gameState.population, matchGender);
        person.declineList = declineArray.join(" ");
        console.log("declineList set to "+person.declineList);
        text.addMessage(gameState, actorName, "Setting your declineList to "+person.declineList);
    } else {
        handleReproductionList(actorName, messageArray, "declineList",gameState )
        intersectList = intersect(person.consentList, person.declineList)
        if (intersectList && intersectList.length > 0){
            text.addMessage(gameState, actorName, "Your consent and decline lists have overlaps.  Consent is checked first.")
        }    
    }
    return globalMatingCheck(gameState)
}
module.exports.decline = decline;

function pass(msg, gameState){
    author = msg.author
    actor = pop.memberByName(author.username, gameState);
    actor.cannotInvite = true;
    delete actor.inviteList;
    text.addMessage(gameState, "tribe", author.username+" passes on mating this turn.")
    globalMatingCheck(gameState);
    return;
}
module.exports.pass = pass;

function clearReproduction(gameState){
    population = gameState.population;
	for (var personName in population){
		person = population[personName]
		delete person.cannotInvite;
	}

}
module.exports.clearReproduction = clearReproduction;

function sortCommitFirst(a,b){
    if (a.commit && ! b.commit){
        return 1;
    }
    if (b.commit && ! a.commit){
        return -1
    }
    return Math.random()-.5
}


function globalMatingCheck(gameState){
    allDone = true;
    actionableInvites = true;
    if (! gameState.reproductionRound){
        return;
    }
    if (gameState.doneMating){
        return;
    }
    while (actionableInvites){
        actionableInvites = false;
        var sexList = Object.keys(population)
        sexList.sort(function(){return Math.random()-.5});
        doneMating = []
        whoNeedsToGiveAnAnswer = []
        console.log("a sexlist "+sexList)
        counter = 0
        for (personName of sexList){
            console.log("working "+personName)
            person = pop.memberByName(personName, gameState)
            if (!person){
                console.log(" No person found for "+personName +" sexList "+sexList)
                continue;
            }
            index = sexList.indexOf(personName)
            if (person.cannotInvite  ) {
                doneMating.push(personName)
                console.log("\t cannotInvite.  ")
                continue
            } else if ( person.golem){
                person.cannotInvite = true;
                console.log("Skipping golem "+personName)
            } else if (person.isPregnant){
                console.log("\t inviter was pregnant")
                text.addMessage(gameState,person.name, "Your pregnancy prevents you from mating.")
                text.addMessage(gameState, "tribe", personName+" is too pregnant for mating this round.")
                person.cannotInvite = true;
                continue;
            } else if (person.isInjured && person.isInjured > 0){
                console.log("\t inviter is injured")
                text.addMessage(gameState,person.name, "Your injury prevents you from mating.")
                text.addMessage(gameState, "tribe", personName+" is too injured for mating this round.")
                person.cannotInvite = true;
                continue
            } else if (person.isSick && person.isSick > 0){
                console.log("\t inviter is sick")
                text.addMessage(gameState,person.name, "Your illness prevents you from mating.")
                text.addMessage(gameState, "tribe", personName+" is too sick for mating this round.")
                person.cannotInvite = true;
                continue
                
            } else if (person.inviteList && person.inviteList.length > 0) {
             // the person is eligible to mate, and has an invitelist
                targetName = person.inviteList[0]
                console.log(" inviting "+targetName)
                if (targetName == "!pass"){
                    person.cannotInvite = true
                    text.addMessage(gameState, "tribe", personName+" is passing on mating this round.")
                    doneMating.push(personName)
                    continue
                }
                if (targetName == "!save"){
                    console.log("Skipping the !save since it isn't really an invite")
                    continue
                }
                var attemptFailed = false
                target = pop.memberByName(targetName, gameState)
                if (target.declineList && (target.declineList.includes(personName) || target.declineList.includes("!all")) ){
                    text.addMessage(gameState, personName, targetName+" declines your invitation.")
                    text.addMessage(gameState, targetName, personName+" flirts with you, but you decline.")
                    console.log("\t declines  ")
                    person.inviteList.shift()
                    attemptFailed = true;
                } else if (target.isPregnant){
                    text.addMessage(gameState, personName, targetName+" is visibly pregnant.")
                    text.addMessage(gameState, targetName, personName+" flirts with you, but you are pregnant.")
                    console.log("\t is pregnant  ")
                    person.inviteList.shift()
                    attemptFailed = true;
                } else if (target.isSick || target.isInjured){
                    text.addMessage(gameState, targetName, personName+" flirts with you, but you are not healthy enough to respond.")
                    text.addMessage(gameState, personName, targetName+" is not healthy enough to enjoy your attention.")
                    console.log("\t sick or injured")
                    person.inviteList.shift()
                    attemptFailed = true;
                } else if (target.consentList && (target.consentList.includes(personName) || target.consentList.includes("!all"))){
                    text.addMessage(gameState, personName, targetName+" is impressed by your flirtation.")
                    text.addMessage(gameState, targetName, personName+" flirts with you, and you are interested.")
                    // makeLove should message the people
                    makeLove(targetName, personName, gameState)
                    person.cannotInvite = true
                    doneMating.push(personName)
                    console.log("\t consents ")
                    continue
                } else {
                    // this will get spammy, if the function is called every time anyone updates.
                    text.addMessage(gameState, targetName, personName+" has invited you to mate- update your romance lists to include them (consent or decline) ")
                    text.addMessage(gameState, personName, targetName+" considers your invitation.")
                    whoNeedsToGiveAnAnswer.push(targetName)
                    doneMating.push(personName)
                    allDone = false
                    console.log("\t no response found  "+targetName+" so allDone is false")
                }
                if (attemptFailed){
                    // can't lose your invite power just because of rejection
                    if (person.inviteList.length > 0) {
                        actionableInvites = true
                        console.log("\t more invitations exist")
                    } else {
                        allDone = false
                        console.log("allDone is false, since no invites to try, and no resolution.")
                    }
                }
            } else {
                // person has no invites pending
                allDone = false
                console.log("\t No invites found for "+personName+" so allDone is false")
            }
        }
    }
    if (whoNeedsToGiveAnAnswer && whoNeedsToGiveAnAnswer.length > 0){
        for (personName of whoNeedsToGiveAnAnswer){
            text.addMessage(gameState, personName, "You have not responded to an invitation")
        }
    }
    if (allDone){
        text.addMessage(gameState, "tribe", "---> Reproductive activites are complete for the season <---")
        noPregnancies = true
        for (personName in population){
            person = population[personName]
            text.addMessage(gameState, personName, "Reproduction round activities are over.")
            if (person.hiddenPregnant){
                fatherName = person.hiddenPregnant
                var child = addChild(person.name, fatherName, gameState)
                delete person.hiddenPregnant
                noPregnancies = false
                text.addMessage(gameState, "tribe",person.name+ " has been blessed with a child: "+person.isPregnant)
                text.addMessage(gameState, personName, "You have been blessed with the child "+person.isPregnant)
            }
            delete person.inviteList
        }
        if (noPregnancies){
            text.addMessage(gameState, "tribe", "No one has become pregnant this season.")
        }
        text.addMessage(gameState, "tribe", "Time for chance.")
        gameState.doneMating = true;
        gameState.saveRequired = true;
    }
    return doneMating.length
}
module.exports.globalMatingCheck = globalMatingCheck;

// a weak clone of the existing 'spawnFunction'  only works for secret mating
function makeLove(name1, name2, gameState, force = false){
    population = gameState.population
    var parent1 = pop.memberByName(name1, gameState)
    var parent2 = pop.memberByName(name2, gameState)
	if (parent1.gender == 'female') {
        mother = parent1
        father = parent2
    } else {
        mother = parent2
        father = parent1
    }
    motherName = mother.name
    fatherName = father.name
    console.log("mother:"+motherName+" father:"+fatherName)
    spawnChance = 9
	if (mother.nursing && mother.nursing.length > 0){
		spawnChance = 10
	}
	mroll = dice.roll(1)
	droll = dice.roll(1)
    console.log('secret mating rolls ['+mroll+']['+droll+']')
	if (force != false || (mroll+droll) >= spawnChance ){
        if (mother.hiddenPregnant){
            console.log(motherName+" is secretly already pregnant by "+mother.hiddenPregnant)
        } else {
            mother.hiddenPregnant = fatherName;
        }
	} 
    motherMessage = fatherName +' shares good feelings with you ['+mroll+']'
    fatherMessage = motherName +' shares good feelings with you ['+droll+']'
    pop.history(motherName, motherMessage, gameState)
    pop.history(fatherName, fatherMessage, gameState)
    text.addMessage(gameState, motherName, motherMessage)
    text.addMessage(gameState, fatherName, fatherMessage)
    detection(mother, father, (mroll+droll), gameState)
	return
}
module.exports.makeLove = makeLove;

function detection(mother,father, reproRoll, gameState){
    observerName = dice.randomMemberName(gameState.population)
    observer = pop.memberByName(observerName, gameState)
    var netRoll;
    baseRoll = dice.roll(2)
    netRoll = baseRoll+reproRoll;
    if (observer.profession == mother.profession || observer.profession == father.profession){
        netRoll = netRoll + 1
    }
    console.log("Detection: obv:"+observerName+" base:"+baseRoll+" net:"+netRoll)
    if (netRoll >= 17){
        console.log("should send a message to "+observerName)
        if (observerName == mother.name || observerName == father.name){
            console.log("self observation is discarded")
            return false;
        }
        text.addMessage(gameState, observerName, "You observe "+mother.name+" and "+father.name+" sharing good feelings.")
        return true
    }
    return false
}

function getNextChildName(children, childNames, nextIndex, gameState){
	var currentNames = Object.keys(children)
	if (! nextIndex===null){
		nextIndex = (gameState.conceptionCounter % 26 )
		console.log('getNextChild with default index '+nextIndex)
	}
	var possibles = childNames['names'][nextIndex]
    if (! possibles || possibles.lenght < 1){
        console.log("Unpossible name  possibles:"+possibles)
        return "Unpossible"
    }
	var counter = 0
	possibleName = possibles[ (Math.trunc( Math.random ( ) * possibles.length))]
	while (counter < 10 && (currentNames.indexOf(possibleName) != -1 ) ){
		possibleName = possibles[ (Math.trunc( Math.random ( ) * possibles.length))]	
        counter= counter+1 
	}
	if (counter == 10){
		console.log('could not get a unique child name. '+currentNames.join() +' last tried:'+possibleName)
        possibleName = "Overfull"+nextIndex
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
	person = pop.memberByName(mother, gameState)
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

function rememberInviteLists(gameState){
    population = gameState.population
    for (personName in population){
        person = population[personName]
        if (person.inviteList && person.inviteList.length > 0 && person.inviteList.indexOf('!save') > -1) {
            console.log('saving inviteList for '+personName)
            person.saveInviteList = [...person.inviteList]
            const index = person.inviteList.indexOf("!save");
            if (index > -1) {
                person.inviteList.splice(index, 1);
            }
        }
    }
}
module.exports.rememberInviteLists = rememberInviteLists;

function restoreSaveLists(gameState){
    population = gameState.population
    for (personName in population){
        person = population[personName]
        if (person.saveInviteList && person.saveInviteList.length > 0 ) {
            console.log('restoring inviteList for '+personName)
            person.inviteList = person.saveInviteList
            delete person.saveInviteList;
            text.addMessage(gameState, personName, 'restoring your invitelist to what it was at the start of the reproduction round')
        }
    }
}
module.exports.restoreSaveLists = restoreSaveLists;

function validateDrone(gameState, actorName, args){
    population = gameState.population
    // is actorname Chief
    player = population[actorName]
    if (!player ||  !player.chief){
        text.addMessage(gameState, actorName,"You need to be chief of the tribe to add a drone.")
        return
    }
    // is tribe too big?
    if (Object.keys(population).length > 7){
        text.addMessage(gameState, actorName,"The tribe is too full to add another drone.")
        return
    }
    if (!args[3] ){
        text.addMessage(gameState, actorName,"Syntax: <gender> <profession> <name> ")
        return
    }
    gender = args[1]
    profession = args[2]
    droneName = args[3]
    message = "";
    fail = false;
    // is args valid gender
    if (!( gender && 
        (  gender==="male"   || gender==="m" 
        || gender==="female" || gender==="f"  )) ){
            message += gender+" is not a valid gender in the game.\n"
            fail = true;
    }
    // is args valid profession
    profession = profession.toLowerCase();
    if ( !(profession &&
            ("g"===(profession) || "gatherer"===(profession)
            || "h"===(profession) || "hunter"===(profession)
            || "c"===(profession) || "crafter"===(profession) )
        )){
            message+= profession+" is not a valid profession\n";
            fail = true;
    }
    if (profession.toLowerCase() === "h"){
        profession = 'hunter'
    }
    if (profession.toLowerCase() === "c"){
        profession = 'crafter'
    }
    if (profession.toLowerCase() === "g"){
        profession = 'gatherer'
    }
    // is args name unique
    if ( !droneName || droneName in population){
        fail = true;
        message+= "Drones need a name that is not already in the tribe.\n";
    } 
    // is args name annoying?  (bad chars, command)
    cleanName = util.cleanUpMessage(droneName);
    if (!cleanName===(droneName) || 
        ( droneName===("chief") || droneName===("vote")) ){
        fail = true;
        message+= "Drones need a name that is not a command or hard to parse.\n";
    }
    if (fail){
        text.addMessage(gameState,actorName, message)
        return false;
    }
    return true
}
module.exports.validateDrone = validateDrone;

function addDrone(gameState, gender, profession, droneName){
    // 
    droneData =  {
        "gender": gender,
        "golem": true,
        "food": 10,
        "grain": 4,
        "basket": 0,
        "spearhead": 0,
        "profession": profession,
        "obeyList": [
          "hunt",
          "gather",
          "give",
          "guard",
          "ignore",
          "feed",
          "babysit"
        ],
        "name": droneName,
        "history": [],
        "worked": false,
        "guarding": [
        ],
      }
      text.addMessage(gameState, "tribe","Adding "+droneName+" to the tribe as a drone." )
      gameState.population[droneName] = droneData;
}
module.exports.addDrone = addDrone;

function startReproduction(gameState){
	// actually consume food here
	gameState.needChanceRoll = true  // this magic boolean prevents starting work until we did chance roll
	gameState.workRound = false
	gameState.foodRound = false
	gameState.reproductionRound = true
	delete gameState.enoughFood 
	foodMessage = feed.consumeFood(gameState)
    foodMessage += '\n==> Starting the Reproduction round; invite other tribe members to reproduce.<==\n'
    foodMessage += 'After chance, the tribe can decide to move to a new location, but the injured and children under 2 will need 2 food'
    text.addMessage(gameState, "tribe",foodMessage)

    rememberInviteLists(gameState);
    gameState.doneMating = false;
    globalMatingCheck(gameState)
    if (canStillInvite(gameState)){	
        text.addMessage(gameState, "tribe",'(awaiting invitations or !pass from '+canStillInvite(gameState)+')' )	
    }
	pop.decrementSickness(gameState.population, gameState);
    gameState.saveRequired = true;
    gameState.archiveRequired = true;
    return
}
module.exports.startReproduction = startReproduction;

function checkMating(gameState, displayName){
            if (!gameState.reproductionRound ){
                text.addMessage(gameState, displayName, "checkMating is only relevant in the reproduction round.")
            }
            globalMatingCheck(gameState)
            return
}
module.exports.checkMating = checkMating;
