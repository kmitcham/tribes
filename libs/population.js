const text = require("./textprocess.js")


function memberByName(name, gameState){
    if (name == null){
        console.log('attempt to find member for null name ')
        return null
    }
    if (gameState == null){
        console.log("tried to get member when gameState was null.  probably a syntax error");
        return null;
    }
    cleaned = text.removeSpecialChars(name)
    if (name != cleaned ){
        console.log(name + " cleaned into "+cleaned)
        name = cleaned
    }
    if (!gameState || gameState.population == null){
        console.log('no people yet, or gameState is otherwise null')
        return null
    }
    var person = null
    var population = gameState.population;
    if (population[name] != null){
         person = population[name]
    } else if (population[name.toLowerCase()] != null){
        person = population[name.toLowerCase()]
    } else {
        console.log("Exhaustive search in population for "+name)
        for (match in population){
            if ( (population[match] && population[match].handle) ){
                if ( population[match].handle.username == name 
                    || population[match].handle.displayName == name
                    || (name.username && population[match].handle.username == name.username )
                    || population[match].handle.id == name){
                    person = population[match]
                    break;
                }
                if (population[match].handle.id == name){
                    person = population[match]
                    break;
                }
            }
            if (population[match].name.toLowerCase() === name.toLowerCase()){
                person = population[match]
                break;
            }
        }
    }
    if (person != null){
        // WTF is this?
        for (var type in person) {
            if (Object.prototype.hasOwnProperty.call( person, type)) {
                if (person[type] && person[type].constructor === Array && person[type].length == 0){
                    //console.log('deleting empty array for '+type)
                    delete person[type]
                }
            }
        }
        return person
    }
    console.log("tribe "+gameState.name+" has no such member in population. tried "+name+" and "+name.toUpperCase())
    return null
}
module.exports.memberByName = memberByName

function decrementSickness(population, gameState, bot){
	for (personName in population){
		person = population[personName]
		if (person.isSick && person.isSick > 0 ){
			person.isSick = person.isSick -1;
			console.log(person.name+" decrement sickness  "+person.isSick)
		}
		if (person.isInjured && person.isInjured > 0 ){
			person.isInjured = person.isInjured -1;
			console.log(person.name+" decrement injury  "+person.isSick)
		}
		if (person.isSick < 1){
			delete person.isSick
            text.addMessage(gameState, person.name,  "You have recovered from your illness.")
			console.log(person.name+" recover sickness  ")
		}
		if (person.isInjured < 1){
            text.addMessage(gameState, person.name, "You have recovered from your injury.")
			delete person.isInjured
			console.log(person.name+" recover injury  ")
		}
	}
}
module.exports.decrementSickness = decrementSickness;