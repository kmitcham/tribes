const util = require("./util.js");


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

function handleReproductionList(actorName, args, listName, gameState, bot){
    actor = util.personByName(actorName, gameState);
    population = gameState.population
    errors = []
    list = []
    for (rawTargetName of args){
        localErrors = "";
        if (rawTargetName == "!pass"){
            console.log("Detected pass "+args.indexOf(rawTargetName)+"  "+(args.length -1));
            if (args.indexOf(rawTargetName) != (args.length -1)){
                errors.push("Values after '!pass' must be removed.\n")
                console.log(" adding an error ")
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
            errors.push(...localErrors)
        } else {
            list.push(targetName)
        }
    }
    // if just !pass, or no args, or something perverse not thought of
    if (list.length == 0 && errors.length == 0 ){
        errors.push("No valid items for the "+listName+" list.\n");
    }
    if (errors.length > 0){
        console.log("consentlist has errors")
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
    let messageArray = message.content.split(" ");
    let args = messageArray.slice(1);
    handleInvite(actorName, args, gameState, bot )
    globalMatingCheck(gameState, bot);

}
module.exports.invite = invite;


function handleInvite(actorName, args, gameState, bot){
    actor = util.personByName(actorName, gameState);
    population = gameState.population
    errors = []
    invites = []
    for (rawTargetName of args){
        localErrors = "";
        if (rawTargetName == "!pass"){
            if (args.indexOf(rawTargetName != (args.length -1))){
                localErrors+= "Values after '!pass' will be ignored.\n"
            }
            break;
        }
        targetName = util.removeSpecialChars(targetName)
        target = util.personByName(targetName, gameState);
        if (target){
            localErrors+= matingObjections(actor, target)
        } else {
            localErrors+= rawTargetName+" is not in the tribe.\n"
        }
        if (localErrors != ""){
            errors.push(localErrors)
        } else {
            invites.push(targetName)
        }
    }
    // if just !pass, or no args, or something perverse not thought of
    if (invites.length == 0 && errors.length == 0 ){
        errors.push("No valid items for the invite list.\n");
    }
    if (errors.length > 0){
        for (error of errors){
            author.message(error)
        }
        // clean up message?
        return -1 * errors.length;
    }
    actor.invites = invites;
    author.message("Setting your invite list to:"+invites)
    globalMatingCheck(gameState, bot);
    return;
}
module.exports.handleInvite = handleInvite;

function consent(msg, gameState, bot){
    author = msg.author
    actorName = util.removeSpecialChars(author.username)
    let messageArray = message.content.split(" ");
    let args = messageArray.slice(1);
    return handleConsent(actorName, args, gameState, bot )
}
module.exports.consent = consent;

    
function handleConsent(actorName, args, gameState, bot){
    actor = util.personByName(actorName, gameState);
    population = gameState.population
    errors = []
    consents = []
    for (rawTargetName of args){
        localErrors = "";
        targetName = util.removeSpecialChars(targetName)
        target = util.personByName(targetName, gameState);
        if (target){
            localErrors+= matingObjections(actor, target)
        } else {
            localErrors+= rawTargetName+" is not in the tribe.\n"
        }
        if (localErrors != ""){
            errors.push(localErrors)
        } else {
            consents.push(targetName)
        }
    }
    // if just !pass, or no args, or something perverse not thought of
    if (consents.length == 0 && errors.length == 0 ){
        errors.push("No valid items for the consent list.\n");
    }
    if (errors.length > 0){
        for (error of errors){
            author.message(error)
        }
        // clean up message?
        return -1 * errors.length;
    }
    actor.consents = consents;
    author.message("Setting your consent list to:"+consents)
    globalMatingCheck(gameState, bot);
    return;
}
module.exports.handleConsent = handleConsent;

function decline(msg, gameState, bot){
    author = msg.author
    actorName = util.removeSpecialChars(author.username)
    let messageArray = message.content.split(" ");
    let args = messageArray.slice(1);
    return handleDecline(author.username, args, gameState, bot )
}
module.exports.decline = decline;
   
function handleDecline(actorName, args, gameState, bot){
    actor = util.personByName(actorName, gameState);
    population = gameState.population
    errors = []
    consents = []
    for (rawTargetName of args){
        localErrors = "";
        targetName = util.removeSpecialChars(targetName)
        target = util.personByName(targetName, gameState);
        if (target){
            localErrors+= matingObjections(actor, target)
        } else {
            localErrors+= rawTargetName+" is not in the tribe.\n"
        }
        if (localErrors != ""){
            errors.push(localErrors)
        } else {
            consents.push(targetName)
        }
    }
    // if just !pass, or no args, or something perverse not thought of
    if (consents.length == 0 && errors.length == 0 ){
        errors.push("No valid items for the decline list.\n");
    }
    if (errors.length > 0){
        for (error of errors){
            author.message(error)
        }
        // clean up message?
        return -1 * errors.length;
    }
    actor.consents = consents;
    author.message("Setting your decline list to:"+consents)
    globalMatingCheck(gameState, bot);
    return;
}
module.exports.handleDecline = handleDecline;

function pass(msg, gameState, bot){
    author = msg.author
    actor = util.personByName(author.username, gameState);
    let messageArray = message.content.split(" ");
    let args = messageArray.slice(1);
    actor.cannotInvite = true;
    util.messageChannel(author.username+" passes on mating this turn.", gameState, bot)
    globalMatingCheck(gameState, bot);
    return;
}
module.exports.pass = pass;

function skip(){}
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
    console.log("global mating not yet implented")
    allDone = true;
    actionableInvites = true;
    while (actionableInvites){
        actionableInvites = false;
        sexList = keys(population)
        for (personName of sexList){
            person = util.personByName(personName)
            index = sexList.indexOf(personName)
            if (person.cannotInvite) {
                //remove person from sexList
                sexList.slice(index, index+1)
                continue
            }
            if (person.inviteTargets.length > 0) {
                targetName = inviteTargets[0]
                if (targetName == "!pass"){
                    person.cannotInvite = true
                    util.messageChannel(personName+" is passing on mating this round.")
                    delete person.inviteTargets
                    sexList.slice(index, index+1)
                    continue
                }
                target = personForName(targetName)
                if (target.consentList.includes(personName)){
                    // spawn should message the people
                    spawn(target, person, gameState, bot)
                    person.cannotInvite = true
                    delete person.inviteTargets
                    sexList.slice(index, index+1)
                    continue
                } else if (target.declineList.includes(personNamne)){
                    util.messagePlayerName(personName, targetName+" declines your invitation.", gameState, bot)
                    util.messagePlayerName(targetName, personName+" flirts with you.", gameState, bot)
                    person.inviteTargets.shift()
                    // can't lose your invite power just because of rejection
                    if (person.inviteTargets.length > 0) {
                        actionableInvites = true
                    }
                    allDone = false
                } else {
                    // this will get spammy, if the function is called every time anyone updates.
                    util.messagePlayerName(targetName, personName+" has invited you to mate.", gameState, bot)
                    util.messagePlayerName(personName, targetName+" considers your invitation.", gameState, bot)
                    sexList.slice(index, index+1)
                    allDone = false
                }
            } else {
                // person has no invites pending
                sexList.slice(index, index+1)
                allDone = false
            }
        }
    }
    // allDone = true should also mean sexList is empty.
    if (allDone){
        for (personName in population){
            if (person.hiddenPregnant){
                util.messageChannel(person.name+ " has been blessed with a child.", gameState, bot)
                person.isPregnant = true 
                delete person.hiddenPregnant
            }
            delete person.inviteList  // this should already be empty or done.
        }
        util.messageChannel("There are no outstanding invitations.  Time for chance.", gameState, bot)
    }
    
}
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