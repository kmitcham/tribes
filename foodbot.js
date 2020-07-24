var Discord = require('discord.js');
var bot = new Discord.Client()
var logger = require('winston');
var referees = ['kevinmitcham']

var types = ['food', 'grain', 'basket', 'spearpoint']

var population = {
}
var children = []

bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
});

bot.on('message', msg => {
  if (!msg.content ){
	return
  }
  if (msg.content.substring(0,1) != '!'){
	return
  }
  author = msg.author
  actor = author.username
  bits = msg.content.split(' ')
  command = bits[0]
  command = command.toLowerCase().substring(1) // strip out the leading !
  console.log('command:'+command+' bits:'+bits)  
 
  // add a user to the list of referees; any ref can do this
  if (command === 'promote' ){
	target = bits.slice(1).join(' ')
	console.log('promote:'+target+' by '+actor)
	if (target && referees.includes(actor)){
		referees.push(target)
		msg.reply('referee list:'+referees)
	} else {
		msg.reply('No target to promote')
	}
	return 	
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
	message = 'There are '+children.length+' children  '
	mine = 0 
	var arrayLength = children.length;
	for (var i = 0; i < arrayLength; i++) {
		child = children[i]
		if (referees.includes(actor) || (actor === child.mother || actor === child.father) ){
			message += '(name'+i+':'+children[i].mother+'+'+children[i].father+' age:'+children[i].age+ ' food:'+child.food+')'
		}
	} 
	msg.reply(message)
	return
  }
  // feed a child for the turn
  if (command === 'feed'){
		childIndex = bits[3]
		amount = bits[1]
		type = bits[2]
		childFood = ['food', 'grain']
		if (isNaN(amount) || !childFood.includes(type) || isNaN(childIndex) ){
			msg.reply('feed syntax is give <amount> <food|grain> <childIndex #>')
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
			if (!children[childIndex]) {
				msg.reply('no such child as '+childIndex)
				return
			}
			msg.reply(actor+' fed '+amount+' '+type+' to child '+childIndex)
			children[childIndex].food += amount
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
	var child = Child(bits[1], bits[2])
	children.push(child)
    index = children.length - 1
	msg.reply('Added child '+index+' with parents '+child.mother+ ' and '+child.father)
  }
  // advance the clock one season.  Reduce food/grain in population, as well as for children.
  // message for every death, and remove the relevant items from the data structure. 
  if (command === 'turn'){
	  // for every person in population
	  //    food -= 4
	  //    if food < 0
	  //       grain -= food
	  //       food = 0
	  //       if grain < 0
	  //          DEATH
	  // for every child
	  //    if age < 24  // in seasons
	  //      food -= 2
	  //      if food < 0
	  //        DEATH
	  //    age += 1
	  msg.reply('not implemented')
  }
});

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
bot.login('NzM1MTU2ODQ3ODk5ODM2NTg3.XxcKTQ.nUY0YXE99FztsbqPvSyo9X8I-Uk')