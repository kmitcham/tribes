var Discord = require('discord.js');
var bot = new Discord.Client()
var logger = require('winston');
var referees = ['kevinmitcham','@kevinmitcham' ]

const fs = require('fs');
let rawdata = fs.readFileSync('./auth.json');
let auth = JSON.parse(rawdata);

const types = ['food', 'grain', 'basket', 'spearpoint']
const professions= ['hunter','gatherer', 'crafter']
const activities = ['hunt', 'gather', 'craft']
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
	actor = author.tag
	bits = msg.content.split(' ')
	command = bits[0]
	command = command.toLowerCase().substring(1) // strip out the leading !
	console.log('command:'+command+' bits:'+bits)  

	if (!population[actor]  && !referees.includes(actor)){
		msg.author.send('You must be in the tribe or a referee to use commands')
		// disabled for alpha testing
		// return
	}

	// list commands
	if (command === 'help'){
		msg.author.send('Player commands')
		msg.author.send(' give <amt> <food|grain|spearpoint|basket> <player>')
		msg.author.send( 'feed <amt> <food|grain> <childNumber>')
		msg.author.send(' mate <player>  intend to mate with player this season')
		msg.author.send(' work <hunt|gather|craft>  activity for season')
		msg.author.send(' list show inventory and character info')
		msg.author.send( 'children shows the children ages and food status')
		msg.author.send( '')

		if (referees.includes(actor)){
			msg.author.send('Referee Commands')
			msg.author.send(' save the game file')
			msg.author.send(' list <player>  (no arg lists all players) ')
			msg.author.send(' promote|demote <player> to the ref list')
			msg.author.send(' induct|banish <player> add a member to the tribe')
			msg.author.send(' edit target <canCraft|isNursing|isPregnan|professio|gender>  NOT YET' )
			msg.author.send(' check report on what would happen if you used endturn   NOT YET')
			msg.author.send(' endturn check food, breeding')
			msg.author.send(' spawn <mother> <father>  add a child with give parents')
			msg.author.send(' give has quantity restrictions removed')
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
		var target = msg.mentions.users.first()
		console.log('promote:'+target.tag+' by '+actor)
		// disble ref checking for now
		//if (target && referees.includes(actor)){
		if (target){
			if (referees.includes(target.tag)){
				msg.author.send(target.tag+' is already a referee')
			} else {
				referees.push(target.tag)
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
		var target = msg.mentions.users.first()
		if (referees.includes(target.tag)){
			const index = referees.indexOf(target.tag);
			if (index > -1) {
				referees.splice(index, 1);
				console.log('demoted '+target.tag)
				msg.author.send('demoted '+target.tag)
				return
			}
		} else{
			msg.author.send(target.tag+' is not a referee:'+referees)
		}
	}
	// remove member from the tribe
	if (command === 'banish'){
		var target = msg.mentions.users.first()
		if (target && referees.includes(actor)){
			if (population[target.tag]){
				delete population[target.tag]
				msg.reply(target.tag+' is banished from the tribe')
				return
			}
		} else {

		}
	}
	// add a person to the tribe
  	if (command === 'induct'){
		var target = msg.mentions.users.first().tag
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
		if ( !referees.includes(actor) ){
			console.log(actor +" list:"+referees)
			msg.author.send('Only a referee can add tribe members')
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
		return
	}
	if (command === 'mate'){
		if (bits.length < 2 ){
			msg.author.send('usage: mate <target>')
			return
		}
		var target = msg.mentions.users.first().tag
		if (!population[target]){
			msg.author.send('no such target:'+target)
			return
		}
		if (population[target].gender === population[actor].gender){
			msg.author.send('Must mate with opposite gender')
			return
		}
		population[actor].partner = target
	}
	// train a person to craft
	if (command === 'train'){
		msg.author.send(command+' not implemented')
	}
	// give stuff to a user; refs can give unlimited amounts, others are limited.
	// targets aren't checked to make sure they are valid
	if (command === 'give'){
		var target = msg.mentions.users.first().tag
		amount = bits[1]
		type = bits[2]
		
		if (isNaN(amount) || ! types.includes(type)){
			msg.author.send('Give syntax is give  <amount> <food|grain|spearpoint|basket> <recipient>')
			return
		}
		
		if (amount < 0 &&  !referees.includes(actor) ){
			msg.author.send('Only the referee can reduce amounts')
			return
		}
		if (!population[actor] && !referees.includes(actor)  ){
			population[actor] = {'food':0, 'grain':0}
		}	
				
		if ( referees.includes(actor) || population[actor][type] >= amount){
			if (!population[target]) {
				console.log('making population record for '+target)
				population[target] = {'food':0, 'grain':0}
			}
			msg.reply(actor+' gave '+amount+' '+type+' to '+target)
			if (!population[target][type]){
				population[target][type] = Number(amount)
			} else {
			population[target][type] += Number(amount)
			}         
			if (!referees.includes(actor)){
				population[actor] -= Number(amount)
			}
		} else {
			msg.author.send('You do not have that much '+type+': '+ population[actor][type])
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
			} 
    	}
		if (! msg.mentions || ! msg.mentions.users){
			msg.author.send('list requires targets')
			return
		}
		var targets = msg.mentions.users
		for (var target in targets){
			if ( referees.includes(actor) || actor === target){
				message = target +' stats:'
				if (population[target]) {
					for (var type in population[target]) {
						if (Object.prototype.hasOwnProperty.call( population[target], type)) {
						message+= ' '+type+' '+population[target][type]
						}
					}
				} else {
					message+=' nothing'
				}
				msg.author.send(message)
			} else {
				msg.author.send('You must ask '+target+' what they have.')
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
			if (!referees.includes(actor)){
				population[actor] -= Number(amount)
			}
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
		if (msg.mentions.users.length != 2){
			msg.author.send('usage: !spawn mother father')
			return
		}
		var child = Object()
		child.mother = msg.mentions.users.first().tag
		child.father = msg.mentions.users.last().tag
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
		response = "Turn results:"
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
		for  (var target in population) {
			activity = population[target].activity
			switch (activity){
				case 'hunt':
					hunters.push(target)
					break
				case 'gather':
					gatherers.push[target]
					break
				case 'craft':
					if (population[target].canCraft){crafters.push(target)}
					else {craftTrainee.push(target)}
					break
				default:
					// doing nothing is valid
			}
			population[target].activity = null
		}
		if (hunters.length){response += '\n Hunters:'+hunters}
		if (gatherers.length){response += '\n Gathers:'+gatherers}
		if(crafters.length) {response += '\n Crafters'+crafters}
		if(craftTrainee.length) {response += '\n Craft training '+craftTrainee}
		// clean up the dead
		for (corpse in perished){
			delete population[corpse]
		}
		msg.reply(response)
  	}

}

bot.once('ready', ()=>{
  console.log('bot is alive')
}) 

bot.login(auth['token'])

function doWork(message, author, bits){
	activity = bits[1]
	if (! activities.includes(activity)){
		msg.author.message('legal work types:'+activities)
		return
	}
	if (population[actor]){
		if ('craft' === activity && ! population[actor].canCraft){
			message.author.send("You will be attempting to learn to craft")
		} else {
			population[actor].activity = activity
			message.author.send("This season you will "+activity)
		}
	}
	return
}