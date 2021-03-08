


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


/* 
invite <arg>
    if target is wrong gender OR visibly pregnant
        err, exit
    if in public channel:
        announce in public channel
        person.publicInvite = <arg>
    else 
        message target about invite
        person.privateInvite = <arg>

consent <arg>
    if in public channel
        if inviter.publicInvite != actor
            err, exit
        announce in public channel
    else 
        if inviter.secretInvite != actor
            err, exit
        message inviter about consent
    spawn child (handles the roll)
    mark inviter 'cannotInvite'
    if (tribe has everyone cannotInvite)
        end mating
        announce pregnancies

 decline <arg>
    if <arg> not in tribe
        err, exit
    inviter = personByName(arg)
    if in public channel
        if inviter.publicInvite != actor
            err, exit
        announce pass in public channel 
        delete inviter.publicInvite
    else 
        if inviter.secretInvite != actor
            err, exit
        delete secretInvite.publicInvite

pass
    // NOTE: a) pass is ALWAYS public.  b) You CAN secret invite, get a consent, then publicly skip.
    mark actor 'cannotInvite'
    announce pass in public channel
    if (tribe has everyone cannotInvite)
        end mating
        announce pregnancies

skip <arg>
    if actor is not chief
		err, exit
	target.cannotInvite = true
	if (tribe has everyone cannotInvite)
        end mating
        announce pregnancies

spawn 
    <existing dice roll code>
	<pregnancy can only result if the mother is not already pregnant>
    if gameData.secretMating
        message the parents about feelings (show rolls?)
    else 
        message the channel feelings (not showing rolls)

children 
    if gameData.secretMating
        don't show the fathers of children
*/