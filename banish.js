const util = require("./util.js");

module.exports.banish = (gameState, targetName, bot) =>{
    population = gameState.population
    person = util.personByName(targetName, gameState)
    console.log("In banish lib for "+targetName)
    if (person){
        targetName = person.name
    }
	if (population[targetName]){
        person = util.personByName(targetName, gameState)
        if (!gameState.banished){
            gameState.banished = {}
        }
        gameState.banished[targetName] = person
        // removing the player from the banish list is a pain.
        delete population[targetName]
        util.messageChannel(targetName+' is banished from the tribe',gameState, bot)
        for (childName in gameState.children){
            child = gameState.children[childName]
            console.log(childName+' is getting checked')
            // remove the unborn children
            if (child.mother == targetName && child.age < 4 ){
                gameState.banished[childName] = child;
                delete gameState.children[childName]
            }
            if (person.guarding && person.guarding.indexOf(childName) > -1 ){
                childIndex = person.guarding.indexOf(childName)
                if (childIndex > -1) {
                    person.guarding.splice(childIndex, 1);
                }
                util.messageChannel(targetName+' stops guarding '+childName, gameState, bot)
            }
        }
        // clean up inviteList
        for (memberName in population){
            if (memberName == targetName){
                continue;
            }
            member = population[memberName]
            if (member.inviteList){
                targetIndex = member.inviteList.indexOf(targetName)
                if (targetIndex > -1 ){
                    member.inviteList.splice(targetIndex, 1)
                }
            }
        }
        const name = person.name
        gameState.banished[targetName] = person
        return
    } else {
        console.log("Failed to get the person; banish fails")
        util.messageChannel(targetName+" was not found in the tribe")
    }
}