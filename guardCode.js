
module.exports.findGuardValueForChild = (childName, population, children) =>{
	var guardValue = Number(0);
	var logMessage = 'guard value for :'+childName
	for (var personName in population){
		var person = population[personName]
		if (person.guarding && person.guarding.includes(childName)){
			var watchValue = 1/person.guarding.length
			logMessage += '\t'+personName+' adds '+watchValue
			guardValue = guardValue + watchValue
		}
    }
    // check for babysitters
    for (var name in children){
        child = children[name];
        if (child.newAdult && child.babysitting == childName){
            guardValue = guardValue + 1;
            logMessage += '\t '+name+' adds '+1
        }
    }
    //console.log( logMessage+'\t\t TOTAL: '+guardValue)	
    return guardValue
}

module.exports.findLeastGuarded = (children, population) =>{
	// guard score = 7 if unguarded; otherwise is the length of the guarders 'guarding' array
	// guard score = 7 if unguarded; otherwise is the length of the guarders 'guarding' array
	var guardChildSort = []
	var leastGuarded = []
	if (Object.keys(children).length == 0){
		return 'No children to sort'
	}
	for (var childName in children){
		var child = children[childName]
		if (child.age < 0 ){
			// unborn children should be skipped; 0 is born
			continue
		}	
		if (child.newAdult){
			continue
		}
		guardValue = module.exports.findGuardValueForChild(childName, population, children)
		guardChildSort.push({'name':childName, 'score':guardValue,  'age':child.age})
	}
	guardChildSort.sort((a,b) => parseFloat(a.score) - parseFloat(b.score))
	if (guardChildSort.length == 0){
		console.log(' ERROR EMPTY LIST OF GUARD CHULDREN')
		return "Bug means all kids are guarded equally"
	}
	lowGuardValue = guardChildSort[0].score;
	for (var i = 0; i < guardChildSort.length; i++){
		if (guardChildSort[i].score == lowGuardValue){
			leastGuarded.push(guardChildSort[i])
		} else {
			// we are out of the tie, so ignore the rest
			break
		}
	}
	if (leastGuarded.length == 1){
		leastGuardedName = leastGuarded[0].name
	} else {
		// sort the least guarded by age
		leastGuarded.sort((a,b)=> parseFloat(a.age)-parseFloat(b.age))
		startAge = leastGuarded[0].age
		maxIndex = 0
		for (var j =1; j < leastGuarded.length; j++){
			if (leastGuarded[j].age > startAge)
			break;
			maxIndex = j
		}
		unluckyIndex = Math.trunc( Math.random ( ) * maxIndex)
		leastGuardedName = leastGuarded[unluckyIndex].name
	}
	return leastGuardedName+' is least watched. Watch score = '+lowGuardValue
}

module.exports.unguardChild = (childName, population) =>{
	for (personName in population){
		person = population[personName]
		if (person.guarding && person.guarding.indexOf(childName) != -1){
			childIndex = person.guarding.indexOf(childName)
			person.guarding.splice(childIndex, 1);
		}
	}
}

module.exports.hyenaAttack= (children, gameState) => {
	population = gameState.population
	if (!children || Object.keys(children).length == 0){
		return 'No children, no hyena problem '
	}
	// get the least guarded message
	leastGuardedMessageArray = findLeastGuarded(children, population).split(" ")
	//  this is stupid and hacky; take the name from the start of the message, and the value from the last bit
	leastGuardedName = leastGuardedMessageArray[0]
	lowGuardValue = Number(leastGuardedMessageArray[10])
	rollValue = roll(1)
	response = 'The hyena attacks '+leastGuardedName+'!\n'
	var child = children[leastGuardedName]
	if (!child){
		console.log('hyena did not find the child somehow '+leastGuardedName)
		return response
	}
	console.log(leastGuardedName+' rollValue '+rollValue+ ' target '+lowGuardValue)
	guardian = child.guardian
	if (rollValue > lowGuardValue){
		if (guardian){
			response += '\nFortunately, '+guardian+' chases off the beast'
		}
	} else {
		response += '\n The poor child is devoured'
		if (guardian){
			response += '\n'+guardian+' watches in horror.'
		}
		kill(leastGuardedName, 'hyena attack', gameState)
	}
	return response
}