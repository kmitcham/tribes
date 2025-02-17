const locations = require('./locations.json');
const legalLocations = Object.keys(locations)
const populationLib = require("./population.js")
const killlib = require("./kill.js");
const text = require("./textprocess.js")

// return 0 on success, error messages otherwise
function migrate(sourceName, destination, force, gameState){
	children = gameState.children
	population = gameState.population
	member = populationLib.memberByName(sourceName, gameState)
	if (!member){
		text.addMessage(gameState,sourceName,'Are you even in a tribe?' )
        return "Not a member"
	}
	if ( !member.chief && force){
		text.addMessage(gameState,sourceName,'Actually migrating requires chief priviliges' )
        return "not a chief"
    }
	if (!destination){
		text.addMessage(gameState,sourceName,'Migrate requires a destination (and force to make it happen)' )
        return "no destination"
    }
    if ((gameState.demand || gameState.violence)){
		text.addMessage(gameState,sourceName,'The game can not advance until the demand is dealt with.' )
        return "blocked by demand"
    }
    if (!gameState.reproductionRound){
		text.addMessage(gameState,sourceName,"Migration happens in the reproduction, after chance" )
        return "not reproduction round"
    } 
	if (gameState.needChanceRoll){
		text.addMessage(gameState,sourceName,"Migration happens in the reproduction, after chance" )
        return "waiting for chance"
    }
	if (!legalLocations.includes(destination) ){
		text.addMessage(gameState,sourceName,destination+' not a valid location.  Valid locations:'+legalLocations )
		return "bad destination"
	}
	if (gameState.currentLocationName == destination){
		text.addMessage(gameState,sourceName,destination+' is where the tribe already is.')
		return "already there"
	}
	// every injured person pays 2 food, or dies.
	deceasedPeople = []
	// every child under 2 years (4 seasons) needs 2 food, or dies
	deceasedChildren = []
	// actually do the move if force is set
	response = "Finding a route to "+destination
	if (force){
		// this code is mostly duplicated, but feed eating is complex to repeat the iteration
		for (personName in population){
			var person = populationLib.memberByName(personName, gameState)
			if (person.isInjured && person.isInjured > 0){
				need = 2
				eaten = 0
				while (eaten < need){
					if (person.food > 0 ){
						person.food--
						eaten++
					} else if (person.grain > 0){
						person.grain--
						eaten++
					} else {
						deceasedPeople.push(personName)
						break;
					}
				}
			}
		}
		for (childName in children){
			var child = children[childName]
			// every child under 2 years needs 2 food, or dies
			// child age is in seasons
			if (child.age < 4 ){
				if (child.food < 2){
					deceasedChildren.push(childName)
				} else {
					child.food -= 2
				}
			}
		}
		if (deceasedPeople.length > 0 || deceasedChildren.length > 0){
			response += '\nThe following people died along the way:'
			// clean up the dead
			var perishedCount = deceasedPeople.length;
			for (var i = 0; i < perishedCount; i++) {
				killlib.kill(deceasedPeople[i],'migration hunger',gameState)
				response+= " "+deceasedPeople[i]
			}
			perishedCount = deceasedChildren.length;
			for (var i = 0; i < perishedCount; i++) {
				killlib.kill(deceasedChildren[i],'migration hunger',gameState)
				response+= " "+deceasedChildren[i]
			}
		}
		text.addMessage(gameState, "tribe", response)
		text.addMessage(gameState,"tribe",'Setting the current location to '+destination )
		gameState.currentLocationName = destination
		return 0
	} else {
		for (personName in population){
			person = populationLib.memberByName(personName, gameState)
			if (person.isInjured && person.isInjured > 0){
				need = 2
				eaten = 0
				if ((person.food + person.grain) < 2 ){
					deceasedPeople.push(personName)
				}
			}
		}
		for (childName in children){
			var child = children[childName]
			// child age is in seasons
			if (child.age < 4){
				if (child.food < 2){
					deceasedChildren.push(childName)
				} 
			}
		}
		response += '\nThe following tribe members would die on the journey to '+destination+': '+deceasedPeople
		response += '\nThe following children would die along the way: '+deceasedChildren
		text.addMessage(gameState,sourceName,response)
	}
	return 1
}
module.exports.migrate = migrate;
