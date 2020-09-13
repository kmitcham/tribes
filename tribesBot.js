var Discord = require('discord.js');
var bot = new Discord.Client()
var logger = require('winston');
const { ExceptionHandler } = require('winston');
const fs = require('fs');
const { resolve } = require('path');
const { ConsoleTransportOptions } = require('winston/lib/winston/transports');

let rawdata = fs.readFileSync('./auth.json');
let auth = JSON.parse(rawdata);

const types = ['food', 'grain', 'basket', 'spearhead']
const professions= ['hunter','gatherer', 'crafter']
const member_properties = ['canCraft','isNursing','isPregnant','isInjured','guarding','profession','gender','partner','worked','food','grain', 'handle']
const genders = ['male','female']

var population = require('./population.json')
var children = require('./children.json');
var referees = require('./referees.json');
var locations = require('./locations.json');
var seasonCounter = 1;
var currentLocationName = "veldt";
var workRound = true;
var foodRound = false;
var reproductionRound = false;

function isColdSeason(){
	return (seasonCounter%2 == 0);
}
function getYear(){
	return seasonCounter/2;
}
function nextSeason(){
	seasonCounter += 1
	if (isColdSeason()){
		for (locationName in locations){
			modifier = locations[locationName]['game_track_recover']
			oldTrack = locations[locationName]['game_track']
			locations[locationName]['game_track'] -= modifier
			console.log(locationName+' game_track moves from '+oldTrack+' to '+locations[locationName]['game_track'])
		}
	}
}

bot.on('message', msg => {
  if (!msg.content ){
	return
  }
  if (msg.content.substring(0,1) != '!'){
	return
  }
  processMessage(msg)
});


function saveGameState(){
	fs.writeFile("population.json", JSON.stringify(population), err => { 
		// Checking for errors 
		if (err) throw err;  
		console.log("Done saving population"); // Success
	}); 
	
	fs.writeFile("children.json", JSON.stringify(children), err => { 
		// Checking for errors 
		if (err) throw err;  
		console.log("Done writing children"); // Success \
	}); 
	fs.writeFile("referees.json", JSON.stringify(referees), err => { 
		// Checking for errors 
		if (err) throw err;  
		console.log("Done writing referees"); // Success \
	}); 
}

function processMessage(msg){
	author = msg.author
	actor = author.username
	bits = msg.content.split(' ')
	command = bits[0]
	command = command.toLowerCase().substring(1) // strip out the leading !
	console.log('command:'+command+' bits:'+bits+' actor:'+actor )  

	if (command == 'join'){
		 addToPopulation(msg, author, bits, actor, author)
	}
	if (!population[actor]  && !referees.includes(actor)){
		msg.author.send('You must join the tribe use commands: join <hunter|gatherer|crafter> <male|female> ')
		// disabled for alpha testing
		// return
	}
	player = population[actor]
	handleCommand(msg, author, player,  command, bits)

	return	
}

function personByName(name){
	if (population[name] != null){
		return population[name]
	}
	console.log("No such person in population:"+name)
	return null
}
function displayPlayer(player){
	message = ""
	if (! player.gender){
		console.log('bad player display')
		return "buggy player has no gender"
	}
	message += "gender:"+ player.gender
	message += " profession:"+ player.profession
	message += "gender:"+ player.gender
	message += "gender:"+ player.gender
	big_message = ''
	message =  'player has'
	for (var type in player) {
		if (Object.prototype.hasOwnProperty.call( player, type)) {
			message+= '\n\t '+type+' '+player[type]
		}
	}
	big_message += message +'\n'
	return big_message
}

