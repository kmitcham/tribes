const locations = require('./locations.json');
const util = require("./util.js");

// in the ideal world, these are imports
function roll(count){
    if (!count){
        count = 3
    }
    total = 0
    for (var i = 0; i < count; i++){
        var roll = Math.trunc( Math.random ( ) * 6)+1
        total += roll
    }
    if (total == 0){
        console.log(' BAD roll zero')
    }
    return total
}
const locationDecay = [30, // arrays count from 0 so add extra item
    30,30,30,17,17,
    15,15,14,14,13,
    13,12,12,11,11,
    10,10,9,9,8]
module.exports.locationDecay = locationDecay

//TODO: rewrite this to do seperate checks for injury( rollValue+strong, assistants)
	//  and success (if rollValue >9, add spearpoint)
	//1) Do a roll.  Remember the 'natural' result
	// 2) Modify the roll for strength
	// 3) Check for injury.  If injury, apply injury, then skip to 7
	// 4) Modify the roll for non-hunter, weakness, season
	// 5) Modify the roll for assistants, and assistant's spearheads, with a maximum of +3 
	// 5) if 'natural' >= 9, add the hunter's spearhead and remember that it was 'used'
	// 6) if the modified roll >= 9, give the appropriate food
	// 7) Check for damage to any assistant's spearheads
	// 8) if the hunters spearhead was 'used', check for damage to it.(edited)
	// [1:33 PM]
	// @webbnh, yes, strong is applied before checking for injury, but weakness, season, non-hunter, etc are not.

module.exports.hunt = (playername, player, rollValue, gameState) =>{
	player.worked = true
	mods = 0
	message = playername+' goes hunting. ['+rollValue+']'
	// injury check
	strMod = 0
	if (player.strength && player.strength.toLowerCase() == 'strong'.valueOf()){
        strMod = 1
        message+=(' +strong ')
	} 
    var modifier = Number(strMod)
    if (player.strength && player.strength.toLowerCase() == 'weak'.valueOf()){
        modifier -= 1
        message+=' -weak '
    }
    if (gameState.seasonCounter%2 == 0){
		message+= '-season '
		modifier -= 1
    }
    if (player.profession != 'hunter'){
        message+= '-skill '
		modifier -= 3
    }
    if (player.bonus && player.bonus >0 ){
		player.bonus = Math.trunc(player.bonus)
		if (player.bonus > 3){
			modifier += 3
		} else {    
			modifier += player.bonus
		}
		message += ' (with '+player.helpers+')'
    }
    if (player.spearhead > 0 && rollValue >= 9){
        modifier += 3
        message+= '+spearhead '
    }
    netRoll = Number(rollValue)+modifier
    gameTrack = gameState.gameTrack[gameState.currentLocationName]
    hunt_cap = locationDecay[gameTrack]
    huntData = locations[gameState.currentLocationName]['hunt']
    if (netRoll > hunt_cap){
        netRoll = hunt_cap
        message += ' -game track '
        console.log('hunt with netRoll '+netRoll+' capped at '+hunt_cap+' since the gameTrack was '+gameTrack)
    }
    if (netRoll > 18){
        netRoll = 18
    }
    if ( (rollValue+strMod < 6) || (rollValue+strMod < 7 && player.profession != 'hunter') ){
		if ((rollValue+strMod) == 3){
            message += 'Severe Injury!'
            if (player.strength && player.strength == 'strong'){
				delete person.strength
				message += player.name+ ' is reduced to average strength.'
			} else {
				player.strength = 'weak'
				message+= player.name +' becomes weak.'
			}
        } else {
            message += ' Injury!'
        }
		player.isInjured = 4
	} else if (netRoll <= 8){
        message += "  No game."
    } else {
        huntRow = huntDataFor(huntData, netRoll);
        message += huntRow[2] + ' +'+huntRow[1]+' food'
        player.food += huntRow[1]
    }
    // update the game track
    var huntercount = 1
    if (player.helpers ){
        huntercount += Math.min(player.helpers.length,3)
    }
    // check for spearhead loss
    if (player.spearhead > 0 && roll(1) <= 2){
        player.spearhead -= 1
        message += ' (the spearhead broke!)'
    }
    var oldTrack = gameState.gameTrack[gameState.currentLocationName]
    gameState.gameTrack[gameState.currentLocationName] += huntercount
    message += ' The game track goes from '+oldTrack+' to '+gameState.gameTrack[gameState.currentLocationName]
    // clear the stuff for group hunting
    if (player.bonus){
        delete player.bonus
    }
    if (player.helpers){
        delete player.helpers 
    }
    util.history(player.name, message, gameState)
    return message
}

const huntDataFor= (huntData, netRoll) =>{
    for (var i = 0; i < huntData.length; i++){
        if (netRoll <= huntData[i][0]){
            return huntData[i]
        }
    }
    return huntData[huntData.length-1]
}
module.exports.huntDataFor = huntDataFor;

function getScoutMessage(otherLocation, gameState){
    locationName = gameState.currentLocationName
    if (otherLocation){
        locationName = otherLocation
    }
    var season = 'warm season.'
    if (util.isColdSeason(gameState)){
        season = 'cold season.'
    }
    response = 'The '+locationName+' '+season+' resources are:\n'
    locationData = locations[locationName]
    if (!locationData){
        return 'Valid locations are: '+Object.keys(locations)
    }
    response += '\tGather:\n'
    for (var index in locationData['gather']){
        entry = locationData['gather'][index]
        response += '\t\t'+entry[3]+'('+(Number(entry[1])+Number(entry[2]))+') roll '+entry[0]+'\n'
    }
    response += '\tHunt:  Game Track:'+gameState.gameTrack[locationName]+'\n'
    for (var index in locationData['hunt']){
        entry = locationData['hunt'][index]
        capValue = locationDecay[gameState.gameTrack[locationName]]
        //console.log(' index is '+index+" entry is "+entry+' capValue is '+capValue+' trackValue was '+gameState.gameTrack[locationName]  )
        if (entry[0] > capValue ){
            response += '\t\t (game track capped)\n'
            break;
        }
        response += '\t\t'+entry[2]+'('+entry[1]+')\n'
    }
    return response
}
module.exports.getScoutMessage = getScoutMessage;
