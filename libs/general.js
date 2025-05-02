
const text = require("./textprocess.js")
const pop = require("./population.js")
const dice = require("./dice.js");
const referees = require("./referees.json")

function give(gameState, sourceName, targetName, amount, item){
    if ( gameState.ended ){
        text.addMessage(gameState, sourceName,  'The game is over.  Maybe you want to /join to start a new game?');
        return
    }
    if (targetName == sourceName){
        response = "Giving things to yourself is useful self-care.  Nobody loves you like you love you.";
        console.log("self give: "+targetName +" "+sourceName);
        text.addMessage(gameState, sourceName, response);
        return;
    }
    if (item.startsWith('g')){
        item = 'grain'
    } else if ( item.startsWith('f')){
        item = 'food'
    } else if (item.startsWith('b') ) {
        item = 'basket'
    } else if ( item.startsWith('s')){
        item = 'spearhead'
    } else {
        response = "Valid items are: food, grain, basket or spearhead.  Unrecognized item "+item;
        text.addMessage(gameState, sourceName, response)
        return ;
    }
    var targetPerson = {}
    var sourcePerson = {}
    targetPerson = pop.memberByName(targetName, gameState);
    if (!targetPerson ){
        response = "Target "+targetName+" not found in tribe";
        text.addMessage(gameState, sourceName, response)
        return ;
    }
    sourcePerson = pop.memberByName(sourceName, gameState);
    const isRef = referees.includes(sourceName);
    const isLegal = legalGive(gameState, sourceName, item, amount);
    console.log("isRef:"+isRef+" isLegalgive:"+isLegal);
    if (isLegal){
        sourcePerson[item] -= amount;
        targetPerson[item] += amount;
    } else if (isRef){
        text.addMessage(gameState, "tribe", "Referee powers invoked");
        targetPerson[item] += amount;
    } else {
        // not a valid operation
        return;
    }
    gameState.saveRequired = true
    response = sourceName + " gives "+targetName+" "+amount+" "+item;
    text.addMessage(gameState, "tribe", response);
    // ref might not be in tribe, but console error thrown by history is OK
    pop.history(sourceName, response, gameState);
    pop.history(targetName, response, gameState);
    console.log("give is complete.");
}
module.exports.give = give;

function legalGive(gameState, sourceName, item, amount){
    const sourcePerson = pop.memberByName(sourceName, gameState);
    if (!sourcePerson){
        response = "You are not a member of tribe";
        text.addMessage(gameState, sourceName, response)
        return false;
    }
    // ref can give even if not in tribe, 
    if ( (!sourcePerson[item] || sourcePerson[item] < amount ) ){
            response = "You do not have "+amount+" "+item;
            text.addMessage(gameState, sourcePerson.name, response)
            return false;
    }
    if ("activity" in sourcePerson && sourcePerson.activity == 'hunt' && item == 'spearhead' && gameState.round== 'work'){
        response = "You already hunted with a spearhead, and cannot trade spearheads during the work round";
        text.addMessage(gameState, sourcePerson.name, response)
        return false;
    }
    if (amount < 0){
        response = "Giving a negative amount is not valid.";
        text.addMessage(gameState, sourcePerson.name, response)
        return false;
    }
    return true;
}

function inventory( gameState, targetName, actorName ){
    if (!targetName ){
        response = 'Whole Tribe Inventory:'
        for (var personName in gameState.population){
            person = pop.memberByName(personName, gameState)
            response += '\n  '+inventoryMessage(person)
        }
    } else {
        person = pop.memberByName(targetName, gameState)
        if (!person || person == null){
            response = targetName +' does not seem to be a person';
            return response;
        }
        response = inventoryMessage(person)
    }
	text.addMessage(gameState, actorName, response );
    return response;
}
module.exports.inventory = inventory;


function inventoryMessage(person){
	if (!person){
		return 'No person '+person
	}
    message = '***'+person.name+'***'
    if (person.nickname ){
		message += " ("+person.nickname+")"
	} 
    message += " "+person.gender+'\n\t\t '
	message += person.food+'  food \t'
	message += person.grain+'  grain \t'
	message += person.basket+'  baskets \t'
	message += person.spearhead+'  spearheads \t'
	if (person.profession){
		message += person.profession.padEnd(9,' ')
	} else {
		message += "         "
	}
	if (person.isPregnant && person.isPregnant != ''){
		message += '\n\t\t is pregnant with '+person.isPregnant
	}
	if (person.nursing && person.nursing.length > 0 ){
		message += '\n\t\t is nursing '+person.nursing
	}
	if (person.isInjured && person.isInjured > 0 ){
		message += '\n\t\t is ***injured*** and unable to work'
	}	
	if (person.isSick && person.isSick > 0 ){
		message += '\n\t\t is ***sick*** and unable to work'
	}
	if (person.guarding){
		message += '\n\t\t is guarding '+person.guarding
	}
	if (person.strength && person.strength != 'average'){
		message += '\n\t\t is '+person.strength
	}
	if (person.profession != 'crafter' && person.canCraft){
		message += '\n\t\t is able to craft a little'
	}
	if (person.chief){
		message += '\n\t\t is Chief'
	}
	return message
}
module.exports.inventoryMessage = inventoryMessage;


