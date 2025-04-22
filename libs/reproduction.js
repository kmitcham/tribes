const genders = ['male','female']
const allNames = require('./names.json');
const text = require("./textprocess")
const dice = require("./dice")
const pop = require("./population")
const feed = require("./feed")
const end = require("./endgame")

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
        if (potentialMatch.isSick && potentialMatch.isSick > 0){
            if (debug) {console.log("sick ") }
        }
        if (potentialMatch.isInjured && potentialMatch.isInjured > 0){
            if (debug) {console.log("injured ") }
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

function handleReproductionList(actorName, arrayOfNames, listName, gameState){
    console.log("Building "+listName+" for "+actorName+" args "+arrayOfNames)
    var actingMember = pop.memberByName(actorName, gameState);
    if (!arrayOfNames || arrayOfNames.length == 0){
        delete actingMember[listName]
        // this may be dead code with the new discord API.
        console.log("DELETE in handle list actually called.  SURPRISE!");
        return "Deleting your empty "+listName
    }
    population = gameState.population
    errors = []
    list = []
    save = false;
    for (rawTargetName of arrayOfNames){
        console.log("arg: "+rawTargetName)
        localErrors = "";   
        targetName = text.removeSpecialChars(rawTargetName);
        targetName = targetName.trim();
        if (targetName.toLowerCase() == "!pass"){
            if (listName == 'inviteList'){
                if (arrayOfNames.indexOf(rawTargetName) != (arrayOfNames.length -1)){
                    errors.push("Values after '!pass' must be removed.\n")
                }
                list.push(rawTargetName);
                break;
            } else {
                errors.push("!pass is only valid in the inviteList.")
            }
        } else if (targetName.toLowerCase() == '!none'){
            list = [];
            save = true
            break;
        } else if (targetName.toLowerCase() == '!all'){
            if (listName == 'inviteList'){
                errors.push("!all is only valid in the consentList and declineList.");
            } else {
                list.push(targetName);
            }
        } else {
            var targetMember = pop.memberByName(targetName, gameState);
            if (targetMember){
                localErrors+= matingObjections(actingMember, targetMember)
            } else {
                localErrors+= rawTargetName+" is not in the tribe.\n"
            }
            if (localErrors != ""){
                errors.push(localErrors)
            } else {
                list.push(targetMember.name.trim());
                console.log("\t\t adding "+targetMember.name+" to consent for "+actingMember.name)
            }
        }
    }
    returnMessage = ""
    if (errors.length > 0){
        console.log(actorName+" "+listName+" has errors:"+errors)
        for (error of errors){
            returnMessage += error+"\n"
        }
        returnMessage += ("Please try again to set your "+listName +"\n")
    } else {
        actingMember[listName] = list;
        returnMessage += ("Setting your "+listName+" list to:"+list+"\n")
        if (save){
            if (gameState.reproductionRound){
                returnMessage += "Changing your list during the reproduction may cause secret informatio to leak.\n"
            } else {
                returnMessage += ("Saving your "+listName+" list be used in future rounds\n")
            }
        }
    }
    return returnMessage;
}
module.exports.handleReproductionList = handleReproductionList;


function invite(gameState, rawActorName, rawList ){
    console.log('invite raw actorName: '+rawActorName)
    var player = pop.memberByName(rawActorName, gameState);
    var message = 'error in invite, message not set';
    if (!player){
        text.addMessage(gameState, rawActorName, "You must be a member of the tribe to invite someone to mate." );
        return;
    }    
    if (! rawList ) {
        if (player.inviteList){
            text.addMessage(gameState, player.name, "Current invitelist: "+player.inviteList.join(" ") );
            return ;
        } else {
            text.addMessage(gameState, player.name, "No current inviteList" );
            return ;
        }
    }
    let inviteNamesAsArray = rawList.split(" ");
    if (rawList.includes(",")){
        inviteNamesAsArray = rawList.split(",");
    }
    // TODO: make sure to split out items starting with !    
    console.log(player.name+" raw invitelist:"+rawList+ " as array:"+inviteNamesAsArray);

    message = handleReproductionList(player.name, inviteNamesAsArray, "inviteList", gameState )
    globalMatingCheck(gameState);
    console.log("message at end of reprolib invite:"+message)
    if (player.inviteList){
        console.log("after update Invitelist: "+player.inviteList.join(" "))
    } else {

    }
    text.addMessage(gameState, player.name, message );
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

function consentPrep(gameState, sourceName, rawList){
    var member = pop.memberByName(sourceName, gameState);

    if (! rawList ) {
        console.log("no rawList for consent");
        if (member.hasOwnProperty('consentList') && member.consentList.length > 0){
            text.addMessage(gameState, sourceName, "Current consentList: "+member.consentList.join(" ") )
            return "Current consentList: "+member.consentList.join(" ") ;
        } else {
            text.addMessage(gameState, sourceName,  "No current consentList.");
            return "No current consentList.";
        }   
    }
    let messageArray = rawList.split(" ");
    if (rawList.includes(',')){
        messageArray = rawList.split(",")
        console.log("splitting consent on commas")
    }
    for (var i = 0; i < messageArray.length; i++) { 
        messageArray[i] = messageArray[i].trim();
    }
    if (messageArray.length < 1){
        text.addMessage(gameState, sourceName, "No values parsed from that consentList: "+rawList );
        return  "No values parsed from that consentList: "+rawList;
    }
    if (messageArray.includes("!all") && "declineList" in member && member.declineList){
        text.addMessage(gameState, member.name, "Your declinelist is not empty; !all will not override that.");
    }
    console.log("updating consentlist: "+messageArray);
    consent(sourceName, messageArray,  gameState);
    return member.consentList;
}
module.exports.consentPrep = consentPrep;

function consent(actorName, arrayOfNames,  gameState){
    var member = pop.memberByName(actorName, gameState);
    if (!member){
        console.log(actorName+" not found in tribe for consent");
        text.addMessage(gameState, actorName, "You are not in the tribe");
        return;
    }
    var intersectList = intersect(member.consentList, member.declineList);
    if (intersectList && intersectList.length > 0){
        text.addMessage(gameState, actorName, "Your consent and decline lists have overlaps.  Decline has priority.");
    }
    handleMessage = handleReproductionList(actorName, arrayOfNames, "consentList", gameState );
    text.addMessage(gameState, member.name, handleMessage);
    if ("consentList" in member ){
        if (member.consentList.length > 0) {
            text.addMessage(gameState, actorName, "Updated consentlist to "+member.consentList);
        } else {
            text.addMessage(gameState, actorName, "You will not consent to mating with anyone.");
            delete member["consentList"];
        }
    } else {
        text.addMessage(gameState, actorName, "You will not consent to mating with anyone.");
    }
    gameState.saveRequired = true; 
    return globalMatingCheck(gameState);
}
module.exports.consent = consent;

function declinePrep(interaction, gameState){
    var sourceName = interaction.member.displayName;
    var rawList = interaction.options.getString('declinelist');

    var player = pop.memberByName(sourceName, gameState);
    if (! rawList ) {
        if (player.declineList && player.declineList.length > 0){
            text.addMessage(gameState, sourceName, "Current declinelist: "+player.declinelist.join(" "));
            return "Current declinelist: "+player.declinelist.join(" ");
        } else {
            text.addMessage(gameState, sourceName, "No current declinelist");
            return  "No current declinelist";
        }
        
    }
    let listAsArray = rawList.split(" ");
    if (rawList.includes(",")){
        listAsArray = rawList.split(",");
    }
    console.log("applying decline list to mating for "+sourceName);
    response = decline(sourceName, listAsArray,  gameState);
    console.log("decline response:"+response);
    return 
}
module.exports.declinePrep = declinePrep;

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
        person.declineList = declineArray;
        console.log("declineList set to "+person.declineList.join(', '));
        text.addMessage(gameState, actorName, "Setting your declineList to "+person.declineList);
    } else {
        handleReproductionList(actorName, messageArray, "declineList", gameState )
        intersectList = intersect(person.consentList, person.declineList)
        if (intersectList && intersectList.length > 0 
            || ( person.consentList  && person.declineList && person.declineList.includes("!all"))
            || ( person.declineList && person.consentList && person.consentList.includes("!all")) ){
            text.addMessage(gameState, actorName, "Your consent and decline lists have overlaps.  Decline has priority.")
        }
        text.addMessage(gameState, actorName, "Decline updated.");   
        gameState.saveRequired = true; 
    }
    return globalMatingCheck(gameState)
}
module.exports.decline = decline;

