const dice = require("./dice.js");
const pop = require("./population.js");
const text = require("./textprocess.js");

function feed( msg, player, amount, childList,  gameState){
        children = gameState.children;
        let message = ""
        var showErrors = true;
        for (cName of childList){
            childName = text.capitalizeFirstLetter(cName)
            amount = Number(amount)
            if (!children[childName]) {
                if (cName.toLowerCase() == "!all"){
                    showErrors = false;
                    for (var childName in children){
                        var child = children[childName]
                        if (!( child.newAdult && child.newAdult == true) || child.food < 2){
                            childList.push(childName)
                        }
                    }
                    continue;
                }
                var parent = pop.memberByName(cName, gameState)
                if (parent && parent.gender && parent.gender == 'female'){
                    for (var filterChildName in children){
                        var filterChild = children[filterChildName]
                        if (filterChild.mother == parent.name){
                            if (! (filterChild.newAdult && filterChild.newAdult == true) || filterChild.food < 2){
                                childList.push(filterChildName)
                            }
                        }
                    }
                    continue;
                }
                msg.author.send('no such child as '+childName)
                continue    
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
            if ( ( player['food']+player['grain'] ) >= amount){
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
        if (person.gender == 'female' && countChildrenOfParentUnderAge(children, targetName, 4) > 1){
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
        //startReproduction(gameState,bot)
    }
    return message
}
module.exports.checkFood = checkFood