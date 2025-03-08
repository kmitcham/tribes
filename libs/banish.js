const populationLib = require("./population.js")
const t = require("./textprocess")

module.exports.banish = (gameState, targetName, reason) =>{
    population = gameState.population    
    console.log("In banish lib for "+targetName)
    person = populationLib.memberByName(targetName, gameState)
	if (person){
        if (!gameState.banished){
            gameState.banished = {}
        }
        gameState.banished[targetName] = [person, reason]
        // removing the player from the banish list is a pain.
        delete population[targetName]
        t.addMessage(gameState, "tribe", targetName+' is banished from the tribe')
        for (childName in gameState.children){
            child = gameState.children[childName]
            console.log(childName+' is getting checked')
            // remove the unborn children
            if (child.mother == targetName && child.age < 4 ){
                gameState.banished[childName] = [child, 'banished in the womb'];
                delete gameState.children[childName]
            }
            if (person.guarding && person.guarding.indexOf(childName) > -1 ){
                childIndex = person.guarding.indexOf(childName)
                if (childIndex > -1) {
                    person.guarding.splice(childIndex, 1);
                }
                t.addMessage(gameState, "tribe", targetName+' stops guarding '+childName)
            }
        }
        // clean up inviteLists
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
        gameState.banished[targetName] = [person, reason]
        return
    } else {
        console.log("Failed to get the person; banish fails")
        t.addMessage(gameState, "tribe", targetName+" was not found in the tribe")
    }
}