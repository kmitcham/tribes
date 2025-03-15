//////////////////////////////////////////////////////////
/////  WORK SECTION   
/////////////////////////////////////////////////////////
function gather(playername, player, rollValue,gameState){
	var message = ' gathers (roll='+rollValue+')';
	var netRoll = rollValue
	modifier = 0
	if (gameState.seasonCounter%2 == 0){
		message+= '(-3 season)  '
		modifier -= 3
	}
	if ( player.profession != 'gatherer'){
		message+=('(-3 skill) ')
		modifier -= 3
	}
	if (player.guarding){
		guardCount = player.guarding.length
		if (guardCount == 3){
			message+= '(-2 kids) '
			modifier-= 2
		}
		if (guardCount == 4){
			message+= '(-4 kids) '
			modifier-= 4
		}
		if (guardCount > 4){
			console.log(' gather with more than 4 kids should not happen')
			return ' fails to get anything, too many kids in the way'
		}
	}
	if (player.strength){
		if (player.strength.toLowerCase() == 'strong'){
			modifier += 1
		} else if (player.strength.toLowerCase() == 'weak') {
			modifier -= 1
		} else {
			console.log(playername+' has an invalid strength value '+player.strength)
		}
	}
	netRoll = rollValue + modifier
	console.log('gather roll:'+rollValue+' mod:'+modifier+' net:'+netRoll)
	gatherData = locations[gameState.currentLocationName]['gather']
	var get_message = ''
	var getFood = 0
	var getGrain = 0
    var targetData = gatherDataFor(gameState.currentLocationName, netRoll)
    getFood = targetData[1]
	getGrain = targetData[2]
	get_message = targetData[3] +' ('+((targetData[1]+targetData[2])+')')
	message += get_message
	player.food += getFood
	player.grain += getGrain
	gameState.foodAcquired += getFood + getGrain;
	if (player.basket > 0){
		var broll = roll(3)+modifier
		message+= ' basket: ('+broll+')'
		netRoll = broll+modifier
        console.log('modified basket roll '+netRoll)
        var targetData = gatherDataFor(gameState.currentLocationName, netRoll)
        getFood = targetData[1]
        getGrain = targetData[2]
        get_message = targetData[3] +' ('+((targetData[1]+targetData[2])+')')
        message += get_message
        player.food += getFood
        player.grain += getGrain
		gameState.foodAcquired += getFood + getGrain;
            // check for basket loss
		if (roll(1) <= 2){
			message+= ' basket breaks.'
			player.basket -= 1
		}
	}
	player.worked = true
	return message
}
function craft(playername, player, type, rollValue){
	console.log('craft type'+type+' roll '+rollValue)
	player.worked = true
	if (type.startsWith('spear')){
		type = 'spearhead'
	}
	if (player.profession != 'crafter'){
		rollValue -= 1
	}
	if (rollValue > 1 && type == 'basket'){
			player.basket += 1
	} else if (rollValue > 2 && type == 'spearhead') {		
			player.spearhead += 1
	} else {
		return playername+ ' fails at crafting a '+type
	}
	return playername+' crafts a '+type
}
function assist(playername, player, helpedPlayer){
	player.worked = true
	bonus = 0
	if (player.spearhead > 0){
		bonus += 1
	}
	if (player.profession == 'hunter'){
		bonus += 1
	} else {
		bonus += 0.5
	}
	if (helpedPlayer.bonus ){
		helpedPlayer.bonus += bonus
	} else {
		helpedPlayer.bonus = bonus	
	}
	if (!helpedPlayer.helpers){
		helpedPlayer.helpers = [playername]
	} else {
		helpedPlayer.helpers.push(playername)
	}
	return ' goes hunting to assist '
}
// this should be deleted?
function hunt(playername, player, rollValue){
	console.error("deprecated hunting in work.js called")
	player.worked = true
	mods = 0
	message = ' goes hunting. '
	console.log(player+' hunt '+rollValue)
	var modifier = 0
	if ( player.profession != 'hunter'){
		message+=('(-3 skill) ')
		modifier -= 3
	}
	if (player.strength){
		if (player.strength.toLowerCase() == 'strong'){
			modifier += 1
		} else if (player.strength.toLowerCase() == 'weak') {
			modifier -= 1
		} else {
			console.log(playername+' has an invalid strength value '+player.strength)
		}
	}
	if (isColdSeason()){
		message+= '(-1 season) '
		modifier -= 1
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
		message+= '(spearhead)'
	}
	message += '(rolls a '+rollValue+' ) '
	if (rollValue < 7){
		console.log('hunt under 7')
		// injury section
		if (rollValue == 6){
			if (player.profession != 'hunter'){
				message += 'Injury!'
				player.isInjured = true
			}
		} else if (rollValue ==3 ){
			message += 'Crippling injury!'
			player.isInjured = true
			if (player.strength = 'strong'){
				delete player.strength
			} else {
				player.strength = 'weak'
			}
		} else {
		// TODO: make this also possibly inure the helpers
			message += 'Injury!'
			player.isInjured = true
		}
	} else if (rollValue == 7 || rollValue == 8){
		message += ' no luck'
	} else {
		// rewards section
		netRoll = rollValue + modifier
		console.log('hunt netRoll '+netRoll)
		if (netRoll > locationDecay[locations[gameState.currentLocationName]['game_track']]){
			message += ' (no '+huntData[netRoll][2]+' tracks )'
			netRoll = locationDecay[locations[gameState.currentLocationName]['game_track']]
		}
		if (netRoll > 18){
			netRoll = 18
		}
		huntData = locations[gameState.currentLocationName]['hunt']
		for (var i = 0; i < huntData.length; i++){
			if (netRoll <= huntData[i][0]){
				message += huntData[i][2] + ' +'+huntData[i][1]+' food';
				player.food += huntData[i][1];
				gameState.foodAcquired += huntData[i][1];
				break
			}
		}
	}
	// update the game track
	var huntercount = 1
	if (player.helpers ){
		huntercount += Math.min(player.helpers.length,3)
	}
	// check for spearhead loss
	if (player.spearhead > 0 && roll(1) <= 2){
		player.spearhead -= 1
		message += '(the spearhead broke)'
	}
	var oldTrack = gameState.gameTrack[gameState.currentLocationName]
	gameState.gameTrack[gameState.currentLocationName] += huntercount
	console.log('Game Track for '+gameState.currentLocationName+' advanced from '+oldTrack+' to '+gameState.gameTrack[gameState.currentLocationName])
	// clear the stuff for group hunting
	if (player.bonus && player.bonus != 0){
		player.bonus = 0
	}
	if (player.helpers){
		player.helpers = []
	}
	return message
}

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

// this is used by Ready
function listReadyToWork(population){
	var unworked = []
	for (playerName in population){
		person = population[playerName]
		// edit can leave isinjured as the string 'false'
		if (person.worked || (person.isInjured && person.isInjured > 0)
			||(person.isSick && person.isSick > 0 )){
			// do nothing
		} else {
			unworked.push(playerName)
		}
	}
	return unworked
}
module.exports.listReadyToWork = listReadyToWork;

function canWork(gameState, player){

	if (gameState.workRound == false ){
		msg = 'Can only work during the work round';
		return msg;
	}
	if (player == null){
		msg = 'Only tribe members can work.  Maybe !join';
		return msg;
	}
	if (player.isInjured && player.isInjured > 0 ){
		msg = 'You cannot work while you are injured';
		return msg;
	}
	if (player.isSick && player.isSick > 0 ){
		msg = 'You cannot work while you are sick'
		return msg;
	}
	if (player.worked == true){
		msg = 'You cannot work (again) this round'
		return msg;
	}
	return null;
}
module.exports.canWork = canWork;
