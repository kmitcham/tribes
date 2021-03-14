


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

function validMate(inviter, target, gameState){

}

function invite(args, gameState, bot){

}
/* 
invite <target1> [ optional additional targets]
    actor.inviteTargets = [target1, target2]
    validateMatingTargets(source, [targets])
    globalMatingCheck()
*/
/*
consent <target1> [ optional additional targets]
    validateMatingTargets(source, [targets])
    actor.consentList = [target1, target2...]
    globalMatingCheck()
*/
/*
 decline <target1> [additional targets]
    if any <target1> not in tribe
        err, exit
    actor.declineList = [target1, target2...]
    globalMatingCheck()       
*/
/*
pass
    // NOTE: a) pass is ALWAYS public.  b) You CAN secret invite, get a consent, then publicly skip.
    mark actor 'cannotInvite'
    delete actor.inviteList
    announce pass in public channel
    if (tribe has everyone cannotInvite)
        end mating
        announce pregnancies

skip <arg>
    if actor is not chief or arg != actor 
		err, exit
	target.cannotInvite = true
    delete target.inviteTargets
    globalMatingCheck


*/
/* 
globalMatingCheck()
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
                announce pregnancy
                person.isPregnant = true 
                delete person.hiddenPregnant
            }
            delete person.inviteList  // this should already be empty or done.
            // I think I lean towards KEEPING
        }
    }
}
*/
/*
spawn 
    <existing dice roll code>
	if (roll1+roll2 > 9 && ! (mother.hiddenPregnant || mother.isPregnant) ){
        addChild
        mother.hiddenPregnant = true
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