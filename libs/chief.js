const guardlib = require("./guardCode.js")
const dice = require("./dice.js")
const tribeUtil = require("./util.js")
const referees = require("./referees.json")
const text = require("./textprocess")
const pop = require("./population")


function isChanceLegal(gameState, actorName, forceRoll){
    isRef = referees.includes(actorName);
    if ( isRef && forceRoll){
        chanceRoll = forceRoll;
        if (chanceRoll < 3 || 18 < chanceRoll){
            text.addMessage(gameState, actorName, 'Roll must be 3-18')
            return false;
        }
    }
    var player = pop.memberByName(actorName, gameState)
    if ( !player.chief && !isRef){
        text.addMessage(gameState, actorName,"Chance requires chief privileges");
        return false;
    }
    if(gameState.reproductionRound == false ){
        text.addMessage(gameState, actorName,'Can only do chance during the reproduction round, after reproduction activites are complete.');
        return false;
    }
    if (gameState.needChanceRoll == false){
        text.addMessage(gameState, actorName,'Chance was already done this round.');
        return false;
    }
    return true;    
}
module.exports.isChanceLegal = isChanceLegal;

function doChance(rollValue, gameState){
    population = gameState.population
    children = gameState.children
    
    chanceRoll = Number(rollValue)
    if (!chanceRoll || chanceRoll < 3 || chanceRoll > 18 ){
        console.log(' invalid chance roll'+rollValue)
        chanceRoll = dice.roll(3)
    }
    message = 'Chance '+chanceRoll+': '
    switch 	(chanceRoll){
        case 18: case 17: case 16:
            name = pop.randomMemberName(population);
            person = pop.memberByName(name, gameState);
            safety = 0; // infinite loop protection
            while ( (person.hasOwnProperty('strength') && person.strength == 'strong' ) && safety < Object.keys(population).length) {
                name = pop.randomMemberName(population);
                person = pop.memberByName(name, gameState);
                safety = safety + 1;
            }
            message +=  name +" grows stronger.";
            if (person.strength && person.strength == 'weak'){
                delete person.strength
            } else {
                person.strength = 'strong'
            }
            break;
        case 15 : 
            message +="Fungus! All stored food in the whole tribe, except grain, spoils and is lost."
            for (var name in population){
                person = population[name];
                gameState.spoiled += person.food;
                person.food = 0
            }
            break;
        case 14 : 
            name = pop.randomMemberName(population)
            person= population[name]
            message +="Rats! All "+name+"'s food ["+person.food+"], except for grain, spoils and is lost.  "
            gameState.spoiled += person.food;
            person.food = 0
            if (Object.keys(population).length >= 8){
                name2 = pop.randomMemberName(population)
                if (name != name2){
                    person2 = population[name2]
                    message+= name2+"'s ["+person2.food+"] food is also spoiled, in a strange coincidence."
                    gameState.spoiled += person2.food;
                    person2.food = 0
                }
            } else {
                message += "Others’ stored food is not affected."
            }
            break;
        case 13 : 
            name = pop.randomMemberName(population)
            person= population[name]
            if (person.hasOwnProperty('spearhead')){
                person.spearhead += 1
            } else {
                person.spearhead = 1
            }
            message += name +" finds a spearhead"
            break;
        case 12 : 
            if (gameState.children){
                message +="The younger tribesfolk gather food. Each child over 4 years old brings 2 Food to their mother. Each New Adult brings 4 Food to their mother."
                for (childName in children){
                    var child = children[childName]
                    if (child.age > 8 ){ // age in seasons
                        gift = 2
                        if (child.newAdult ){
                            gift = 4
                        }
                        motherName = child.mother
                        mother = population[motherName]
                        if (mother){
                            mother.food += gift;
                            gameState.foodAcquired += gift;
                            message += '\n  '+motherName+' gets '+gift+' from '+childName
                        } else {
                            message += '\n  '+motherName+' was not around, so '+childName+' eats it out of grief.'
                        }
                    }
                }
            } else {
                message += "If the tribe had children, they might gather food"
            }
            break;
        case 11 : 
            message +="Locusts! Each player loses two dice of stored food"
            for (var name in population){
                person = population[name]
                var amount = dice.roll(2)
                if (amount > person.food){
                    amount = person.food
                }
                gameState.spoiled += amount;
                person.food -= amount
                message += "\n "+name+" loses "+amount
                if (person.food < 0) { person.food = 0}
            }
            break;
        case 10 : 
            message += guardlib.hyenaAttack(children, gameState)
            break;
        case 9 : 
            name = pop.randomMemberName(population)
            person = population[name]
            amount = dice.roll(2)
            if (amount > person.food){
                amount = person.food
            }
            person.food -= amount
            if (person.food < 0) { person.food = 0}
            message += name + " loses "+amount+" food to weevils."
            gameState.spoiled += amount;
            break;
        case 8: 
            message +=  "Favorable weather conditions allow the tribe to make “jerky,” which keeps very well. Each person may trade Food counters for Grain counters (representing the jerky), at a rate of 3 Food for 1 Grain.  Syntax: /jerky <amount of food>"
            gameState.canJerky = true
            break;
        case 7: 
            message +=  "FIRE! The hunting track moves to 20 (no game!) The tribe must move to another area immediately (Section 9). "
            if ( tribeUtil.isColdSeason(gameState) && (gameState.currentLocationName == 'marsh' || gameState.currentLocationName == 'hills')){
                console.log("rerolling winter fire in the marsh or hills")
                message = doChance(dice.roll(3), gameState)
                return message
            } else {
                gameState.gameTrack[gameState.currentLocationName] = 20
            }
            break;
        case 6: 
            name = pop.randomMemberName(population)
            person = population[name]
            person.isInjured = 4
            // TODO clear the guarding array of the injured person
            message +=  name + " injured – miss next turn."
            break;
        case 5: 
            name = pop.randomMemberName(population)
            person = population[name]
            person.isSick = 3
            message +=  name + " got sick – eat 2 extra food and miss next turn. "
            if (person.food < 2){
                message += '( but they only had '+person.food+' so the ref might kill them if no help is given or grain is used)'
            }
            person.food -= 2
            if (person.food < 0) { person.food = 0}
            if (person.guarding && person.guarding.length > 0){
                message += " They can no longer guard "+person.guarding
                delete person.guarding
            }
            break;
        case 4: 
        case 3: 
            name = pop.randomMemberName(population)
            person = population[name]
            message +=  name +" gets a severe injury: miss next turn and "
            person.isInjured = 4
            if (person.hasOwnProperty('strength') && person.strength == 'strong'){
                delete person.strength
                message += ' is reduced to average strength.'
            } else if (person.strength && person.strength == 'weak'){
                message += ' is already weak, so less of a problem.'
            }else {
                person.strength = 'weak'
                message+= ' becomes weak.'
            }
            break;
        default:
            message = 'bug in the chance system'
    }
    text.addMessage(gameState, "tribe", message);
    gameState.needChanceRoll = false;
    gameState.saveRequired = true;
    return message;
}
module.exports.doChance = doChance;