function roll(count){
		if (!count){
			count = 3
		}
		total = 0
		for (var i = 0; i < count; i++){
			var roll = Math.trunc( Math.random ( ) * 6)+1
			total += roll
		}
		return total
}
function handleCommand(msg, author, player, command, bits){
	// list commands
	if (command === 'help'){
		text = ''
		text+='Player commands\n'
		text+=' give <amt> <food|grain|spearhead|basket> <player>\n'
		text+=' feed <amt> <food|grain> <childNumber>\n'
		text+=' list (show inventory and character info)\n'
		text+=' children (shows the children ages and food status)\n'
		text+='-=Work Phase Commands=-'
		text+=' hunt <with @target>'
		text+=' gather'
		text+=' craft <spearhead|basket>'
		msg.author.send( text)

		if (referees.includes(actor)){
			text = '<amt> <food|grain|spearhead|basket> <player>\n'
			text+='\nReferee Commands\n'
			text+=' edit target <canCraft|isNursing|isPregnant|profession|gender|partner|work|food|grain> <value>\n' 
			text+=' award <amt> <food|grain|spearhead|basket> <player>\n'
			text+=' list <player>  (no arg lists all players)\n '
			text+=' induct|banish <player> add a member to the tribe\n'
			text+=' promote|demote <player> to the ref list\n'
			text+=' save the game file\n'
			text+=' spawn <mother> <father>  add a child with give parents\n'
			text+=' startwork (begins the work round, enabling work attempts and rolls;)'
			text+=' startfood (ends the work round; subtract food/grain; birth; child age increase)'
			text+=' startrepro ('
			msg.author.send( text)
		}

	}
	if (command == 'roll'){
		msg.reply(roll(bits[1]))
		return
	}
	// WORK ROUND COMMANDS
	if (command == 'gather' 
		|| command == 'craft'
		|| command == 'hunt'
		|| command == 'assist'
		|| command == 'train'
		){
		if (!workRound){
			msg.author.send('Can only work during the work round')
			return
		}
		if (player == null){
			msg.author.send('Only tribe members can work.  Maybe !join')
			return
		}
		if (player.isInjured == true){
			msg.author.send('you can not work while you are injured')
		}
		if (player.worked == true){
			msg.author.send('You cannot work (again) this round')
			return			
		}
		if (command == 'gather'){
			message = gather( author.username, player, roll(3))
			msg.reply( message )// this should go to the channel!
			return
		} else if (command == 'craft'){
			type = bits[1]
			if (player.canCraft == false){
				msg.author.send('You do not know how to craft')
				return
			}
			if (type != 'basket' && type != 'spearhead'){
				msg.author.send('Must craft basket or spearhead')
				return	
			}
			message = craft( author.username, player, type, roll(1))
			msg.reply( message )
			return	
		} else if (command == 'assist'){
			target = msg.mentions.users.first()
			message = assist(author.username, player, target)
			msg.reply( message )
			return	
		} else if (command == 'train'){
			msg.author.send('NOT IMPLEMENTED')
			return	
		} else if (command == 'hunt'){
			message = hunt(author.username, player, roll(3))
			msg.reply( message )
			return	
		}
	}
	if (command == 'startwork'){
		// advance the calendar
		workRound = true
		foodRound = false
		reproductionRound = false
	}
	if (command == 'startfood'){
		workRound = false
		foodRound = true
		reproductionRound = false
		// clear work flags
		clearWorkFlags(population)
	}
	if (command == 'startReproduction'){
		// actually consume food here
		workRound = false
		foodRound = false
		reproductionRound = true
	}
	if (command == 'edit'){
		if (! msg.mentions || ! msg.mentions.users){
			msg.author.send(command+' requires at least one @target')
			return
		}
		var target = msg.mentions.users.first()
		if (target instanceof Discord.User ){
			console.log('target is a user')
		} else {
			console.log('target is NOT a user')
		}
		key = bits[2]
		if (!member_properties.includes(key)){
			msg.author.send('Legal properties to set are '+member_properties)
			return
		}
		value = bits[3]
		console.log('edit '+target.username+' '+key+' '+value )
		if (population[target.username]){
			targetObj = population[target.username]
			targetObj[key] = value
			targetObj['handle'] = target
			message = target.username+ ' now has value '
			for (var type in targetObj) {
				if (Object.prototype.hasOwnProperty.call( targetObj, type)) {
					message+= ' '+type+' '+targetObj[type]
				}
			}
			msg.author.send(message)
			target.send(message)
			population[target.username] = targetObj
			return
		} else{
			msg.author.send(target.username+' is not in the tribe')
			return
		}
	}
	// save the game state to file
	if (command == 'save'){
		if (referees.includes(actor)){
			saveGameState()
			msg.author.send('game state saved')
		}
		return
	}
	// add a user to the list of referees; any ref can do this
	if (command === 'promote' ){
		if (! msg.mentions || ! msg.mentions.users){
			msg.author.send(command+' requires one @target')
			return
		}
		var target = msg.mentions.users.first()		
		console.log('promote:'+target.username+' by '+actor)
		// disble ref checking for now
		//if (target && referees.includes(actor)){
		if (target){
			if (referees.includes(target.username)){
				msg.author.send(target.username+' is already a referee')
			} else {
				referees.push(target.username)
				msg.author.send('referee list:'+referees)
			}
		} else {
			msg.author.send('No target to promote, or you lack privileges')
		}
		return 	
	}
	if (command === 'demote'){
		if (! msg.mentions || ! msg.mentions.users){
			msg.author.send(command+' requires at least one @target')
			return
		}
		var target = msg.mentions.users.first()
		if (referees.includes(target.username)){
			const index = referees.indexOf(target.username);
			if (index > -1) {
				referees.splice(index, 1);
				console.log('demoted '+target.username)
				msg.author.send('demoted '+target.username)
				return
			}
		} else{
			msg.author.send(target.username+' is not a referee:'+referees)
		}
	}
	// remove member from the tribe
	if (command === 'banish'){
		if (! msg.mentions || ! msg.mentions.users){
			msg.author.send(command+' requires at least one @target')
			return
		}
		var target = msg.mentions.users.first()
		if (target && referees.includes(actor)){
			if (population[target.username]){
				delete population[target.username]
				msg.reply(target.username+' is banished from the tribe')
				return
			}
		} else {

		}
	}
	// add a person to the tribe
  	if (command === 'induct'){
		if ( !referees.includes(actor) ){
			console.log(actor +" list:"+referees)
			msg.author.send('Only a referee can add tribe members')
			return
		}
		if (! msg.mentions || ! msg.mentions.users || ! msg.mentions.users.first()){
			msg.author.send(command+' requires at least one @target')
		return
		}
		var target = msg.mentions.users.first().username
		addToPopulation(msg, author, bits, target, msg.mentions.users.first())
		return
	}
	// give stuff to a user; refs can give unlimited amounts, others are limited.
	// targets aren't checked to make sure they are valid
	if (command === 'give'){
		if (! msg.mentions || ! msg.mentions.users || ! msg.mentions.users.first() ){
			msg.author.send(command+' requires at least one @target')
			return
		}
		if (! foodRound){
			msg.author.send(command+' happens in the food round')
			return 			
		}
		var target = msg.mentions.users.first()
		var username = target.username
		amount = bits[1]
		type = bits[2]
		
		if (isNaN(amount) || ! types.includes(type)){
			msg.author.send('Give syntax is give  <amount> <food|grain|spearhead|basket> <recipient>')
			return
		}
		if (amount <= 0  ){
			msg.author.send('Can not give negative amounts')
			return
		}			
		if (!population[username] ) {
				msg.author.send('username is not living in the tribe')
				return
		}
		if (  population[actor][type] >= amount){
			msg.reply(actor+' gave '+amount+' '+type+' to '+username)
			if (!population[username][type]){
				population[username][type] = Number(amount)
			} else {
				population[username][type] += Number(amount)
			}         
			population[actor][type] -= Number(amount)
			target.send(actor+' gave you '+amount+' '+type)
		} else {
			msg.author.send('You do not have that much '+type+': '+ population[actor][type])
		}
		return
	}
	if (command === 'award'){
		if (referees.includes(actor)){
			var target
			if (msg.mentions.users && msg.mentions.users.first() ){
				target = msg.mentions.users.first().username
			}
			amount = bits[1]
			type = bits[2]
			if (!target){ target = bits[3]}
			targetName = resolveTarget(target)
		
			if (isNaN(amount) || ! types.includes(type)){
				msg.author.send('award syntax is give  <amount> <food|grain|spearhead|basket> <recipient>')
				return
			}
			if (!population[target] ) {
				msg.author.send('target is not living in the tribe')
				return
			}
			msg.reply(actor+' awarding '+amount+' '+type+' to '+target)
			if (msg.mentions.users && msg.mentions.users.first()){
				msg.mentions.users.first().send('You earned '+amount+' '+type)
			}
			if (!population[target][type]){
				population[target][type] = Number(amount)
			} else {
				population[target][type] += Number(amount)
			}         
		} else {
			msg.author.send('Only referees can award ')
		}
		return
	}
	// how much stuff does the target have?  if used by ref with no args, list whole population
	if (command === 'list' || command == 'inventory'){
		if (bits.length == 1){
			if (referees.includes(actor)){
				big_message = ''
				for (var target in population){
					message = target +' has'
					for (var type in population[target]) {
						if (Object.prototype.hasOwnProperty.call( population[target], type)) {
							message+= ' '+type+' '+population[target][type]
						}
					}
					big_message += message +'\n'
				}
				msg.author.send(big_message)
				return
			} else {
				// list the actor
				if (population[actor]) {
					message = ''
					for (var type in population[actor]) {
						if (Object.prototype.hasOwnProperty.call( population[actor], type)) {
						message+= ' '+type+' '+population[actor][type]
						}
					}
					msg.author.send(message)
					return
				}
			}
		}
		console.log('not a simple list')
		for (var i = 1; i < bits.length; i++){
			username = resolveTarget(bits[i])
			console.log(i+' '+username)
			if ( referees.includes(actor) || actor === username){
				message = username +' stats:'
				if (population[username]) {
					for (var type in population[username]) {
						if (Object.prototype.hasOwnProperty.call( population[username], type)) {
						message+= ' '+type+' '+population[username][type]
						}
					}
				} else {
					message+=' nothing'
				}
				msg.author.send(message)
			}
		}
	
	}
	// list the children
	if (command === 'children'){
		response = ''
		response = 'There are '+children.length+' children '
		mine = 0 
		var arrayLength = children.length;
		for (var i = 0; i < arrayLength; i++) {
			child = children[i]
			if (child.dead){
				response += '('+i+' is dead)'
			} else {
				response += '(name='+i+':'
				if (referees.includes(actor) || (actor === child.mother || actor === child.father) ){
					response += children[i].mother+'+'+children[i].father
				}
				response += ' age:'+children[i].age+ ' food:'+child.food+')'
			}
		} 
		msg.author.send(response)
		return
	}
  	// add food to a child
	if (command === 'feed'){
		childIndex = bits[3]
		amount = bits[1]
		type = bits[2]
		childFood = ['food', 'grain']
		if (isNaN(amount) || !childFood.includes(type) || isNaN(childIndex) || childIndex >= children.length ){
			msg.author.send('feed syntax is give <amount> <food|grain> <childIndex #>')
			return
		}
		if (amount < 0 &&  !referees.includes(actor) ){
			msg.author.send('Only the referee can reduce amounts')
			return
		}
		if (!population[actor] && !referees.includes(actor)  ){
			msg.author.send("Children do not take food from strangers")
		}	
		if (children[childIndex].dead){
			msg.author.send('That child is dead and cannot be fed anymore')
			return
		}		
		if ( referees.includes(actor) || population[actor][type] >= amount){
			if (!children[childIndex]) {
				msg.author.send('no such child as '+childIndex)
				return
			}
			msg.reply(actor+' fed '+amount+' '+type+' to child '+childIndex)
			children[childIndex].food += Number(amount)
			population[actor].food -= Number(amount)
		} else {
			msg.author.send('You do not have that much '+type+': '+ population[actor][type])
		}
		return
	} 
	// add a child to tribe; args are parent names
	if (command === 'spawn'){
		if (bits.length != 3){
			msg.author.send('usage: !spawn mother father')
			return
		}
		var child = Object()
		if (! msg.mentions || ! msg.mentions.users){
			msg.author.send(command+' requires at least one @target')
			return
		}
		child.mother = msg.mentions.users.first().username
		child.father = msg.mentions.users.last().username
		if (!population[child.mother] || !population[child.father]){
			msg.author.send('Parents not found in tribe')
			return
		}
		if (population[child.mother].gender != 'female' || population[child.father].gender != "male"){
			msg.author.send("First parent must be female, last parent male")
			return
		}
		if (population[child.mother].isPregnant){
			msg.author.send(child.mother+' is already pregnant')
			return
		}
		child.age = -2
		child.food = 0
		children.push(child)
		index = children.length - 1
		population[child.mother].isPregnant = true
		msg.reply('Added child '+index+' with parents '+child.mother+ ' and '+child.father)
		return
	}
	if (command === 'check'){
		msg.author.send(command +'not implemmented' )
		return
	}
	// advance the clock one season.  Reduce food/grain in population, as well as for children.
	// message for every death, and remove the relevant items from the data structure. 
	// attempt to handle birth and nursing.  
	// checks breeding but does NOT add children; rolls need to be made.
	// combine similar activities into lists for easier parsing
	if (command === 'endturn') {
		if (!referees.includes(actor)) {
			return;
		}  
		consumeFood()
  	}
	
}

