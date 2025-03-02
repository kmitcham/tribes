const text = require("./textprocess.js")
const dice = require("./dice")
const prof = require("./profession")

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

function decrementSickness(population, gameState){
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

function history (playerName, message, gameState){
    player = memberByName(playerName, gameState)
    if (player && !player.history){
        player.history = []
    }
    if (!player){
        console.log('trying to record history with no player record:'+playerName)
        return;
    }
    player.history.push(gameState.seasonCounter/2+": "+message)
}
module.exports.history = history

// handle is the discord player object which we like to store for messaging with them later
// possibly could just grab the id or something and find them in the channel for messaging
function addToPopulation(gameState, sourceName, gender, profession, handle){
    console.log("joining tribe with sourceName:"+sourceName)
    target = text.removeSpecialChars(sourceName)

    if (gameState.population[target]){
        text.addMessage(gameState, sourceName, target+ ' is already in the tribe' )
        return 
    }
    genders = ['male','female']
    if (gender.startsWith('m') ){gender = 'male'}
    if (gender.startsWith('f')){gender = 'female'}
    var person = {};
    person.gender = gender;
    person.food = 10;
    person.grain = 4;
    person.basket = 0;
    person.spearhead = 0;
    person.handle = handle;
    person.name = sourceName;
    if (profession){
        prof.specialize(sourceName, profession, gameState)
        person.profession = profession;
    }
    response = target+' '+gender+' joined the tribe.';
    var strRoll = dice.roll(1);
    person.strength = 'average';
    if (strRoll == 1){
        person.strength = 'weak';
        response+= "  "+target +' is weak.';
    } else if (strRoll == 6){
        person.strength = 'strong';
        response+= "  "+target +' is strong.';
    }
    gameState.population[target] = person;
    console.log( 'added '+target+' '+gender+' to the tribe. strRoll:'+strRoll);
    text.addMessage(gameState, "tribe", response )
    if (!person.strength){
        text.addMessage(gameState, sourceName ,"You are of average strength" )
    }
    history(person.name, response, gameState)
    gameState.saveRequired = true;
    return 
}
module.exports.addToPopulation = addToPopulation;

function vote(gameState,  actorName, candidateName){
    var player = memberByName(actorName, gameState)
	var candidate = memberByName(candidateName, gameState)

    var population = gameState.population;

	if (!candidate){
		text.addMessage(gameState, actorName,  candidateName+' not found in the tribe')
		return
	}
	if (!player){
		text.addMessage(gameState, actorName,  'You are not a member of the tribe yet.')

		return
	}
	player.vote = candidateName
	totalVotes = countByType(gameState.population, 'vote', candidateName)
	tribeSize = Object.keys(gameState.population).length
	droneCount = 0;
	for (memberName in gameState.population){
		temp = population[memberName]
		if (temp.golem) {
			droneCount = droneCount+1
		}
	}
	console.log("Drone count is "+droneCount);
	text.addMessage(gameState, "tribe",  actorName+" supports "+candidateName+" as chief")
	// count all existing votes
	if (totalVotes >= (2/3 * (tribeSize-droneCount))){
		// clear the previous chief
		for (personName in gameState.population){
			person = memberByName(personName, gameState)
			if (person.chief){
				delete person.chief
			}
		}
		candidate.chief = true
		history(candidateName, "became chief", gameState);
		text.addMessage(gameState, "tribe", candidateName+' is the new chief')
	}
	gameState.saveRequired = true

	return true
}
module.exports.vote = vote;


function countByType(dictionary, key, value){
	count = 0
	for (elementName in dictionary){
		element = dictionary[elementName]
		if (element[key] && element[key] == value){ count++}
	}
	return count
}
module.exports.countByType = countByType;

function randomMemberName(population){
	nameList = Object.keys(population)
	var random =  Math.trunc( Math.random ( ) * nameList.length )
	return nameList[random]
}
module.exports.randomMemberName = randomMemberName;

function graveyard(displayName, gameState){
    
    var response = "Graveyard:";
    if ( Object.keys(gameState.graveyard ).length == 0){
        response += ' is empty'
    } else {
        for (var name in gameState.graveyard){
            // TODO flesh this out
            person = gameState.graveyard[name]
            response += '\n '+name+' died of '+person.deathMessage
            if (person.mother){
                response += ' parents:'+person.mother 
                if (gameState.secretMating && !gameState.ended){
                    response += '-???'
                } else {
                    response += '-'+person.father
                }
                response += ' age:'+person.age/2
            } else {
                response += ' profession:'+person.profession
            }
            response += ' gender:'+person.gender
        }
    }
    text.addMessage(gameState, displayName, response);
    return;
}
module.exports.graveyard = graveyard;

