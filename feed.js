const util = require("./util.js");

module.exports.feed = ( msg, player, amount, childList,  gameState) =>{
        children = gameState.children;
        var showErrors = true;
        message = ''
        for (cName of childList){
            childName = capitalizeFirstLetter(cName)
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
                var parent = util.personByName(cName, gameState)
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
                if (showErrors){msg.author.send(childName+' has enough food already.')}
                continue
            }
            if ( (child.food + amount) > 2 ){
                if (showErrors){msg.author.send(childName+' does not need to eat that much.')}
                continue
            }
            if ( child.newAdult && child.newAdult == true){
                if (showErrors){msg.author.send(childName+' is all grown up and does not need food from you.')}
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
                msg.author.send('You do not have enough food or grain to feed '+childName)
                break;
            }
        }
        return message;
};	

function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
}