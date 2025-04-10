const pop = require("./population");
const text = require("./textprocess");

const professionList= ['hunter','gatherer', 'crafter']

function specialize(playerName, profession, gameState){

	if ( !profession || !professionList.includes(profession)){
		text.addMessage(gameState, playerName, 'usage:specialize [hunter|gatherer|crafter]')
		console.log(" did not find profession:"+profession+" in "+professionList);
		return 'usage:specialize [hunter|gatherer|crafter] '
	}

	var person = pop.memberByName(playerName, gameState)
	if (!person){
		text.addMessage(gameState, person.name, person.name +', you are not in this tribe.');
		return person.name +', you are not in this tribe.'
	}
	console.log("person:"+person.name+" profession"+person.profession);
	if ("profession" in person && person.profession){
		console.log("trying to repeat specializion");
		text.addMessage(gameState, person.name, "You are already skilled at "+person.profession);
		profession = person.profession; // do no allow profession changes after creation
	}

	helpMessage = "Welcome new hunter.  \n"
	helpMessage+= "To hunt, do /hunt and the bot rolls 3d6.  Higher numbers are bigger animals, and very low numbers are bad - you could get injured. \n"
	helpMessage+= "You cannot guard children while hunting. \n"
	helpMessage+= "Before you set out, you might consider waiting for a crafter to make you a spearhead which gives you a bonus to your roll. \n"
	helpMessage+= "You can also `/gather`, but at a penalty. If your tribe has someone who knows how to craft, you can try to learn that skill with `/train`";
	helpMessage+= "A hunting result looks like this: \n";
	helpMessage+= "playername goes hunting. [13] +strong +spearhead\n    sturgeon +40 food\n The spearhead broke! (roll 1)\nThe game track goes from 1 to 2\n\n"
	helpMessage+= "The first number in [] is the result of 3d6.  The +number is how much food was aquired.  The (roll 1) is the 1d6 spearhead damage result.\n"

	if (profession.startsWith('h')){
		profession = 'hunter'
		person.profession = profession
		// use default helpMessage
	}
	if (profession.startsWith('c')){
		profession = 'crafter';
		person.profession = profession
		helpMessage = "Welcome new crafter.  To craft, do `/craft basket` or `/craft spearhead`.  There is a 1/6 (basket) or 1/3 (spearhead) chance of failing. \n"
		helpMessage+= "You can guard up to two children while crafting. \n"
		helpMessage+= "You can also `/gather`  or `/hunt`, but at a penalty. \n"
		helpMessage+= "By default, you will train others in crafting if they take a season to train.  To toggle this setting, use `/secrets`.";
	}
	if (profession.startsWith('g')){
		profession = 'gatherer';
		person.profession = profession
		helpMessage = "Welcome new gatherer.  To gather, do `/gather`, and the bot rolls 3d6.  Higher numbers generally produce more food. \n"
		helpMessage+= "You can guard 2 children without penalty; watching 3 or 4 gives an increasing penalty; 5 is too many to gather with. \n"
		helpMessage+= "Before you set out, you might consider waiting for a crafter to make you a basket which gives you an additional gather attempt. \n"
		helpMessage+= "You can also `/hunt`, but at a penalty. If your tribe has someone who knows how to craft, you can try to learn that skill with `/train`\n";
		helpMessage+= "A gathering result looks like this:\n"
		helpMessage+= "playername gathers [11]-season mushrooms (6) basket: [4]clams (4)\n"
		helpMessage+= "The first number in [] represents the 3d6 roll.  The number in () is how much food was aquired.  If you have a basket, you gather twice.\n"
	}

	person.profession = profession
	text.addMessage(gameState, "tribe", playerName+ ' is a skilled '+profession);

	if (profession.startsWith('c')){
		person.canCraft = true
	}
	text.addMessage(gameState, playerName, helpMessage);
	return helpMessage;
}
module.exports.specialize = specialize
