const guardlib = require("./guardCode.js");
const { child } = require("winston");
const pop = require("./population")
const text = require("./textprocess");

function showChildrenPrep(gameState, displayName, onlyHungry, filterParentName ){
    var children = gameState.children;
    var response = [];
    if (onlyHungry){
        response.push('These children need food:');
        response.push( ...( showChildren(children, gameState, 'hungry', gameState.secretMating)))
    } else if (filterParentName){
            var parentPerson = pop.memberByName( filterParentName, gameState);
            if (! parentPerson ){
                text.addMessage(gameState, displayName, 'Could not find '+parentName )
            } else {
                if (parentPerson.gender == 'male'){
                     response.push("It is impossible to know who the father of a child is until the game ends.");
                } else {
                    response.push('The descendants of '+filterParentName+' are:');
                    response.push( ...(showChildren(children, gameState, filterParentName, gameState.secretMating)))
                }
            }
    } else {
        response.push(...(showChildren(children, gameState, "", gameState.secretMating)));
    }
    for (part of response){
		text.addMessage(gameState, displayName, part);
    }
    return 
}
module.exports.showChildrenPrep = showChildrenPrep;

// returns an array of strings instead of directly updated the messages
function showChildren(children, gameState, filterName="", hideFathers=true ){
	population = gameState.population;
	responseMessages = []
	childNames = Object.keys(children)
	mine = 0 
	var notPrintedNewAdultHeader = true;
	var notStartedMiddleChildren = true;
	var notStartedYoungChildren = true;
	var notStartedUnborn = true;
	var sortedChildrenNames = Object.keys(children);
	sortedChildrenNames.sort(function(a, b) {
		if (children[a].age == children[b].age){
			if ( a < b) {return 1}
			else { return -1 }
		}
		return children[a].age - children[b].age
	});
	for (childName of sortedChildrenNames) {
		var child = children[childName]
		if (filterName){
			if (filterName == child.mother){
				// do nothing
			} else if (filterName == child.father && !hideFathers){
				// also do nothing
			} else if (filterName == "hungry") {
				if (child.food >= 2){
					// skip this child, they are not hungry
					continue;
				} else {
					// do nothing
				}
			} else {
				// skip this child, since it does not match the parent filter
				continue;
			}
		}
		if (child.dead){
			//response += '('+childName+' is dead)\n';
			// skip the dead
		} else {
			var childMessage = "";
			if (child.age < 0 && notStartedUnborn){
				responseMessages.push('### -----> Unborn <----- ###');
				notStartedUnborn = false;
			} else if (0 <= child.age && child.age < 4 && notStartedYoungChildren ){
				responseMessages.push('### -----> Nursing Children <----- ###');
				notStartedYoungChildren = false;
			} else if (4 <= child.age && child.age < 24 && notStartedMiddleChildren){
				responseMessages.push('### -----> Children <----- ###');
				notStartedMiddleChildren = false;
			}	else if (child.age >= 24 && notPrintedNewAdultHeader){
				responseMessages.push('### -----> New Adults <----- ###');
				notPrintedNewAdultHeader = false;
			}
			childMessage += (childName+': '+child.gender).padEnd(30,' ')+'age:'+((child.age)/2)
			if (child.newAdult){
				childMessage += 'Full grown!'.padStart(16, ' ')
			} else {
				if (child.food < 2){
					childMessage += '  needs '+(2-child.food)+' food'
				} else { 
					childMessage += '  not hungry'.padStart(16, ' ')
				}
			}
			motherMember = pop.memberByName(child.mother, gameState);
			fatherMember = pop.memberByName(child.father, gameState);
			childMessage += ' mother:'+motherMember.name;
			if (!hideFathers){
				childMessage += ' father:'+fatherMember.name;
			}
			if (child.age < 24 ){
				childMessage += ' guard value:'+ guardlib.findGuardValueForChild(childName, population, children);
			}
			if (child.babysitting){
				childMessage += ' watching:'+child.babysitting+' ';
			}
			responseMessages.push(childMessage);
		}
	} 
	responseMessages.push('There are '+childNames.length+' children in total.')
	return responseMessages
}
module.exports.showChildren = showChildren;

function countChildrenOfParentUnderAge(children, parentName, age){
	var count = 0
	for (var childName in children){
		var child = children[childName]
		if (child.mother == parentName || child.father == parentName){
			if (child.age < age){
				count++
			}
		}
	}
	return count
}
module.exports.countChildrenOfParentUnderAge = countChildrenOfParentUnderAge;