bot.once('ready', ()=>{
  console.log('bot is alive')
}) 

bot.login(auth['token'])

// convert the target to a string in Population, if possible
function resolveTarget(target){
	if (population[target]){
		return target;
	}
	if (target.username){
		return resolve (target.username)
	}
	console.log('not sure how to resolve this target:'+target)
	return 'elephant'
}

function doWork(message, author, bits){
	work = bits[1]
	if (! activities.includes(work)){
		message.author.message('legal work types:'+activities)
		return
	}
	if (population[actor]){
		if ('craft' === work && ! population[actor].canCraft){
			message.author.send("You will be attempting to learn to craft, if someone will teach you")
		} else {
			population[actor].work = work
			message.author.send("This season you will "+work)
		}
	}
	return
}
function clearWorkFlags(population){
	// for every person
	// if injured and !worked, injured = false
	// worked = false
	for  (var targetname in population) {
		person = population[targetname]
		if (! person){
			console.log('null person for name '+targetname)
			continue
		}
		if (person.isInjured && person.isInjured == true && person.work == false){
			// did not work means rested
			person.isInjured == false
		}
		person.work = false
	}
}
function addToPopulation(msg, author, bits, target,targetObject){
	profession = bits[1]
	gender = bits[2]
	if (!target ){
		msg.author.send('must specify: <profession> <gender> <name>')
		return
	}
	if (population[target]){
		msg.author.send(target+' is already in the tribe')
		return
	}
	if (profession === 'h'){profession = 'hunter'}
	if (profession === 'c'){profession = 'crafter'}
	if (profession === 'g'){profession = 'gatherer'}
	if (gender === 'm'){gender = 'male'}
	if (gender === 'f'){gender = 'female'}
	if ( !target || !profession || !gender || !genders.includes(gender) || !professions.includes(profession)){
		msg.author.send('usage:!induct [hunter|gatherer|crafter] [female|male] name')
		return
	}
	var person = {}
	person.gender = gender
	person.food = 10
	person.grain = 0
	person.basket = 0
	person.spearhead = 0
	person.profession = profession
	person.handle = targetObject
	person.name = target
	if (profession === 'crafter'){
		person.canCraft = true
	} else {
		person.canCraft = false
	}
	population[target] = person
	msg.reply('added '+target+' to the tribe')
}
function consumeFood(){
		console.log('adults are eating')
		response = "Food round results:\n"
		perished = []
		for  (var target in population) {
			console.log('target:'+target)
			var hunger = 4
			if (population[target].isNursing && population[target].isPregnant){
				hunger = 6
			}
			population[target].food = population[target].food - hunger
			if (population[target].food < 0 ){
				// food is negative, so just add it to grain here
				population[target].grain = population[target].grain + population[target].food
				population[target].food = 0
				if (population[target].grain < 0){
					response += "  "+target+" has starved to death.\n"
					population[target].grain = 0
					perished.push(target)
				}
			}
			console.log(target+' f:'+population[target].food+' g:'+population[target].grain)
		} 
		console.log('children are eating')
		var arrayLength = children.length;
		for (var i = 0; i < arrayLength; i++) {
			if (children[i].age < 24 && ! children[i].dead){
				children[i].food -= 2
				if (children[i].food < 0){
					response += " child:"+i+"("+children[i].mother+"+"+children[i].father+") has starved to death.\n"
					children[i].dead = true
				} else {
					children[i].age += 1
				}
				if (children[i].age == 0){
					response += children[i].mother+' gives birth to '+i+' 3d:5+'
					if (population[children[i].mother] && population[children[i].mother].isPregnant){
						population[children[i].mother].isPregnant = false
						population[children[i].mother].isNursing = true
					}
				}
				if (children[i].age == 4){ // 2 years in SEASONS
					if (population[children[i].mother] && population[children[i].mother].isNursing){
						population[children[i].mother].isNursing = false
					}
				}
			}
		}
		// clean up the dead
		var perishedCount = perished.length;
		for (var i = 0; i < arrayLength; i++) {
    		corpse = perished[i]
			console.log('removing corpse '+corpse)
			delete population[corpse]
		}
		msg.reply(response)
		return

}

