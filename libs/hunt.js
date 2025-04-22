const locations = require('./locations.json');
const dice = require("./dice")
const text = require("./textprocess")
const pop = require("./population");

const locationDecay = [30, // arrays count from 0 so add extra item
    30,30,30,17,17,
    15,15,14,14,13,
    13,12,12,11,11,
    10,10,9,9,8]
module.exports.locationDecay = locationDecay

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
    if (!("profession" in player ) || !player.profession.startsWith('h')){
        message+= '-skill '
		modifier -= 3
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
        console.log(' hunt with netRoll '+netRoll+' capped at '+hunt_cap+' since the gameTrack was '+gameTrack)
    }
    if (netRoll > 18){
        netRoll = 18
    }
    if ( (rollValue+strMod < 6) || (rollValue+strMod < 7 && player.profession != 'hunter') ){
		if ((rollValue+strMod) == 3){
            message += '\nSevere Injury!\n'
            if (player.strength && player.strength == 'strong'){
				delete person.strength
				message += player.name+ ' is reduced to average strength.'
			} else {
				player.strength = 'weak'
				message+= player.name +' becomes weak.'
			}
        } else {
            message += '\nInjury!'
        }
		player.isInjured = 4
	} else if (netRoll <= 8){
        message += "\nNo game."
    } else {
        huntRow = huntDataFor(huntData, netRoll);
        message += "\n\t"+huntRow[2] + ' +'+huntRow[1]+' food'
        player.food += huntRow[1]
        gameState.foodAcquired += huntRow[1]
    }
    // check for spearhead loss
    const breakRoll = dice.roll(1);
    if (player.spearhead > 0 && breakRoll <= 2){
        player.spearhead -= 1
        message += '\n The spearhead broke! (roll '+breakRoll+')'
    }

    player.worked = true
    // update the game track
    gameState.gameTrack[gameState.currentLocationName] += 1
    message += '\nThe game track goes from '+gameTrack+' to '+gameState.gameTrack[gameState.currentLocationName]

    player.activity = 'hunt'
    player.worked = true;
    gameState.saveRequired= true;
    text.addMessage(gameState, "tribe", message);
    pop.history(player.name, message, gameState)
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
        response += '\t\t'+entry[3]+'('+(Number(entry[1])+Number(entry[2]))+') \t\t(roll '+entry[0]+')\n'
    }
    response += '\tHunt:  Game Track: '+gameState.gameTrack[locationName]+'\n'
    for (var index in locationData['hunt']){
        entry = locationData['hunt'][index]
        capValue = locationDecay[gameState.gameTrack[locationName]]
        //console.log(' index is '+index+" entry is "+entry+' capValue is '+capValue+' trackValue was '+gameState.gameTrack[locationName]  )
        if (entry[0] > capValue ){
            response += '\t\t (game track capped)\n'
            break;
        }
        response += '\t\t'+entry[2]+'('+entry[1]+') \t\t(roll '+entry[0]+')\n'
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
        response += '\n'+locationName
            + '      food:\t' +totals[locationName][GATHER]
            + '\t   grain:\t' +totals[locationName][GRAIN]
            + '\tstrong.f:\t' +totals[locationName][GATHER_STRONG] 
            + '\tstrong.g:\t' +totals[locationName][GRAIN_STRONG] 
            + '\t    hunt:\t' +totals[locationName][HUNT]
            + '\t   spear:\t' +totals[locationName][SPEAR]
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
        response += '\n'+locationName
            +'      food:' +Math.round(10*totals[locationName][GATHER]/MAX)
            +'\t   grain:' +Math.round(10*totals[locationName][GRAIN]/MAX)
            +'\tstrong f:' +Math.round(10*totals[locationName][GATHER_STRONG]/MAX)
            +'\tstrong g:' +Math.round(10*totals[locationName][GRAIN_STRONG]/MAX)
            +'\t    hunt:' +Math.round(10* totals[locationName][HUNT]/MAX)
            +'\t   spear:' +Math.round(10* totals[locationName][SPEAR]/MAX)
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