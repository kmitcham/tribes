const guardlib = require("./guardCode.js");
const textLib = require("./textprocess.js")
const populationLib = require("./population.js")


function kill(name, message, gameState){
	console.log("Killing "+name+" due to "+message+" at seasonCount "+gameState.seasonCounter);
	population = gameState.population
	children = gameState.children
	childName = textLib.capitalizeFirstLetter(name)
	if (! message || message == ''){
		message = 'unknown causes'
	}
	if ("graveyard" in gameState){} else { gameState.graveyard = {} }
	person = populationLib.memberByName(name, gameState)
	if (person){
		person.deathMessage = message
		person.deathSeason = gameState.seasonCounter
		if (person.isPregnant ){
			kill(person.isPregnant, 'mother-died', gameState)
		}
		if (person.nursing){
			person.nursing.forEach(childName=>kill(childName, 'no-milk'))
		}
		gameState.graveyard[person.name] = person
		delete population[person.name]
	} else if (childName in children){
		guardlib.unguardChild(childName, population)
		clearNursingPregnant(childName, gameState.population)
		var child = children[childName]
		child.deathMessage = message
		child.deathSeason = gameState.seasonCounter
		gameState.graveyard[childName] = child
		delete children[childName]
	} else {
		console.log('Tried to kill '+name+' but could not find them');
		return;
	}
	textLib.addMessage(gameState, "tribe", name+" killed by "+message);
	return 
}
module.exports.kill = kill

function clearNursingPregnant(childName, population){
	for (personName in population){
		person = population[personName]
		if (person.nursing && person.nursing.indexOf(childName) > -1 ){
			childIndex = person.nursing.indexOf(childName)
			person.nursing.splice(childIndex, 1);
			console.log(personName+' is no longer nursing '+childName)
			if ((person.nursing).length == 0){
				delete person.nursing
			}
		}
		if (person.isPregnant && person.isPregnant == childName){
			person.isPregnant = ''
			console.log(personName+' is no longer pregnant with '+childName)
		}
	}
}