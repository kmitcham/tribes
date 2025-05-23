const locations = require('./locations.json');
const dice = require('./dice')
const text = require('./textprocess')


//module.exports.hunt = (playername, player, rollValue, gameState) =>{
//    function gather(playername, player, rollValue,gameState){
module.exports.gather = (playername, player, rollValue, gameState) => {
    var message = playername+' gathers [roll '+rollValue+']';
	var netRoll = rollValue
	modifier = 0
    if (gameState.seasonCounter%2 == 0){
		message+= '-season '
		modifier -= 3
    }
	
	if (!("profession" in player ) || !player.profession.startsWith('g')){
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
			return message +' is guarding too many children to gather.'
		}
	}
	if (player.strength){
		if (player.strength.toLowerCase() == 'strong'.valueOf()){
			message +='(strong)'
			modifier += 1
		} else if (player.strength.toLowerCase() == 'weak'.valueOf()) {
			message += '(weak)'
			modifier -= 1
		}
	}
	netRoll = rollValue + modifier
	console.log('gather roll:'+rollValue+' mod:'+modifier+' net:'+netRoll)
	gatherData = locations[gameState.currentLocationName]['gather']
	var get_message = ''
	var getFood = 0
	var getGrain = 0
	for (var i = 0; i < gatherData.length; i++){
		if (netRoll < gatherData[0][0]){
			get_message =  gatherData[0][3] +' ('+((gatherData[0][1]+gatherData[0][2])+')')
			getFood = gatherData[0][1]
			getGrain = gatherData[0][2]
			break
		} else if (netRoll == gatherData[i][0]){
			getFood = gatherData[i][1]
			getGrain = gatherData[i][2]
			get_message = gatherData[i][3] +' ('+((gatherData[i][1]+gatherData[i][2])+')')
			break
		} else {
			getFood = gatherData[i][1]
			getGrain = gatherData[i][2]
			get_message = gatherData[i][3] +' ('+((gatherData[i][1]+gatherData[i][2])+')')
		}
	}
	message += get_message
	player.food += getFood
	player.grain += getGrain
	gameState.foodAcquired += getFood + getGrain;
	if (player.basket > 0){
		var broll = dice.roll(3)+modifier
		message+= ' basket: ['+broll+']'
		netRoll = broll+modifier
		console.log('modified basket roll '+netRoll)
		for (var i = 0; i < gatherData.length;i++){
			if (netRoll < gatherData[0][0]){
				get_message =  gatherData[0][3] +' ('+((gatherData[0][1]+gatherData[0][2])+')')
				getFood = gatherData[0][1]
				getGrain = gatherData[0][2]
				break
			} else if (netRoll == gatherData[i][0]){
				getFood = gatherData[i][1]
				getGrain = gatherData[i][2]
				get_message = gatherData[i][3] +' ('+((gatherData[i][1]+gatherData[i][2])+')')
				break
			} else {
				getFood = gatherData[i][1]
				getGrain = gatherData[i][2]
				get_message = gatherData[i][3] +' ('+((gatherData[i][1]+gatherData[i][2])+')')
			}
			}
		message += get_message
		player.food += getFood
		player.grain += getGrain
		// check for basket loss
		if (dice.roll(1) <= 2){
			message+= ' basket breaks.'
			player.basket -= 1
		}
	}
	player.activity = 'gather'    
	player.worked = true;
	text.addMessage(gameState, "tribe", message )
	return message
}
