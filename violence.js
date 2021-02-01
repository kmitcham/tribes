const killlib = require("./kill.js");
const util = require("./util.js");

module.exports.demand = (playerName, demandText, gameState) => {
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
    var neutralList =[];  
    var undeclaredList =[];  
    population = gameState["population"]
    for (playerName in population){
        player = population[playerName]
        if (! player['faction'] ){
            undeclaredList.push(player);
        } else if (player['faction'] == 'neutral'){
            neutralList.push(player)        
        } else if (player['faction'] == 'for'){
            proList.push(player)
        } else  if (player['faction'] == 'against'){
            conList.push(player)
        } else {
            console.log(player['name']+' has illegal faction value '+player['faction']+' setting to null')
            delete player['faction']
            undeclaredList.push(player);
        }
    }
    return {
        for: proList,
        against: conList,
        neutral: neutralList,
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
        response = 'Nobody still cares about '+demand+'.  The conflict has been resolved.'
        console.log('nobody wants the demand anymore')
        delete gameState['demand']
        for (playerName in gameState['population']){
            delete gameState['population'][playerName]['faction']
        }
        return response
    }
    forScore = getFactionBaseScore(gameFactions["for"])
    conScore = getFactionBaseScore(gameFactions["against"])
    neuScore = getFactionBaseScore(gameFactions["neutral"])
    undScore = getFactionResult(gameFactions["undeclared"])

    forCraft = factionHasCrafter(gameFactions["for"])
    conCraft = factionHasCrafter(gameFactions["against"])
    neuCraft = factionHasCrafter(gameFactions["neutral"])    
    if (forCraft && !conCraft && !neuCraft ){        forScore += 2;    }
    if (!forCraft && conCraft && !neuCraft ){        conScore += 2;    }
    // if there are not enough undeclared people to swing the vote, we can end it immediately.
    if (forScore >= 2*(conScore + undScore)){
        response = 'The Demand faction has overwhelming support.  The demand to '+gameState.demand+' should be done immediately.'
        for (playerName in gameState['population']){
            delete gameState['population'][playerName]['faction']
        }
    } else if (conScore >= 2*(forScore+undScore)){
        response = 'The Oppostion faction has overwhelming support. The demand to '+gameState.demand+' should be ignored.'
        for (playerName in gameState['population']){
            delete gameState['population'][playerName]['faction']
        }
    } else if (gameFactions["undeclared"] && gameFactions['undeclared'].length > 0){
        response = "Not everyone has picked a side: for, against, or nuetral.  Waiting on:\n"
        for (person of gameFactions["undeclared"]){
            response += person.name+", "
        }
    } else {
        if (forScore >= (2*conScore)){
            response = 'The Demand faction has overwhelming support.  The demand to '+gameState.demand+' should be done immediately.'
        } else if (conScore >= (2*forScore)){
            response = 'The Oppostion faction has overwhelming support. The demand to '+gameState.demand+' should be ignored.'
        } else {
            gameState.violence = gameState.demand
            response = "Tribal society breaks down as VIOLENCE is required to settle the issue of "+gameState.demand
        }
        delete gameState['demand']
        for (playerName in gameState['population']){
            delete gameState['population'][playerName]['faction']
        }
    }
    return response
}
module.exports.getFactionResult = getFactionResult

const computeBonus = (attacker, defender) => {
    var bonus = 0;
    response = attacker.name +' attacks!  '
    if (attacker.spearhead > 0){ bonus += 2  }
    if (attacker.profession == 'hunter'){ bonus += 1  }
    if (attacker.strength == 'strong'){ bonus += 1 }
    if (attacker.strength == 'weak' ){ bonus -= 1 }
    if (attacker.isInjured ){ bonus -= 1  }
    if (attacker.isSick ){ bonus -= 2  }
    if (defender.strategy == 'run' || defender.strategy == 'defend'){ bonus -= 2  }
    if (defender.isPregnant ){ bonus -= 2 }
    if (defender.escaped ){bonus -= 100 }
    return bonus
}

module.exports.computeBonus = computeBonus
const resolveSingleAttack = ( attacker, defender, roll, gameState) =>{
    bonus = computeBonus(attacker, defender);
    netRoll = roll + bonus;
    if (defender.isInjured){
        defender.hits = Number(1)
    } else {
        defender.hits = Number(0)
    }
    if (netRoll >= 8){
        defender.hits = Number(defender.hits)+1
    }
    if (defender.hits == 1){
        defender.isInjured = true
        response += defender.name+' is injured!'
    }
    if (defender.hits == 2){
        defender.strength = 'weak'
        response += defender.name+' is crippled, and becomes Weak!'
    }
    if (defender.hits == 3){
        response += ' is killed!'
        // need to wire up kill here
        killlib.kill(defender, 'killed by '+attacker.name+' over '+gameState.violence, gameState)
    }
    return response;
}
module.exports.resolveSingleAttack = resolveSingleAttack;

const resolveViolence = (gameState) =>{
    attackers = []
    undecided = []
    runners = []
    response = ''
    population = gameState["population"]
    for (playerName in population){
        player = population[playerName]
        if (!player.strategy && ! player.escaped ){
            undecided.push(playerName)
        } else if (player.strategy == 'attack'){
            attackers.push(playerName)
        } else if (player.strategy == 'run'){
            runners.push(playerName)
        }
    }
    if (undecided.length > 0){
        response = 'Some players still need to chose between !attack <name>, !run, or !defend\n'
        response += undecided.join(',')
        return
    }
    if (attackers.length == 0){
        response = 'The violence has ended.  Nobody is still willing to fight about '+gameState.violence
        delete gameState.violence
        for (playerName in population){
            player = population[playerName]
            delete player.strategy
            delete player.escaped
            delete player.attack_target
            delete player.hits
        }
        return
    }
    for (attackerName in attackers){
        attacker = population[attackerName]
        targetName = attacker.attack_target
        target = population[targetName] // this could screw up 
        roll = util.roll(2)
        response += resolveSingleAttack(attacker, defender, roll, gameState)
    }
    for (playerName in runners){
        runner = population[playerName]
        runner.escaped = true;
        delete runner.strategy 
    }
}
module.exports.resolveViolence = resolveViolence