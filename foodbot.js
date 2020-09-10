var Discord = require('discord.js');
var bot = new Discord.Client()
var logger = require('winston');
var referees = ['kevinmitcham','@kevinmitcham' ]

const fs = require('fs');
let rawdata = fs.readFileSync('./auth.json');
let auth = JSON.parse(rawdata);

const types = ['food', 'grain', 'basket', 'spearpoint']
const professions= ['hunter','gatherer', 'crafter']
const activities = ['hunt', 'gather', 'craft','nothing']
const member_properties = ['canCraft','isNursing','isPregnant','profession','gender','partner','work','food','grain']
const genders = ['male','female']
var population = require('./population.json')
var children = require('./children.json');
var referees = require('./referees.json');
const { ExceptionHandler } = require('winston');
const { resolve } = require('path');

bot.on('message', msg => {
  if (!msg.content ){
	return
  }
  if (msg.content.substring(0,1) != '!'){
	return
  }
  processMessage(msg)
});
// TODO: when child dies young, clear isPregnant
// TODO: rolls should be public
// TODO: handle rolls internally
// TODO: craft takes an arg
// TODO: Work Round, Food Round Reproduction round
// TODO: track calendar/ seasons

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
		 addToPopulation(msg, author, bits, actor)
	}
	if (!population[actor]  && !referees.includes(actor)){
		msg.author.send('You must join the tribe use commands: join <hunter|gatherer|crafter> <male|female> ')
		// disabled for alpha testing
		// return
	}
	handleCommand(msg, author, command, bits)
	return	
}

