var Discord = require('discord.js');
var bot = new Discord.Client()
var logger = require('winston');
var referees = ['kevinmitcham']

const fs = require('fs');
let rawdata = fs.readFileSync('./auth.json');
let auth = JSON.parse(rawdata);

const types = ['food', 'grain', 'basket', 'spearpoint']
const professions= ['hunter','gatherer', 'crafter']
const genders = ['male','female']
var population = require('./population.json')
var children = require('./children.json')

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
}

function processMessage(msg){
	author = msg.author
	actor = author.username
	bits = msg.content.split(' ')
	command = bits[0]
	command = command.toLowerCase().substring(1) // strip out the leading !
	console.log('command:'+command+' bits:'+bits)  

	// save the game state to file
	if (command == 'save'){
		if (referees.includes(actor)){
			saveGameState()
		}
		return
	}
	// add a user to the list of referees; any ref can do this
	if (command === 'promote' ){
		target = bits.slice(1).join(' ')
		console.log('promote:'+target+' by '+actor)
		if (target && referees.includes(actor)){
			referees.push(target)
			msg.reply('referee list:'+referees)
		} else {
			msg.reply('No target to promote, or you lack privileges')
		}
		return 	
	}
	// remove member from the tribe
	if (command === 'banish'){
		if (target && referees.includes(actor)){
			const index = array.indexOf(target);
			if (index > -1) {
				array.splice(index, 1);
			}
			if (population[target]){
				delete population[target]
				msg.reply(target+' is banished from the tribe')
				return
			}
		}
	}
	// add a person to the tribe
  	if (command === 'induct'){
		if (!target || !referees.includes(actor)){
			msg.reply('Only a referee can add tribe members')
			return
		}
		target = bits.slice(3).join(' ')
		profession = bits[1]
		gender = bits[2]
		if ( !target || !profession || !gender || !genders.includes(gender) || !professions.includes(profession)){
			msg.reply('usage:!induct [hunter|gatherer|crafter] [female|male] name')
			return
		}
		var person = {}
		person.gender= gender
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
	// train a person to craft
	if (command === 'train'){
		msg.reply('not implemented')
	}
	// give stuff to a user; refs can give unlimited amounts, others are limited.
	// targets aren't checked to make sure they are valid
	if (command === 'give'){
		target = bits.slice(3).join(' ')
		amount = bits[1]
		type = bits[2]
		
		if (isNaN(amount) || ! types.includes(type)){
			msg.reply('Give syntax is give  <amount> <food|grain|spearpoint|basket> <recipient>')
			return
		}
		
		if (amount < 0 &&  !referees.includes(actor) ){
			msg.reply('Only the referee can reduce amounts')
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
			msg.reply('You do not have that much '+type+': '+ population[actor][type])
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
				msg.reply(big_message)
				return
			} 
			msg.reply('I do not understand that list request.  Usage: list <target>')
			return
    	}
	    target = bits.slice(1).join(' ')
		if ( referees.includes(actor) || actor === target){
			message = target +' has'
			if (population[target]) {
				for (var type in population[target]) {
					if (Object.prototype.hasOwnProperty.call( population[target], type)) {
					message+= ' '+type+' '+population[target][type]
					}
				}
			} else {
				message+=' nothing'
			}
			msg.reply(message)
		} else {
			msg.reply('You must ask '+target+' what they have.')
		}
	}
	// list the children
	if (command === 'children'){
		message = ''
		message = 'There are '+children.length+' children '
		mine = 0 
		var arrayLength = children.length;
		for (var i = 0; i < arrayLength; i++) {
			child = children[i]
			if (child.dead){
				message += '('+i+' is dead)'
			} else if (referees.includes(actor) || (actor === child.mother || actor === child.father) ){
				message += '(name'+i+':'+children[i].mother+'+'+children[i].father+' age:'+children[i].age+ ' food:'+child.food+')'
			}
		} 
		msg.reply(message)
		return
	}
  	// add food to a child
	if (command === 'feed'){
		childIndex = bits[3]
		amount = bits[1]
		type = bits[2]
		childFood = ['food', 'grain']
		if (isNaN(amount) || !childFood.includes(type) || isNaN(childIndex) || childIndex >= children.length ){
			msg.reply('feed syntax is give <amount> <food|grain> <childIndex #>')
			return
		}
		if (amount < 0 &&  !referees.includes(actor) ){
			msg.reply('Only the referee can reduce amounts')
			return
		}
		if (!population[actor] && !referees.includes(actor)  ){
			msg.reply("Children do not take food from strangers")
		}	
		if (children[childIndex].dead){
			msg.reply('That child is dead and cannot be fed anymore')
			return
		}		
		if ( referees.includes(actor) || population[actor][type] >= amount){
			if (!children[childIndex]) {
				msg.reply('no such child as '+childIndex)
				return
			}
			msg.reply(actor+' fed '+amount+' '+type+' to child '+childIndex)
			children[childIndex].food += Number(amount)
			if (!referees.includes(actor)){
				population[actor] -= Number(amount)
			}
		} else {
			msg.reply('You do not have that much '+type+': '+ population[actor][type])
		}
		return
	} 
	// add a child to tribe; args are parent names
	if (command === 'mate'){
		if (bits.length != 3){
			msg.reply('usage: !mate mother father')
			return
		}
		var child = Object()
		child.mother = bits[1]
		child.father = bits[2]
		child.age = -2
		child.food = 0
		children.push(child)
		index = children.length - 1
		msg.reply('Added child '+index+' with parents '+child.mother+ ' and '+child.father)
		return
	}
	// advance the clock one season.  Reduce food/grain in population, as well as for children.
	// message for every death, and remove the relevant items from the data structure. 
	if (command === 'turn') {
		if (!referees.includes(actor)) {
			return;
		}  
		console.log('adults are eating')
		response = "Turn results:"
		perished = []
		for  (var target in population) {
			target.food -= 4
			if (target.food < 0 ){
				target.grain -= target.food
				target.food = 0
				if (target.grain < 0){
					response += "  "+target+" has starved to death."
					perished.push(target)
				}
			}
		} 
		console.log('children are eating')
		var arrayLength = children.length;
		for (var i = 0; i < arrayLength; i++) {
			if (children[i].age < 24 && ! children[i].dead){
				children[i].food -= 2
				if (children[i].food < 0){
					response += " child:"+i+"("+children[i].mother+"+"+children[i].father+") has starved to death"
					children[i].dead = true
				} else {
					children[i].age += 1
				}
			}
		}
		msg.reply(response)
  	}

}

function Child(mother, father) {
	this.mother = mother;
	this.father = father;
	this.food = 0
	this.age = -2 // in seasons
	return this
}

Child.prototype.toString = function childToString() {
	return `${this.mother} ${this.father} ${this.age}`;
};

bot.once('ready', ()=>{
  console.log('bot is alive')
}) 

bot.login(auth['token'])
