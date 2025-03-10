const dice = require("./dice.js");
const pop = require("./population.js");
const childLib = require("./children.js");
const text = require("./textprocess.js");
const reproLib = require("./reproduction.js");
const killlib = require("./kill.js");

// unused is deprecated
function feed(unused, player, amount, inputChildList, gameState){
        children = gameState.children;
        let message = ""
        var showErrors = true;
        for (cName of inputChildList){
            childName = text.capitalizeFirstLetter(cName)
            amount = Number(amount)
            if (!children[childName]) {
                if (cName.toLowerCase() == "!all"){
                    showErrors = false;
					feedAtLeastOneChild = false;
                    for (var childName in children){
                        var child = children[childName]
                        if (!( child.newAdult && child.newAdult == true) || child.food < 2){
                            inputChildList.push(childName)
							feedAtLeastOneChild = true;
                        }
                    }
					if (!feedAtLeastOneChild){
						text.addMessage(gameState, player.name,'no children need food');
						console.log("message is "+'no children need food');
						return 1; 
					}
                    continue;
                }
                // this seems to be code handling if a newAdult has a child?
				var parent = pop.memberByName(cName, gameState)
                if (parent && parent.gender && parent.gender == 'female'){
                    for (var filterChildName in children){
                        var filterChild = children[filterChildName]
                        if (filterChild.mother == parent.name){
                            if (! (filterChild.newAdult && filterChild.newAdult == true) || filterChild.food < 2){
                                inputChildList.push(filterChildName)
                            }
                        }
                    }
                    continue;
                }
				text.addMessage(gameState, player.name,'no such child as '+childName);
				continue;
            }
            child = children[childName]
            if (  Number(child.food) >= 2 ){
                if (showErrors){text.addMessage(gameState, player.name,  childName+' has enough food already.')}
                continue
            }
            if ( (child.food + amount) > 2 ){
                if (showErrors){text.addMessage(gameState, player.name, childName+' does not need to eat that much.')}
                continue
            }
            if ( child.newAdult && child.newAdult == true){
                if (showErrors){text.addMessage(gameState, player.name,childName+' is all grown up and does not need food from you.')}
                continue
            }
            var fed = 0
            if ( ( player['food']+ player['grain'] ) >= amount){
                if (player['food'] >= amount){
                    player.food -= Number(amount)
                } else {
                    fed = player.food
                    player.food = 0
                    player['grain'] -= (amount-fed)
                }
                message += player.name+' feeds '+amount+' to '+childName;
                children[childName].food += Number(amount)
                if (children[childName].food != 2){
                    message += ' '+childName+' could eat more.'
                }
                message += '\n'
            } else {
                text.addMessage(gameState, player.name, 'You do not have enough food or grain to feed '+childName)
                break;
            }
        }
        console.log("message is "+message);
        text.addMessage(gameState, "tribe", message)
        return 0
};	
module.exports.feed = feed;

function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
}

// Side effect: if everyone has enough food, and it is foodRound, start reproduction round.
function checkFood(gameState, bot){
    message = ''
    hungryAdults = []
    happyAdults = []
    worriedAdults = []
    hungryChildren = []
    satedChildren = []
    children = gameState.children
    population = gameState.population
    for  (var targetName in population) {
        person = population[targetName]
        hunger = 4
        if (person.gender == 'female' && childLib.countChildrenOfParentUnderAge(children, targetName, 4) > 1){
            hunger = 6
        }
        if (person.food >= hunger) {
            happyAdults.push(targetName);
        } else if ( ((person.food+person.grain) >= hunger )){
            worriedAdults.push(targetName);
        } else {
            hungryAdults.push(targetName);
        }
    }
    for (var childName in children){
        var child = children[childName]
        if (child.newAdult && child.newAdult== true){
            continue;
        }
        if (child.food >= 2 ){
            satedChildren.push(childName)
        }else {
            hungryChildren.push(childName)
        }
    }
    message = 'Happy People: '+happyAdults+", "+satedChildren
    message += '\nWorried adults: '+worriedAdults
    message += '\nHungry adults: '+hungryAdults
    message += '\nHungry children: '+hungryChildren
    if (!worriedAdults.length && !hungryAdults.length && !hungryChildren.length && gameState.foodRound ){
        gameState.enoughFood = true
        text.addMessage(gameState, "tribe", "Everyone has enough food, starting reproduction automatically.")
        // TODO handle this
        reproLib.startReproduction(gameState)
    }
    return message
}
module.exports.checkFood = checkFood