function handleCommand(msg, author, command, bits){
	// list commands
	if (command === 'help'){
		text = ''
		text+='Player commands\n'
		text+=' give <amt> <food|grain|spearpoint|basket> <player>\n'
		text+=' feed <amt> <food|grain> <childNumber>\n'
		text+=' roll <#dice>\n'
		text+=' list show inventory and character info\n'
		text+=' children shows the children ages and food status\n'
		text+=' hunt <with @target>'
		text+=' gather'
		text+=' craft <spearpoint|basket>'
		msg.author.send( text)

		if (referees.includes(actor)){
			text = '<amt> <food|grain|spearpoint|basket> <player>\n'
			text+='\nReferee Commands\n'
			text+=' check report on what would happen if you used endturn   NOT YET\n'
			text+=' edit target <canCraft|isNursing|isPregnant|profession|gender|partner|work|food|grain>\n' 
			text+=' endturn check food, breeding\n'
			text+=' award <amt> <food|grain|spearpoint|basket> <player>\n'
			text+=' list <player>  (no arg lists all players)\n '
			text+=' induct|banish <player> add a member to the tribe\n'
			text+=' promote|demote <player> to the ref list\n'
			text+=' save the game file\n'
			text+=' spawn <mother> <father>  add a child with give parents\n'
			msg.author.send( text)
		}

	}
	if (command == 'roll'){
		count = bits[1]
		if (!count){
			count = 3
		}
		total = 0
		message = ''
		for (var i = 0; i < count; i++){
			var roll = Math.trunc( Math.random ( ) * 6)+1
			message += roll+' '
			total += roll
		}
		msg.reply(actor+' rolls '+message+' total:'+total)
		return
	}
	if (command == 'edit'){
		if (! msg.mentions || ! msg.mentions.users){
			msg.author.send(command+' requires at least one @target')
			return
		}
		var target = msg.mentions.users.first()
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
			message = target.username+ ' now has value '
			for (var type in targetObj) {
				if (Object.prototype.hasOwnProperty.call( targetObj, type)) {
					message+= ' '+type+' '+targetObj[type]
				}
			}
			msg.author.send(message)
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
			msg.author.send(command+' requires at least one @target')
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
	if (command === 'work'){
		doWork(msg, author, bits)
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
		if (! msg.mentions || ! msg.mentions.users){
			msg.author.send(command+' requires at least one @target')
		return
		}
		var target = msg.mentions.users.first().username
		addToPopulation(msg, author, bits, target)
		return
	}
	if (command === 'mate'){
		if (! msg.mentions || ! msg.mentions.users){
			msg.author.send(command+' requires at least one @target')
			return
		}
		if (bits.length < 2 ){
			msg.author.send('usage: mate <target>')
			return
		}
		var target = msg.mentions.users.first().username
		if (!population[target]){
			msg.author.send('no such target:'+target)
			return
		}
		if (population[target].gender === population[actor].gender){
			msg.author.send('Must mate with opposite gender')
			return
		}
		population[actor].partner = target
		msg.author.send('Your mating partner for the season is '+target)
	}
	// train a person to craft
	if (command === 'train'){
		msg.author.send(command+' not implemented')
	}
	// give stuff to a user; refs can give unlimited amounts, others are limited.
	// targets aren't checked to make sure they are valid
	if (command === 'give'){
		if (! msg.mentions || ! msg.mentions.users || ! msg.mentions.users.first() ){
			msg.author.send(command+' requires at least one @target')
			return
		}
		var target = msg.mentions.users.first()
		var username = target.username
		amount = bits[1]
		type = bits[2]
		
		if (isNaN(amount) || ! types.includes(type)){
			msg.author.send('Give syntax is give  <amount> <food|grain|spearpoint|basket> <recipient>')
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
				msg.author.send('award syntax is give  <amount> <food|grain|spearpoint|basket> <recipient>')
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
	if (command === 'list'){
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
		console.log('adults are eating')
		response = "Turn results:\n"
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
		// check breeding
		for  (var mother in population) {
			if (population[mother].gender === 'female' && !population[mother].isPregnant && population[mother].partner){
				father = population[mother].partner
				console.log('m:'+mother+' f:'+population[mother].partner)
				if (population[father] && population[father].partner === mother){
					response += " ( "+mother+" "+father+" attempted to reproduce. "
					if (population[mother].isNursing){
						response += ' 2d:10+ )'
					} else {
						response += ' 2d:9+ )'
					}
					response += '\n'
				} else {
					console.log('breeding mismatch: f:'+population[father].partner)
				}
			}
		}
		// check activities
		hunters = []
		gatherers = []
		crafters = []
		craftTrainee = []
		huntMessage = 'Hunters:'
		gatherMessage = 'Gatherers:'
		idlers = []
		for  (var target in population) {
			work = population[target].work
			console.log(target+' is doing '+work)
			switch (work){
				case 'hunt':
					huntMessage+= "\t"+target
					if (! (population[target].profession === 'hunter')){ huntMessage += '(-3)'}
					hunters.push(target)
					if (population[target].spearpoint > 0){
						huntMessage+= '(spearpoint)'
					}
					huntMessage+='\n'
					console.log(huntMessage)
					break
				case 'gather':
					gatherMessage+= "\t"+target
					if (!(population[target].profession === 'gatherer')){ gatherMessage += '(-3)'}
					gatherers.push(target)
					if (population[target].basket > 0){
						gatherMessage+= '(basket)'
					}
					gatherMessage+='\n'
					break
				case 'craft':
					if (population[target].canCraft){
						crafters.push(target)}
					else {
						craftTrainee.push(target)}
					break
				default:
					idlers.push(target)
					// doing nothing is valid
			}
			//population[target].work = null // default to repating the work
		}
		if (hunters.length){response += '\n'+huntMessage}
		if (gatherers.length){response += '\n'+gatherMessage}
		if(crafters.length) {response += '\n Crafters:'+crafters}
		if(craftTrainee.length) {response += '\n Craft training: '+craftTrainee}
		if(idlers.length) {response += '\n Idle: '+idlers}
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

function addToPopulation(msg, author, bits, target){
	profession = bits[1]
	gender = bits[2]
	if (!target ){
		msg.author.send('usage: <profession> <gender> <name>')
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
	person.spearpoint = 0
	person.profession = profession
	if (profession === 'crafter'){
		person.canCraft = true
	} else {
		person.canCraft = false
	}
	population[target] = person
	msg.reply('added '+target+' to the tribe')
}