function clearReproduction(gameState){
    population = gameState.population;
	for (var personName in population){
		person = population[personName]
		delete person.cannotInvite;
        person.inviteIndex=0;
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
    console.log("In the global mating check");
    if (! gameState.reproductionRound){
        return "It is not the mating round";
    }
    var inviteCheck = canStillInvite(gameState);
    if (inviteCheck.length < 1 ){
        return "Mating is complete";
    }
    var allDone = true;
    var actionableInvites = true;
    var population = gameState.population;
    while (actionableInvites){
        actionableInvites = false;
        var listMemberNamesForSex = Object.keys(population)
        listMemberNamesForSex.sort(function(){return Math.random()-.5});
        doneMating = []
        whoNeedsToGiveAnAnswer = []
        console.log("a sexlist "+listMemberNamesForSex)
        counter = 0
        for (personName of listMemberNamesForSex){
            const invitingMember = pop.memberByName(personName, gameState);
            const inviterDisplayName = invitingMember.name;
            console.log("working "+personName +" "+invitingMember.name)
            index = listMemberNamesForSex.indexOf(personName)
            if (hasReasontoNotInvite(gameState, invitingMember)){
                continue;
            } else if (invitingMember.inviteList && invitingMember.inviteList.length > 0) {
             // the person is eligible to mate, and has an invitelist
                index = 0;
                if ("inviteIndex" in invitingMember){
                    index = invitingMember.inviteIndex;
                }
                targetName = invitingMember.inviteList[index];
                console.log(" inviting "+targetName)
                if (! targetName ){
                    console.log("member "+invitingMember.name+" had a false value for target "+index+" in inviteList:"+targetName);
                    text.addMessage(gameState, "tribe", inviterDisplayName+" has a troublesome problem flirting, and will not mate this round.");
                    doneMating.push(personName);
                    continue
                }
                if (targetName.trim() == "!pass"){
                    invitingMember.cannotInvite = true
                    //text.addMessage(gameState, "tribe", inviterDisplayName+" is done mating this round.");
                    doneMating.push(personName);
                    continue
                }
                var attemptFailed = false
                const targetMember = pop.memberByName(targetName, gameState)
                if (!targetMember){
                    console.log("Could not find "+targetName+" in tribe for "+invitingMember.name+" to invite them.");
                    continue;
                }
                const targetDisplayName = targetMember.name;
                if (("declineList" in targetMember) && (targetMember.declineList.includes(personName) 
                                        || targetMember.declineList.includes("!all")
                                        || targetMember.declineList.includes(invitingMember.name)) ){
                    text.addMessage(gameState, inviterDisplayName, targetDisplayName+" declines your invitation.")
                    text.addMessage(gameState, targetDisplayName, inviterDisplayName+" flirts with you, but you decline.")
                    console.log("\t declines  ")
                    attemptFailed = true;
                } else if (targetMember.isPregnant){
                    text.addMessage(gameState, personName, targetName+" is visibly pregnant.")
                    text.addMessage(gameState, targetName, personName+" flirts with you, but you are pregnant.")
                    console.log("\t is pregnant  ")
                    attemptFailed = true;
                } else if (targetMember.isSick || targetMember.isInjured){
                    text.addMessage(gameState, targetName, personName+" flirts with you, but you are not healthy enough to respond.")
                    text.addMessage(gameState, personName, targetName+" is not healthy enough to enjoy your attention.")
                    console.log("\t sick or injured")
                    attemptFailed = true;
                } else if (targetMember.consentList && (targetMember.consentList.includes(personName) 
                                                    || targetMember.consentList.includes("!all")
                                                    || targetMember.consentList.includes(invitingMember.name))){
                    text.addMessage(gameState, inviterDisplayName, targetName+" is impressed by your flirtation.")
                    text.addMessage(gameState, targetName, inviterDisplayName+" flirts with you, and you are interested.")
                    makeLove(targetName, personName, gameState)
                    invitingMember.cannotInvite = true
                    doneMating.push(personName)
                    console.log("\t consents ")
                    continue
                } else {
                    // this will get spammy, if the function is called every time anyone updates.
                    text.addMessage(gameState, targetDisplayName, inviterDisplayName+" has invited you to mate- update your romance lists to include them (consent or decline) ")
                    text.addMessage(gameState, inviterDisplayName, targetDisplayName+" considers your invitation.")
                    whoNeedsToGiveAnAnswer.push(targetDisplayName)
                    doneMating.push(personName)
                    console.log("\t no response found with "+targetDisplayName+" so allDone is false")
                }
                if (attemptFailed){
                    invitingMember.inviteIndex = invitingMember.inviteIndex||0 + 1;
                    // can't lose your invite power just because of rejection
                    if (invitingMember.inviteList.length > invitingMember.inviteIndex) {
                        actionableInvites = true
                        console.log("\t more invitations exist")
                    } else {
                        console.log("allDone is false, since no invites to try, and no resolution.")
                    }
                }
            } else {
                // person has no invites pending
                console.log("\t No invites found for "+personName+" so allDone is false")
            }
        }
    }
    if (whoNeedsToGiveAnAnswer && whoNeedsToGiveAnAnswer.length > 0){
        for (personName of whoNeedsToGiveAnAnswer){
            text.addMessage(gameState, personName, "You have not responded to an invitation")
        }
    }
    inviteCheck = canStillInvite(gameState);
    console.log("After mating checks, inviteCheck is: "+inviteCheck);
    if (inviteCheck){	
        text.addMessage(gameState, "tribe",'(awaiting invitations or /pass from '+inviteCheck+')' );
        allDone = false;
    } else {
        allDone = true;
    }
    if (allDone){
        text.addMessage(gameState, "tribe", "---> Reproductive activites are complete for the season <---")
        noPregnancies = true
        for (personName in population){
            invitingMember = pop.memberByName(personName, gameState);
            text.addMessage(gameState, invitingMember.name, "Reproduction round activities are over.")
            if (invitingMember.hiddenPregnant){
                fatherName = invitingMember.hiddenPregnant
                var child = addChild(invitingMember.name, fatherName, gameState)
                delete invitingMember.hiddenPregnant
                noPregnancies = false
                text.addMessage(gameState, "tribe",invitingMember.name+ " has been blessed with a child: "+invitingMember.isPregnant)
                text.addMessage(gameState, personName, "You have been blessed with the child "+invitingMember.isPregnant)
            }
        }
        if (noPregnancies){
            text.addMessage(gameState, "tribe", "No one has become pregnant this season.")
        }
        text.addMessage(gameState, "tribe", "Time for chance.")
        gameState.doneMating = true;
        gameState.saveRequired = true;
    } else {
        if (gameState.reproductionRound == true){
            text.addMessage(gameState, "tribe", "Reproduction round activities are not complete.");
        }
    }
    return "this many people are done mating: "+doneMating.length
}
module.exports.globalMatingCheck = globalMatingCheck;

function hasReasontoNotInvite(gameState, invitingMember){
    if (!invitingMember){
        console.log("\t NULL person may not invite anyone");
        return true;
    } else if (invitingMember.cannotInvite  ) {
        doneMating.push(personName)
        console.log("\t cannotInvite. "+invitingMember.name)
        return true;
    } else if (invitingMember.golem){
        invitingMember.cannotInvite = true;
        console.log("\t Skipping golem "+invitingMember.name)
        return true;
    } else if (invitingMember.isPregnant){
        console.log("\t inviter was pregnant")
        text.addMessage(gameState, invitingMember.name, "Your pregnancy prevents you from mating.")
        text.addMessage(gameState, "tribe", invitingMember.name+" is too pregnant for mating this round.")
        invitingMember.cannotInvite = true;
        return true;;
    } else if (invitingMember.isInjured && invitingMember.isInjured > 0){
        console.log("\t inviter is injured")
        text.addMessage(gameState, invitingMember.name, "Your injury prevents you from mating.")
        text.addMessage(gameState, "tribe", invitingMember.name+" is too injured for mating this round.")
        invitingMember.cannotInvite = true;
        return true;
    } else if (invitingMember.isSick && invitingMember.isSick > 0){
        console.log("\t inviter is sick")
        text.addMessage(gameState, invitingMember.name, "Your illness prevents you from mating.")
        text.addMessage(gameState, "tribe", invitingMember.name+" is too sick for mating this round.")
        invitingMember.cannotInvite = true;
        return true;
    }
    return false;
}

function makeLove(targetName, inviterName, gameState, force = false){
    const population = gameState.population;
    var parent1 = pop.memberByName(targetName, gameState);
    var parent2 = pop.memberByName(inviterName, gameState);
    var mother = parent2
    var father = parent1
	if (parent1.gender == 'female') {
        mother = parent1
        father = parent2
    }
    const motherName = mother.name
    const fatherName = father.name
    console.log("mother:"+motherName+" father:"+fatherName)
    spawnChance = 9
	if (mother.nursing && mother.nursing.length > 0){
		spawnChance = 10
	}
	const roll1 = dice.roll(1)
	const roll2 = dice.roll(1)
    console.log('secret mating rolls ['+roll1+']['+roll2+']')
	if (force != false || (roll1+roll2) >= spawnChance ){
        if (mother.hiddenPregnant){
            console.log(motherName+" is secretly already pregnant by "+mother.hiddenPregnant)
        } else {
            mother.hiddenPregnant = fatherName;
        }
	} 
    motherMessage = 'You share good feelings with '+fatherName+' ['+roll1+']'
    fatherMessage = 'You share good feelings with '+motherName+' ['+roll2+']'
    inviterMessage = 'You share good feelings with '+targetName;
    targetMessage = inviterName +' invite you to share good feelings';
    pop.history(inviterName, inviterMessage, gameState)
    pop.history(targetName, targetMessage, gameState)
    text.addMessage(gameState, motherName, motherMessage)
    text.addMessage(gameState, fatherName, fatherMessage)
    detection(mother, father, (roll1+roll2), gameState)
	return
}
module.exports.makeLove = makeLove;

function detection(mother,father, reproRoll, gameState){
    const OBSERVER_THRESHOLD = 17;
    observerName = dice.randomMemberName(gameState.population)
    observer = pop.memberByName(observerName, gameState)
    if (observer.name == mother.name || observer.name == father.name){
        console.log("self observation is discarded")
        return false;
    }
    var netRoll;
    baseRoll = dice.roll(2)
    netRoll = baseRoll+reproRoll;
    // if the observer has more in common with either parent, harder to avoid observation
    if (observer.profession == mother.profession || observer.profession == father.profession){
        netRoll = netRoll + 1
    }
    console.log("Detection: obv:"+observerName+" base:"+baseRoll+" net:"+netRoll)
    if (netRoll >= OBSERVER_THRESHOLD){
        console.log("should send a message to "+observerName)
        
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
	child.name = getNextChildName(gameState.children, allNames, nextIndex);
	gameState.children[child.name] = child;
	console.log('added child '+child.name);
	motherAsMember = pop.memberByName(mother, gameState)
    motherAsMember.isPregnant = child.name
	if (gameState.reproductionList){
		const indexOfPreggers = gameState.reproductionList.indexOf(mother);
		if (indexOfPreggers > -1) {
			gameState.reproductionList.splice(indexOfPreggers, 1);
			console.log('attempting to remove pregnant woman from reproduction list');
		}
	}
	gameState.conceptionCounter++;
	return child
}
module.exports.addChild = addChild;

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
    cleanName = droneName;
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

function pass(gameState, actorName){
    person = pop.memberByName(actorName, gameState);
    if (! person){
        text.addMessage(gameState, actorName, "You are not in this tribe.");
        return;
    }
    if (gameState.reproductionRound){
        person.cannotInvite = true;
        result = globalMatingCheck(gameState);
        text.addMessage(gameState, "tribe", result)
        return;
    } else {
        text.addMessage(gameState, person.name, "You can only pass during reproduction round.");
        return;
    }
}
module.exports.pass = pass;

function startReproduction(gameState){
	// actually consume food here
	gameState.needChanceRoll = true  // this magic boolean prevents starting work until we did chance roll
	gameState.workRound = false
	gameState.foodRound = false
	gameState.reproductionRound = true
	delete gameState.enoughFood;
	foodMessage = feed.consumeFood(gameState);
    if (Object.keys(gameState.population).length == 0){
		text.addMessage(gameState, "tribe", "All the players are dead-- game should end.");
        end.endGame(gameState);
        return;
	} 
    foodMessage += '\n==> Starting the Reproduction round; invite other tribe members to reproduce.<==\n';
    foodMessage += 'After chance, the tribe can decide to move to a new location, but the injured and children under 2 will need 2 food';
    text.addMessage(gameState, "tribe",foodMessage);

    gameState.doneMating = false;
    globalMatingCheck(gameState);
	pop.decrementSickness(gameState.population, gameState);
    gameState.saveRequired = true;
    gameState.archiveRequired = true;
    
    return
}
module.exports.startReproduction = startReproduction;

function checkMating(gameState, displayName){
            if (gameState.reproductionRound == false ){
                text.addMessage(gameState, displayName, "checkMating is only relevant in the reproduction round.")
            }
            text.addMessage(gameState, displayName, "Checking on the mating status, in case it can be resolved.");
            var message = globalMatingCheck(gameState);
            if (message){
                text.addMessage(gameState, displayName, message);
            }
            return
}
module.exports.checkMating = checkMating;
