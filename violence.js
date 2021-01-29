module.exports.demand = (playerName,demandText, gameState) => {
    // fail if already has a demand in place
    // fail if player not in tribe
    response = playerName+' DEMANDS: '+demandText
    player = gameState["population"][playerName]
    gameState["demand"] = demandText
    player['faction'] = 'for'
    return response;
}

const getGameFactions= (gameState) =>{
    var proList =[]
    var conList= [] 
    var abstainList =[];  
    var undeclaredList =[];  
    population = gameState["population"]
    for (playerName in population){
        player = population[playerName]
        if (! player['faction'] ){
            undeclaredList.push(player);
        } else if (player['faction'] == 'neutral'){
            abstainList.push(player)        
        } else if (player['faction'] == 'for'){
            proList.push(player)
        } else  if (player['faction'] == 'against'){
            conList.push(player)
        } else {
            console.log(player['name']+' has illegal faction value '+player['faction']+' (adding  to abstain)')
            delete player['faction']
            undeclaredList.push(player);
        }
    }
    return {
        for: proList,
        against: conList,
        abstain: abstainList,
        undeclared: undeclaredList
    }
}
module.exports.getGameFactions = getGameFactions

function getFactionBaseScore(faction){
    var score = 0
    for (person of faction){
        if (person.gender == "male"){
            score += 4
        } else {
            score += 2
        }
        if (person.chief){
            score += 2;
        }
        if (person.isPregnant){
            score += 1
        }
        if (person.strength){
            if (person.strength == 'weak'){
                score -= 1
            } else {
                score += 1
            }
        }
        if (person.isInjured && person.isInjured != 'false' ){
            score -= 1
        }	
        if (person.isSick && person.isSick != 'false' ){
            score -= 1
        }
    }
    return score;
}
module.exports.getFactionBaseScore = getFactionBaseScore

function factionHasCrafter(faction){
    for (person of faction){
        if (person.canCraft){
            return true;
        }
    }
    return false;
}

const getFactionResult = (gameState) =>{
    response = ''
    gameFactions = getGameFactions(gameState)
    var forScore =0
    var conScore =0

    if (!gameFactions['for'] || gameFactions['for'].length == 0){
        response = 'Nobody still cares about '+demand
        console.log('nobody wants the demand anymore')
        delete gameState['demand']
        for (playerName in gameState['population']){
            delete gameState['population'][playerName]['faction']
        }
        return response
    }
    if (gameFactions["undeclared"] && gameFactions['undeclared'].length > 0){
        response = "Not everyone has chosen for, against, or abstain yet.  Waiting on:\n"
        for (person of gameFactions["undeclared"]){
            response += person.name+", "
        }
        return response
    }
    forScore = getFactionBaseScore(gameFactions["for"])
    conScore = getFactionBaseScore(gameFactions["against"])

    forCraft = factionHasCrafter(gameFactions["for"])
    conCraft = factionHasCrafter(gameFactions["against"])
    absCraft = factionHasCrafter(gameFactions["abstain"])
    if (forCraft && !conCraft && !absCraft ){
        forScore += 2;
    }
    if (!forCraft && conCraft && !absCraft ){
        conScore += 2;
    }
    if (forScore >= (2*conScore)){
        response = 'The Demand faction has overwhelming support.  The demand to '+gameState.demand+' should be done immediately.'
    } else if (conScore >= (2*forScore)){
        response = 'The oppostion faction has overwhelming support. The demand to '+gameState.demand+' should be ignored.'

    } else {
        gameState.violence = gameState.demand
        response = "Tribal society breaks down as VIOLENCE is required to settle the issue. of "+gameState.demand
    }
    delete gameState['demand']
    for (playerName in gameState['population']){
        delete gameState['population'][playerName]['faction']
    }
    return response

}
module.exports.getFactionResult = getFactionResult