function consumeFoodChildren(gameState){
	response = '';
	perishedChildren = []
	population = gameState.population
	children = gameState.children

	console.log('children are eating')
	for (childName in children){
		var child = children[childName]
		if (child.dead){
			continue;
		}
		console.log(childName+" object "+child)
		child.age += 1
		if (child.age < 24 ){
			child.food -= 2
			if (child.food < 0){
				response += " child:"+childName+" has starved to death.\n"
				child.dead = true
				if (population[child.mother] && population[child.mother].isPregnant ) {
					delete population[child.mother].isPregnant
				}
				perishedChildren.push(childName)
				continue;
			} 
			if (child.age == 0 ){
				birthRoll = dice.roll(3)
				response += '\t'+child.mother+' gives birth to a '+child.gender+'-child, '+child.name
				pop.history(child.mother,child.mother+' gives birth to a '+child.gender+'-child, '+child.name, gameState)
				if (birthRoll < 5 ){
					response += ' but the child did not survive\n'
					child.dead = true
					killlib.kill(child.name, 'birth complications', gameState)
					console.log('removing stillborn '+child.name)
					continue;
				} else {
					response += '\n'
				}
				//Mothers start guarding their newborns
				person = pop.memberByName(child.mother, gameState)
				if (!person.guarding){
					person.guarding = [child.name]
				} else if (person.guarding.indexOf(child.name) == -1){
					person.guarding.push(child.name)
				}
				if (birthRoll == 17){
					twin = reproLib.addChild(child.mother, child.father, gameState);
					delete child.mother.isPregnant; // this gets set by addChild, but the child was just born.
					response += child.mother+' gives birth to a twin! Meet '+twin.name+', a healthy young '+twin.gender+'-child.\n'
					pop.history(child.mother,child.mother+' gives birth to a twin! Meet '+twin.name+', a healthy young '+twin.gender+'-child', gameState)
					person.guarding.push(twin.name)
					twin.age = 0
				}
			}
			// Sometimes we get bugs where pregnancy doesn't clear; this will fix it eventually
			if (child.age >= 0){
				if (population[child.mother] && population[child.mother].isPregnant
					&& population[child.mother].isPregnant == childName ){
					delete population[child.mother].isPregnant
				}
			}
			if (4 > child.age && child.age >=  0 && population[child.mother] ){
				if ( ! population[child.mother].nursing){
					population[child.mother].nursing = []
				}
				if (population[child.mother].nursing.indexOf(childName) == -1){
					population[child.mother].nursing.push( child.name)
				}
			}
			if (child.age >= 4 // 2 years in SEASONS
					&& population[child.mother] && population[child.mother].nursing 
					&&  population[child.mother].nursing.indexOf(childName) > -1 ){
				childIndex = population[child.mother].nursing.indexOf(childName)
				population[child.mother].nursing.splice(childIndex, 1);
				response += child.name+' is weaned.\n'
				if (population[child.mother].nursing && population[child.mother].nursing.length == 0){
					delete population[child.mother].nursing 
				}
			}
		}
		if (child.age >= 24 && ! child.newAdult ){
			child.newAdult = true
			response += child.name+' has reached adulthood!\n'
			// clear all guardians
			for  (var name in population) {
				player = population[name]
				if (player.guarding && player.guarding.includes(child.name)){
					const index = player.guarding.indexOf(child.name);
					if (index > -1) {
						player.guarding.splice(index, 1);
						response += name+' stops watching the new adult.\n'
					}
				}
			}
			for (var sitterName in children){
				sitter = children[sitterName]
				if (sitter.babysitting && sitter.babysitting == child.name){
					delete sitter.babysitting
					response += sitter.name +" stops watching the new adult.\n"
				}
			}
		}
	}
	// clean up the dead
	perishedCount = perishedChildren.length;
	for (var i = 0; i < perishedCount; i++) {
		corpse = perishedChildren[i]
		killlib.kill(perishedChildren[i], 'starvation', gameState)
		console.log('removing child corpse '+corpse)
	}
	if ((perishedChildren.length) == 0 ){
		response += 'No children starved!'
	}
	return response;
}
module.exports.consumeFoodChildren = consumeFoodChildren

function consumeFood(gameState){
	if (!gameState){
		console.log('no game state; ERROR')
		return
	}
	console.log('adults are eating')
	response = "Food round results:\n"
	//console.log('food response is '+response)
	response += consumeFoodPlayers(gameState);
	//console.log('food response is '+response)
	response += consumeFoodChildren(gameState);
	//console.log('food response is '+response)
	return response
}
module.exports.consumeFood = consumeFood;

function consumeFoodPlayers(gameState){
	perished = []
	population = gameState.population
	children = gameState.children
	var response = '';
	for  (var target in population) {
		var hunger = 4
		console.log(target+' f:'+population[target].food+' g:'+population[target].grain)
		population[target].food = population[target].food - hunger
		if (population[target].food < 0 ){
			// food is negative, so just add it to grain here
			population[target].grain = population[target].grain + population[target].food
			population[target].food = 0
			if (population[target].grain < 0){
				response += "  "+target+" has starved to death.\n"
				population[target].grain = 0
				perished.push(target)
			}
		}
		if (population[target].gender == 'female' && childLib.countChildrenOfParentUnderAge(children, target, 4 ) > 1 ){
			// extra food issues here; mom needs 2 more food, or the child will die.
			console.log(target+' needs extra food due to underage children. ')
			population[target].food -= 2
			if (population[target].food < 0 ){
				// food is negative, so just add it to grain here
				population[target].grain = population[target].grain + population[target].food
				population[target].food = 0
				if (population[target].grain < 0){
					childname = population[target].isPregnant 
					response += target+' lost her child '+child+' due to lack of food\n'
					killlib.kill(childName, 'prenatal starvation',gameState)
					delete population[target].isPregnant 
				}
			}
		}
		console.log(target+' f:'+population[target].food+' g:'+population[target].grain)
	} 
	var perishedCount = perished.length;
	for (var i = 0; i < perishedCount; i++) {
		corpse = perished[i]
		console.log('removing corpse '+corpse)
		killlib.kill(perished[i], 'starvation', gameState)
	}
	if ((perished.length) == 0 ){
		response += 'No adults starved! \n'
	}
	return response;
}
module.exports.consumeFoodPlayers = consumeFoodPlayers;

