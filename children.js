const utillib = require("./util.js");
const guardlib = require("./guardCode.js");
const { child } = require("winston");

module.exports.showChildren =  (children, population, filterName="", hideFathers=false ) =>{
		response = ''
		childNames = Object.keys(children)
		response = 'There are '+childNames.length+' children in total. \n'
		mine = 0 
		var notPrintedNewAdultHeader = true;
		var notStartedMiddleChildren = true;
		var notStartedYoungChildren = true;
        var notStartedUnborn = true;
		if (filterName){
			response += 'The descendants of '+filterName+' are:\n'
		}
		for (childName in children) {
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
                } else if (child.age < 4 && notStartedYoungChildren ){
					response += '-----> Young Children <-----\n'
					notStartedYoungChildren = false;
				} else if (child.age < 24 && notStartedMiddleChildren){
					response += '-----> Children <-----\n'
					notStartedMiddleChildren = false;
				}	else if (child.age >= 24 && notPrintedNewAdultHeader){
					response += '-----> New Adults <-----\n'
					notPrintedNewAdultHeader = false;
				}
				response += '('+childName+':'+child.gender
				response += ' years:'+((child.age)/2)
				if (child.newAdult){
					response += ' Full grown!'
				} else {
					response += ' needs '+(2-child.food)+' food'
				} 
				response += ' parents:'+child.mother
				if (!hideFathers){
					response += '+'+child.father
				}
				if (child.age < 24 ){
					response += ' guardValue:'+ utillib.round(guardlib.findGuardValueForChild(childName, population, children))
				}
				if (child.babysitting){
					response += ' watching:'+child.babysitting+' '
				}
				response += ')\n'
			}
        } 
		return response
}