const utillib = require("./util.js");
const guardlib = require("./guardCode.js");
const { child } = require("winston");

module.exports.showChildren =  (children, population, filterName="", hideFathers=false ) =>{
		
	responseMessages = []
	childNames = Object.keys(children)
	var response = 'There are '+childNames.length+' children in total. \n'
	mine = 0 
	var notPrintedNewAdultHeader = true;
	var notStartedMiddleChildren = true;
	var notStartedYoungChildren = true;
	var notStartedUnborn = true;
	if (filterName){
		response += 'The descendants of '+filterName+' are:\n'
	}
	var sortedChildren = Object.keys(children);
	sortedChildren.sort(function(a, b) {
		if (children[a].age == children[b].age){
			if ( a < b) {return 1}
			else { return -1 }
		}
		return children[a].age - children[b].age
	});
	for (childName of sortedChildren) {
		if (response.length > 1900){
			responseMessages.push(response)
			response = ''
		}

		var child = children[childName]
		if ( filterName && !(child.mother == filterName || child.father == filterName) ) {
			continue
		}
		if (filterName){
			if (filterName == child.mother){
				// do nothing
			} else if (filterName == child.father && !hideFathers){
				// also do nothing
			} else {
				continue;
			}
		}
		if (child.dead){
			//response += '('+childName+' is dead)\n';
			// skip the dead
		} else {
			if (child.age < 0 && notStartedUnborn){
				response += '-----> Unborn <-----\n'
				notStartedUnborn = false;
			} else if (0 <= child.age && child.age < 4 && notStartedYoungChildren ){
				response += '-----> Nursing Children <-----\n'
				notStartedYoungChildren = false;
			} else if (4 <= child.age && child.age < 24 && notStartedMiddleChildren){
				response += '-----> Children <-----\n'
				notStartedMiddleChildren = false;
			}	else if (child.age >= 24 && notPrintedNewAdultHeader){
				response += '-----> New Adults <-----\n'
				notPrintedNewAdultHeader = false;
			}
			response += (childName+':'+child.gender).padEnd(30,' ')+'age:'+((child.age)/2)
			if (child.newAdult){
				response += 'Full grown!'.padStart(16, ' ')
			} else {
				response += '  needs '+(2-child.food)+' food'
			} 
			response += ' mother:'+child.mother
			if (!hideFathers){
				response += ' father:'+child.father
			}
			if (child.age < 24 ){
				response += ' guardValue:'+ utillib.round(guardlib.findGuardValueForChild(childName, population, children))
			}
			if (child.babysitting){
				response += ' watching:'+child.babysitting+' '
			}
			response += '\n'
		}
	} 
	responseMessages.push(response)
	return responseMessages
}