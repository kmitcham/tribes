const locations = require('./locations.json');
const dice = require("./dice")
const text = require("./textprocess")

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
    if (!player.profession.startsWith('h')){
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
    var oldTrack = gameState.gameTrack[gameState.currentLocationName]
    gameTrack = gameState.gameTrack[gameState.currentLocationName]
    message += ' The game track goes from '+oldTrack+' to '+gameState.gameTrack[gameState.currentLocationName]
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
    var huntercount = 1
    if (player.helpers ){
        huntercount += Math.min(player.helpers.length,3)
    }
    // check for spearhead loss
    if (player.spearhead > 0 && dice.roll(1) <= 2){
        player.spearhead -= 1
        message += ' (the spearhead broke!)'
    }

    player.worked = true
    // update the game track
    gameState.gameTrack[gameState.currentLocationName] += huntercount

    // clear the stuff for group hunting
    if (player.bonus){
        delete player.bonus
    }
    if (player.helpers){
        delete player.helpers 
    }
    text.addMessage(gameState, "tribe", message)
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
    if (gameState.seasonCounter%2 == 0){
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

function scoutNerd(gameTrack){
    var gameTrack=0
    if (bits[1]){
        gameTrack= Number(bits[1])
    }
    GATHER = 0
    GATHER_STRONG = 1
    GRAIN = 2
    GRAIN_STRONG = 3
    HUNT = 4
    SPEAR = 5
    var totals = {
        'veldt':[0,0,0,0,0,0,0],
        'hills':[0,0,0,0,0,0,0],
        'marsh':[0,0,0,0,0,0,0],
        'forest':[0,0,0,0,0,0,0]
    }
    for (var i =1; i <= 6; i++){
        for (var j =1; j <= 6; j++){
            for (var k =1; k <= 6; k++){
                droll = i+j+k
                if (droll > huntlib.locationDecay[gameTrack]){
                    droll = huntlib.locationDecay[gameTrack]						
                }
                for (locationName in totals){
                    locationData = locations[locationName]
                    data = gatherDataFor(locationName, droll)
                    totals[locationName][GATHER]+= data[1]
                    totals[locationName][GRAIN]+= data[2]
                    totals[locationName][HUNT]+= huntlib.huntDataFor(locationData['hunt'], droll)[1]
                    sval = droll
                    if (droll >= 9){	sval = droll+3 }
                    totals[locationName][SPEAR]+= huntlib.huntDataFor(locationData['hunt'], sval)[1]
                    dataStrong = gatherDataFor(locationName, droll+1)
                    totals[locationName][GATHER_STRONG]+= dataStrong[1]
                    totals[locationName][GRAIN_STRONG]+= dataStrong[2]
                    
                }
            }
        }
    }
    response = '216 totals:'
    for (locationName in totals){
        response += '\n'+locationName+' food:'+totals[locationName][GATHER]
            + '\tgrain:'+totals[locationName][GRAIN]
            + '\tsf:'+totals[locationName][GATHER_STRONG] 
            + '\tsg:'+totals[locationName][GRAIN_STRONG] 
            + '\thunt:'+totals[locationName][HUNT]
            + '\tspear:'+totals[locationName][SPEAR]
    }
    msg.author.send(response)
    totals = {
        'veldt':[0,0,0,0,0,0],
        'hills':[0,0,0,0,0,0],
        'marsh':[0,0,0,0,0,0],
        'forest':[0,0,0,0,0,0]
    }
    MAX = 6000
    for (var i = 0; i < MAX; i++){
        val = dice.roll(3)
        if (val > huntlib.locationDecay[gameTrack]){
            val = huntlib.locationDecay[gameTrack]						
        }
        for (locationName in totals){
            locationData = locations[locationName]
            data = gatherDataFor(locationName, val)
            totals[locationName][GATHER]+= data[1]
            totals[locationName][GRAIN]+= data[2]
            totals[locationName][HUNT]+= huntlib.huntDataFor(locationData['hunt'], val)[1]
            sval = val
            if (val >= 9){	sval = val+3 }
            foo = huntlib.huntDataFor(locationData['hunt'], sval)
            totals[locationName][SPEAR]+= foo[1]
            dataStrong = gatherDataFor(locationName, val+1)
            totals[locationName][GATHER_STRONG]+= dataStrong[1]
            totals[locationName][GRAIN_STRONG]+= dataStrong[2]
        }
    }
    response = MAX+'x Random avg:'
    for (locationName in totals){
        response += '\n'+locationName+'food:'+Math.round(10*totals[locationName][GATHER]/MAX)
                                    +'\tgrain:'+Math.round(10*totals[locationName][GRAIN]/MAX)
                                    +'\tsf:'  +Math.round(10*totals[locationName][GATHER_STRONG]/MAX)
                                    +'\tsg:'  +Math.round(10*totals[locationName][GRAIN_STRONG]/MAX)
                                    +'\thunt:'+Math.round(10* totals[locationName][HUNT]/MAX)
                                    +'\tspear:'+Math.round(10* totals[locationName][SPEAR]/MAX)
    }
}
module.exports.getScoutNerd = scoutNerd;

function gatherDataFor(locationName, roll){
	resourceData = locations[locationName]['gather']
	maxRoll = resourceData[resourceData.length-1][0]
	minRoll = resourceData[0][0]
	if (roll > maxRoll){
		roll = maxRoll
	}
	if (roll < minRoll){
		roll = minRoll
	}
	for (var i=0; i < resourceData.length; i++){
		if (resourceData[i][0] == roll){
			return resourceData[i]
		}
	}
	console.log('error looking up resourceData for '+locationName+' '+type+' '+roll)
}