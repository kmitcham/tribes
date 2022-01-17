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

function showMatingLists(actorName, gameState, bot){
    response = "";
    actor = util.personByName(actorName, gameState)
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
    util.messagePlayerName(actorName, response, gameState, bot);
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

function checkCompleteLists(gameState, bot){
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


function handleReproductionList(actorName, args, listName, gameState, bot){
    console.log("Building "+listName+" for "+actorName+" args "+args)
    actor = util.personByName(actorName, gameState);
    if (!args || args.length == 0){
        delete actor[listName]
        util.messagePlayerName(actorName,"Deleting your empty "+listName, gameState, bot);
        return;
    }
    population = gameState.population
    errors = []
    list = []
    save = false;
    for (rawTargetName of args){
        localErrors = "";   
        rawTargetName = util.removeSpecialChars(rawTargetName)     
        if (rawTargetName.toLowerCase() == "!pass"){
            console.log("Detected pass at position "+args.indexOf(rawTargetName)+" of "+(args.length -1));
            if (listName == 'inviteList'){
                if (args.indexOf(rawTargetName) != (args.length -1)){
                    errors.push("Values after '!pass' must be removed.\n")
                }
                list.push(rawTargetName)
                break;
            } else {
                errors.push("!pass is only valid in the inviteList.")
            }
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
    }
    if (errors.length > 0){
        console.log(actorName+" "+listName+" has errors:"+errors)
        for (error of errors){
            util.messagePlayerName(actorName, error, gameState, bot)
        }
        // clean up message?
        util.messagePlayerName(actorName,"Please try again to set the "+listName, gameState, bot)
        return -1 * errors.length;
    }
    actor[listName] = list;
    util.messagePlayerName(actorName, "Setting your "+listName+" list to:"+list, gameState, bot)
    if (save){
        actor.saveInviteList = [...actor.inviteList]
        util.messagePlayerName(actorName, "Saving your "+listName+" list be used in future rounds", gameState, bot)
    }
    return 0;
}
module.exports.handleReproductionList = handleReproductionList;


function invite(msg, gameState, bot){
    author = msg.author
    console.log('author '+author)
    actorName = util.removeSpecialChars(author.username)
    console.log('actorName:'+actorName)
    person = util.personByName(actorName, gameState)
    if (!person){
        msg.author.send("Can not find you in the tribe, sorry")
        return
    }
    if (person.cannotInvite){
        util.messagePlayerName(actorName
            , "Your invitations for this season are used up.  You will be able to edit your invites for next season after the work round starts."
            , gameState,bot)
        return;
    }
    if (person.isPregnant && gameState.children[person.isPregnant] && gameState.children[person.isPregnant].age == -2){
        util.messagePlayerName(actorName, "You are already pregnant, and will not invite this round.", gameState,bot)
    }
    let messageArray = msg.content.split(" ");
    messageArray.shift();
    handleReproductionList(actorName, messageArray, "inviteList",gameState, bot )
    return globalMatingCheck(gameState, bot);
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

function consent(msg, gameState, bot){
    author = msg.author
    actorName = util.removeSpecialChars(author.username)
    let messageArray = msg.content.split(" ");
    messageArray.shift();
    handleReproductionList(actorName, messageArray, "consentList",gameState, bot )
    person = util.personByName(actorName, gameState);
    intersectList = intersect(person.consentList, person.declineList)
    if (intersectList && intersectList.length > 0){
        util.messagePlayerName(actorName, "Your consent and decline lists have overlaps.  Consent is checked first.")
    }
    return globalMatingCheck(gameState, bot)
}
module.exports.consent = consent;

function decline(msg, gameState, bot){
    author = msg.author
    actorName = util.removeSpecialChars(author.username)
    let messageArray = msg.content.split(" ");
    messageArray.shift();
    handleReproductionList(actorName, messageArray, "declineList",gameState, bot )
    person = util.personByName(actorName, gameState);
    intersectList = intersect(person.consentList, person.declineList)
    if (intersectList && intersectList.length > 0){
        util.messagePlayerName(actorName, "Your consent and decline lists have overlaps.  Consent is checked first.")
    }
    return globalMatingCheck(gameState, bot)
}
module.exports.decline = decline;
   

function pass(msg, gameState, bot){
    author = msg.author
    actor = util.personByName(author.username, gameState);
    actor.cannotInvite = true;
    delete actor.inviteList;
    util.messageChannel(author.username+" passes on mating this turn.", gameState, bot)
    globalMatingCheck(gameState, bot);
    return;
}
module.exports.pass = pass;

function clearReproduction(gameState, bot){
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


function globalMatingCheck(gameState, bot){
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
            person = util.personByName(personName, gameState)
            if (!person){
                console.log(" No person found for "+personName +" sexList "+nextList)
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
                util.messagePlayerName(person.name, "Your pregnancy prevents you from mating.", gameState, bot)
                util.messageChannel(personName+" is too pregnant for mating this round.",gameState, bot)
                person.cannotInvite = true;
                continue;
            } else if (person.isInjured && person.isInjured > 0){
                console.log("\t inviter is injured")
                util.messagePlayerName(person.name, "Your injury prevents you from mating.", gameState, bot)
                util.messageChannel(personName+" is too injured for mating this round.",gameState, bot)
                person.cannotInvite = true;
                continue
            } else if (person.isSick && person.isSick > 0){
                console.log("\t inviter is sick")
                util.messagePlayerName(person.name, "Your illness prevents you from mating.", gameState, bot)
                util.messageChannel(personName+" is too sick for mating this round.",gameState, bot)
                person.cannotInvite = true;
                continue
                
            } else if (person.inviteList && person.inviteList.length > 0) {
                targetName = person.inviteList[0]
                console.log(" inviting "+targetName)
                if (targetName == "!pass"){
                    person.cannotInvite = true
                    util.messageChannel(personName+" is passing on mating this round.",gameState, bot)
                    doneMating.push(personName)
                    continue
                }
                if (targetName == "!save"){
                    console.log("Skipping the !save since it isn't really an invite")
                    continue
                }
                var attemptFailed = false
                target = util.personByName(targetName, gameState)
                if (target.declineList && (target.declineList.includes(personName) || target.declineList.includes("!all")) ){
                    util.messagePlayerName(personName, targetName+" declines your invitation.", gameState, bot)
                    util.messagePlayerName(targetName, personName+" flirts with you, but you decline.", gameState, bot)
                    console.log("\t declines  ")
                    person.inviteList.shift()
                    attemptFailed = true;
                } else if (target.isPregnant){
                    util.messagePlayerName(personName, targetName+" is visibly pregnant.", gameState, bot)
                    util.messagePlayerName(targetName, personName+" flirts with you, but you are pregnant.", gameState, bot)    
                    console.log("\t is pregnant  ")
                    person.inviteList.shift()
                    attemptFailed = true;
                } else if (target.isSick || target.isInjured){
                    util.messagePlayerName(targetName, personName+" flirts with you, but you are not healthy enough to respond.", gameState, bot)
                    util.messagePlayerName(personName, targetName+" is not healthy enough to enjoy your attention.", gameState, bot)
                    console.log("\t sick or injured")
                    person.inviteList.shift()
                    attemptFailed = true;
                } else if (target.consentList && (target.consentList.includes(personName) || target.consentList.includes("!all"))){
                    util.messagePlayerName(personName, targetName+" is impressed by your flirtation.", gameState, bot)
                    util.messagePlayerName(targetName, personName+" flirts with you, and you are interested.", gameState, bot)
                    // makeLove should message the people
                    makeLove(targetName, personName, gameState, bot)
                    person.cannotInvite = true
                    doneMating.push(personName)
                    console.log("\t consents ")
                    continue
                } else {
                    // this will get spammy, if the function is called every time anyone updates.
                    util.messagePlayerName(targetName, personName+" has invited you to mate- !consent "+personName+" or !decline "+personName, gameState, bot)
                    util.messagePlayerName(personName, targetName+" considers your invitation.", gameState, bot)
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
                console.log("\t No invites found so allDone is false")
            }
        }
    }
    if (whoNeedsToGiveAnAnswer && whoNeedsToGiveAnAnswer.length > 0){
        for (personName in whoNeedsToGiveAnAnswer){
            util.messagePlayerName("You have not responded to an invitation");
        }
    }
    if (allDone){
        util.messageChannel("---> Reproductive activites are complete for the season <---", gameState, bot)
        noPregnancies = true
        for (personName in population){
            person = population[personName]
            util.messagePlayerName(personName, "Reproduction round activities are over.", gameState,bot)
            if (person.hiddenPregnant){
                fatherName = person.hiddenPregnant
                var child = addChild(person.name, fatherName, gameState)
                savelib.saveTribe(gameState);
                delete person.hiddenPregnant
                noPregnancies = false
                util.messageChannel(person.name+ " has been blessed with a child: "+person.isPregnant, gameState, bot)
                util.messagePlayerName(personName, "You have been blessed with the child "+person.isPregnant, gameState, bot)
            }
            delete person.inviteList
        }
        if (noPregnancies){
            util.messageChannel("No one has become pregnant this season.", gameState, bot)
        }
        util.messageChannel("Time for chance.", gameState, bot)
        gameState.doneMating = true;
    }
    return doneMating.length
}
module.exports.globalMatingCheck = globalMatingCheck;

// a weak clone of the existing 'spawnFunction'  only works for secret mating
function makeLove(name1, name2, gameState, bot, force = false){
    population = gameState.population
    var mother = util.personByName(name1, gameState)
    var father = util.personByName(name2, gameState)
	if (mother.gender != 'female' && father.gender == 'female'){
		var temp = mother;
		mother = father;
		father = temp
    }
    motherName = mother.name
    fatherName = father.name
    spawnChance = 9
	if (population[motherName].nursing && population[motherName].nursing.length > 0){
		spawnChance = 10
	}
	mroll = util.roll(1)
	droll = util.roll(1)
    console.log('secret mating rolls ['+mroll+']['+droll+']')
	if (force != false || (mroll+droll) >= spawnChance ){
        if (mother.hiddenPregnant){
            console.log(motherName+" is secretly already pregnant by "+mother.hiddenPregnant)
        } else {
            mother.hiddenPregnant = fatherName;
            savelib.saveTribe(gameState);
        }
	} 
    motherMessage = fatherName +' shares good feelings with you ['+mroll+']'
    fatherMessage = motherName +' shares good feelings with you ['+droll+']'
    util.messagePlayerName(motherName, motherMessage, gameState, bot)
    util.history(motherName, motherMessage, gameState)
    util.messagePlayerName(fatherName, fatherMessage, gameState, bot)
    util.history(fatherName, fatherMessage, gameState)
    detection(mother, father, (mroll+droll), gameState, bot)
	return
}
module.exports.makeLove = makeLove;

function detection(mother,father, reproRoll, gameState, bot){
    observerName = util.randomMemberName(gameState.population)
    observer = util.personByName(observerName, gameState)
    var netRoll;
    baseRoll = util.roll(2)
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
        util.messagePlayerName(observerName,"You observe "+mother.name+" and "+father.name+" sharing good feelings.", gameState, bot)
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

function rememberInviteLists(gameState, bot){
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

function restoreSaveLists(gameState, bot){
    population = gameState.population
    for (personName in population){
        person = population[personName]
        if (person.saveInviteList && person.saveInviteList.length > 0 ) {
            console.log('restoring inviteList for '+personName)
            person.inviteList = person.saveInviteList
            delete person.saveInviteList;
            util.messagePlayerName(personName,'restoring your invitelist to what it was at the start of the reproduction round', gameState, bot)
        }
    }
}
module.exports.restoreSaveLists = restoreSaveLists;

function validateDrone(gameState, actorName, args, bot){
    population = gameState.population
    // is actorname Chief
    player = population[actorName]
    if (!player ||  !player.chief){
        util.messagePlayerName(actorName,"You need to be chief of the tribe to add a drone.", gameState, bot)
        return
    }
    // is tribe too big?
    if (Object.keys(population).length > 7){
        util.messagePlayerName(actorName,"The tribe is too full to add another drone.", gameState, bot)
        return
    }
    if (!args[3] ){
        util.messagePlayerName(actorName,"Syntax: <gender> <profession> <name> ", gameState, bot)
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
        util.messagePlayerName(actorName, message, gameState, bot)
        return false;
    }
    return true
}
module.exports.validateDrone = validateDrone;

function addDrone(gameState, bot, gender, profession, droneName){
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
      util.messageChannel("Adding "+droneName+" to the tribe as a drone.", gameState, bot)
      gameState.population[droneName] = droneData;
}
module.exports.addDrone = addDrone;