const killlib = require("./kill.js");
const text = require('./textprocess.js')
const pop = require('./population.js')
const dice = require('./dice.js')

module.exports.demand = (playerName, demandText, gameState) => {
    // fail if already has a demand in place
    // fail if player not in tribe
    response = 
    player = gameState["population"][playerName]
    gameState["demand"] = demandText
    player['faction'] = 'for'
    text.addMessage(gameState, "tribe", playerName+' DEMANDS: '+demandText )
    return response;
}

function getGameFactions(gameState){
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

// see if any factions members are all escaped or dead.
// returns true if violence is still in order
function moreFactionViolenceRequired(gameState){
    var proList =[];
    var conList= [];
    population = gameState["population"]
    // dead people are in the graveyard
    for (playerName in population){
        player = population[playerName]
        if (player['faction'] == 'for' && !player['escaped']){
            proList.push(player)
        } else if (player['faction'] == 'against' && !player['escaped']){
            conList.push(player)
        }
    }
    if (conList.length == 0 && proList.length == 0){
        text.addMessage(gameState, "tribe", "There is no one left from either faction that wants to fight about it.");
        return false;
    } else if (proList.length == 0 ){
        text.addMessage(gameState, "tribe", "There is no one left favor of the demand that wants to fight about it.");
        return false;
    } else if (conList.length == 0 ) {
        text.addMessage(gameState, "tribe", "There is no one left against the demand that wants to fight about it.");
        return false;
    } else {
        text.addMessage(gameState, "tribe", "The factions still feel strongly about the issue.");
        return true;
    }
}

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
        if (person.isInjured && person.isInjured > 0 ){
            score -= 1
        }	
        if (person.isSick && person.isSick > 0 ){
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
    demand = gameState['demand']
    var forScore =0
    var againstScore =0

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
    againstScore = getFactionBaseScore(gameFactions["against"])
    neutralScore = getFactionBaseScore(gameFactions["neutral"])
    undeclaredScore = getFactionBaseScore(gameFactions["undeclared"])
    console.log('Faction scores: For:'+forScore+' against:'+againstScore+' neutral:'+neutralScore+' undeclared:'+undeclaredScore)
    forCraft = factionHasCrafter(gameFactions["for"])
    conCraft = factionHasCrafter(gameFactions["against"])
    neuCraft = factionHasCrafter(gameFactions["neutral"])    
    undCraft = factionHasCrafter(gameFactions["undeclared"])    
    if (forCraft && !conCraft && !neuCraft && !undCraft){        forScore += 2;    }
    if (!forCraft && conCraft && !neuCraft && !undCraft){        againstScore += 2;    }

    // if there are not enough undeclared people to swing the vote, we can end it immediately.
    if (forScore >= 2*(againstScore + undeclaredScore)){
        response = 'The Demand faction has overwhelming support ('+forScore+').  The demand to '+gameState.demand+' should be done immediately.'
        for (playerName in gameState['population']){
            delete gameState['population'][playerName]['faction']
        }
        console.log("The demand has been resolved via overwheming support.  Deleting: "+gameState.demand)
        delete gameState['demand']
    } else if (againstScore >= 2*(forScore+undeclaredScore)){
        response = 'The Oppostion faction has overwhelming support ('+againstScore+'). The demand to '+gameState.demand+' should be ignored.'
        for (playerName in gameState['population']){
            delete gameState['population'][playerName]['faction']
        }
    } else if (gameFactions["undeclared"] && gameFactions['undeclared'].length > 0){
        //console.log(gameFactions)
        response = "The factions are:\n"
        response += displayFaction(gameFactions['undeclared'])+ 'not yet declared (for, against, neutral).\n'
        response += displayFaction(gameFactions['for'])+ 'for the demand.\n'
        response += displayFaction(gameFactions['against'])+ 'against the demand.\n'
        response += displayFaction(gameFactions['neutral'])+ 'unwilling to fight about it.\n'
    } else {
        if (forScore >= (2*againstScore)){
            response = 'The Demand faction has enough support ('+forScore+').  The demand to '+gameState.demand+' should be done immediately.'
        } else if (againstScore >= (2*forScore)){
            response = 'The Oppostion faction has enough support ('+againstScore+'). The demand to '+gameState.demand+' should be ignored.'
        } else {
            gameState.violence = gameState.demand
            response = "Tribal society breaks down as VIOLENCE is required to settle the issue of "+gameState.demand+"\n The demand is lost in the conflict."
        }
        console.log("The demand has been resolved.  Deleting: "+gameState.demand)
        delete gameState['demand']
        for (playerName in gameState['population']){
            delete gameState['population'][playerName]['faction']
        }
        console.log("Deleted: "+gameState.demand)
    }
    text.addMessage(gameState, "tribe",  response)
}
module.exports.getFactionResult = getFactionResult

function displayFaction(faction){
    message = '';
    names = []
    if (faction.length < 1){
        return "Nobody is "
    } else if (faction.length == 1){
        return faction[0].name +' is ';
    }
    for (person of faction){
        names.push(person.name)
    }
    message = names.join(', ')
    message += ' are '
    return message
}
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
    if (!attacker ){
        console.log('Bad attacker for resolveSingleAttack')
        return 'No attacker gives no result\n'
    }
    if (!defender){
        console.log('Bad defender for resolveSingleAttack attacker was '+attacker.name)
        return 'No defender gives no result\n'
    }
    bonus = computeBonus(attacker, defender);
    netRoll = roll + bonus;
    response = attacker.name +' attacks '+defender.name+'['+roll+'+'+bonus+']  '
    if ("hits" in defender ){
    } else {
        if (defender.isInjured ){
            defender.hits = Number(1)
        } else {
            defender.hits = Number(0)
        }
    }
    if (netRoll >= 8){
        response += 'A hit!  '
        defender.hits = Number(defender.hits)+1
    } else {
        return response +'A miss!\n'
    }
    if (defender.hits == 1 ){
        defender.isInjured = 3
        response += defender.name+' is injured!'
    }
    if (defender.hits == 2){
        defender.isInjured = 3
        defender.strength = 'weak'
        response += defender.name+' is crippled, and becomes Weak!'
    }
    gameState.population[defender.name] = defender
    if (defender.hits >= 3){
        response += defender.name+' is killed!'
        killlib.kill(defender.name, 'killed by '+attacker.name+' over '+gameState.violence, gameState)
    }
    return response+'\n';
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
        response = 'The following players still need to chose between !attack <name>, !run, or !defend: '
        response += undecided.join(',')
        return response;
    }
    if (attackers.length == 0){
        response = 'The violence has ended.  Nobody is still willing to attack anyone about '+gameState.violence
        delete gameState.violence
        for (playerName in population){
            player = population[playerName]
            delete player.strategy
            delete player.escaped
            delete player.attack_target
            delete player.hits
        }
        return response;
    }
    defenderTargets = {}
    for (attackerName of attackers){
        attacker = population[attackerName]
        targetName = attacker.attack_target
        if (defenderTargets[targetName]){
            //console.log(' defenderTargets adds '+attackerName)
            defenderTargets[targetName].push(attackerName)
        } else {
            //console.log(' defenderTargets initialized with '+attackerName)
            defenderTargets[targetName] = [attackerName]
        }
    }
    // giving defenders first strike, in case attack makes someone weak
    for (defenderName in defenderTargets){
        attackers = defenderTargets[defenderName]
        var randomIndex =  Math.trunc( Math.random ( ) * attackers.length )
        targetName = attackers[randomIndex]
        //console.log('defender first strike vs '+attackerName)
        attacker = pop.memberByName(defenderName, gameState);
        if (attacker && attacker.strategy == "defend"){
            defender = pop.memberByName(targetName, gameState);
            roll = dice.roll(2)
            response += resolveSingleAttack(attacker, defender, roll, gameState);
        }
    }
    for (attackerName of attackers){
        attacker = pop.memberByName(attackerName, gameState);
        if (!attacker){
            // Defender first strike wins
            continue
        }
        targetName = attacker.attack_target
        defender = pop.memberByName(targetName, gameState);
        //console.log(attackerName+' attacks '+targetName)
        roll = dice.roll(2)
        response += resolveSingleAttack(attacker, defender, roll, gameState)
    }
    for (playerName of runners){
        runner = population[playerName]
        // can die before you run
        if (runner){
            runner.escaped = true;
            response += playerName+' runs away from the fighting.\n'
            delete runner.strategy 
        }
    }
    // reset the strategies
    for (playerName in population){
        player = population[playerName]
        delete player.strategy
        delete player.attack_target
    }
    response += '\nA round of combat has ended.  Everyone who has not escaped needs to choose a strategy'

    text.addMessage(gameState, "tribe", response)
    if (moreFactionViolenceRequired(gameState)){
        // this should stop recursing if nobody wants to fight anymore.  I hope.
        resolveViolence(gameState);
    }
}
module.exports.resolveViolence = resolveViolence