//////////////////////////////////////////////////////////
/////  WORK SECTION   
/////////////////////////////////////////////////////////
function gather(playername, player, roll_value){
	var message = ' gathers ';
	netRoll = roll_value
	modifier = 0
	if (isColdSeason()){
		message+= '(-3 season) '
		modifier -= 3
	}
	if ( player.profession != 'gatherer'){
		message+=('(-3 skill)')
		modifier -= 3
	}
	netRoll = roll_value + modifier
	console.log('gather roll:'+roll_value+' mod:'+modifier+' net:'+netRoll)
	gatherData = locations[currentLocationName]['gather']
	for (var i = 0; i < gatherData.length; i++){
		if (netRoll <= gatherData[i][0]){
			message += gatherData[i][3]
			player.food += gatherData[i][1]
			player.grain += gatherData[i][2]
			break
		}
	}
	if (player.basket > 0){
		var broll = roll(3)+modifier
		message+= ' basket:'
		for (var i = 0; i < gatherData.length;i++){
			if (netRoll <= gatherData[i][0]){
				message += gatherData[i][3]
				player.food += gatherData[i][1]
				player.grain += gatherData[i][2]
				break
			}
		}
		// check for basket loss
		if (roll(1) == 1){
			message+= ' basket broke!'
			player.basket -= 1
		}
	}
	player.worked = true
	return message
}
function craft(playername, player, type, roll_value){
	console.log('type'+type+' roll '+roll)
	player.worked = true
	if (roll != 1) {
		if (type == 'basket'){
			player.basket += 1
		} else {
			player.spearhead += 1
		}
		return ' crafts a '+type
	}
	return 'crafts a worthless '+type
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
	return ' goes hunting to assist '+helpedPlayer
}
function hunt(playername, player, roll_value){
	player.worked = true
	mods = 0
	message = ' goes hunting '
	var modifier = 0
	if ( player.profession != 'hunter'){
		message+=('(-3 skill)')
		modifier -= 3
	}
	if (isColdSeason()){
		message+= '(-1 season) '
		modifier -= 1
	}
	if (player.bonus && player.bonus >0 ){
		if (player.bonus > 3){
		  mods += 3
		} else {
		  mods += player.bonus
		}
		message += ' (with '+player.helpers+')'
	}
	if (player.spearhead > 0 && roll_value >= 9){
		mods += 3
	}
	if (roll_value < 7){
		// injury section
		if (roll_value == 6){
			if (player.profession != 'hunter'){
				message += 'Injury!'
				player.isInjured = true
			}
		} else {
		// TODO: make this also possibly inure the helpers
			message += 'Injury!'
			player.isInjured = true
		}
	} else {
		// rewards section
		netRoll = roll_value + mods
		huntData = locations[currentLocationName]['hunt']
		for (var i = 0; i < huntData.length; i++){
			if (netRoll <= huntData[i][0]){
				message += huntData[i][2]
				player.food += huntData[i][1]
				break
			}
		}
	}
	// update the game track
	var huntercount = 1
	if (player.helpers ){
		huntercount += length(player.helpers)
	}
	var oldTrack = locations[currentLocationName]['game_track'] 
	locations[currentLocationName]['game_track'] += huntercount
	console.log('Game Track for '+currentLocationName+' advnced from '+oldTrack+' to '+locations[currentLocationName]['game_track'])
	ConsoleTransportOptions.
	// clear the stuff for group hunting
	player.bonus = 0
	player.helpers = []
	return message
}