function makeJerky(sourceName, amount, gameState, bot){
    if (! gameState.canJerky){
        return "Conditions are not right for making jerky now."
    }
    if ( gameState.ended ){
        text.addMessage(gameState, sourceName,  'The game is over.  Maybe you want to /join to start a new game?');
        return
    }
    player = pop.memberByName(sourceName, gameState);
    actualFood = player.food
    if (amount > actualFood){
        amount = actualFood;
    }
    extra = amount%3
    jerky = (amount-extra)/3;
    leftover = amount - (jerky * 3);
    player.food = actualFood - amount + leftover
    player.grain += jerky
    message = sourceName+" converts "+(jerky * 3)+" food into "+jerky+" jerky";
    text.addMessage(gameState, "tribe", message);
    gameState.saveRequired = true;
    return;
}
module.exports.makeJerky = makeJerky;

function law(displayName, gameState){
    var member = pop.memberByName(displayName, gameState);
    var response = 'There are no laws.';
    if ( gameState.ended ){
        text.addMessage(gameState, displayName,  'The game is over.  Maybe you want to /join to start a new game?');
        return
    }
    laws = gameState.laws
    if (laws){
        response = "The laws are:";
    }
    for (number in laws){
        response += '\n\t'+number+'\t'+laws[number]
    }
    // possibly the person is not a member of the tribe, and just wants to see the laws
    text.addMessage(gameState, displayName, response);
    gameState.saveRequired = true;
    return;
}
module.exports.law = law;


function sacrifice(gameState, sourceName, item, amount, rollOf2dice){
    if (item.startsWith('g')){
        item = 'grain'
    } else if ( item.startsWith('f')){
        item = 'food'
    } else if (item.startsWith('b') ) {
        item = 'basket'
    } else if ( item.startsWith('s')){
        item = 'spearhead'
    } else {
        response = "Unrecognized item "+item;
        text.addMessage(gameState, sourceName, response);
        return
    }

    if (amount <= 0  ){
        response = 'Must sacrifice at least one item';
        text.addMessage(gameState,sourceName, response);
        return;
    }
    var sourcePerson = pop.memberByName(sourceName, gameState);
    // check if person is in tribe
    if (!sourcePerson){
        response = sourceName+" not found in tribe";
        text.addMessage(gameState,sourceName, response);
        return 
    }
    if (!sourcePerson[item] || sourcePerson[item] < amount){
        response = sourceName+" does not have "+amount+" "+item;
        text.addMessage(gameState,sourceName, response);
        return 
    }
    if (  sourcePerson[item] >= amount){
        // avg 
        net = rollOf2dice - 2  + Math.trunc(Math.log2(amount)) ;
        console.log(sourcePerson.name+' sacrifice roll was '+rollOf2dice+ '  plus bonus = '+net)
        sourcePerson[item] -= Number(amount);
        gameState.spoiled += Number(amount);
        ritualResults = [
            'The ritual seems clumsy.'    				// 0  Impossible result?
            ,'You feel a vague sense of unease.'    				// 1
            ,'Nothing seems to happen.'    				            // 2
            , sourcePerson.name+"'s eyes gleam wildly."				// 3
            ,'A hawk flies directly overhead.'				        // 4
            ,'There is the distant sound of thunder.'		        // 5  
            ,'The campfire flickers brightly.'				        // 6
            ,'The sun goes behind a cloud.'					        // 7   
            ,'The night goes very still and quiet when the ritual is complete.'
            ,'An owl hoots three times.'					        // 9
            ,'In the distance, a wolf howls.'				        // 10   highest base roll
            ,'You remember the way your mother held you as a child.' // 11
            ,'You feel protected.'   						        // 12
            ,'You remember learning from the ones who came before you.' //13
            ,'You feel warm and satisfied.' 				        // 14
            ,'You feel content.'		   					        // 15
            ,'A songbird lands on the shoulder of '+sourcePerson.name+'.' // 16
            ,'A flower suddenly blooms in the middle of the camp.'	// 17
        ]
        rndMsg = ritualResults[net] || ritualResults[ritualResults.length-1];
    } else {
        response = 'You do not have that many '+item+': '+ sourcePerson[item]
        text.addMessage(gameState, sourceName, response);
        return;
    }
    gameState.saveRequired = true;
    text.addMessage(gameState, "tribe", sourceName+' deliberately destroys '+amount+' '+item+' as part of a ritual.\n'+rndMsg+"\n")
}
module.exports.sacrifice = sacrifice;
