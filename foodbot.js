var Discord = require('discord.js');
var bot = new Discord.Client()
var logger = require('winston');

var referees = ['kevinmitcham']

var types = ['food', 'grain', 'basket', 'spearpoint']

var inventory = {
}

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
	  if (!inventory[actor] && !referees.includes(actor)  ){
	  	inventory[actor] = {'food':0, 'grain':0}
	  }	
		      
      if ( referees.includes(actor) || inventory[actor][type] >= amount){
         if (!inventory[target]) {
         	msg.reply('making record for '+target)
         	inventory[target] = {'food':0, 'grain':0}
         }
         msg.reply('gifted')
         if (!inventory[target][type]){
         	inventory[target][type] = Number(amount)
         } else {
           inventory[target][type] += Number(amount)
         }         
         if (!referees.includes(actor)){
         	inventory[actor] -= Number(amount)
         }
      } else {
         msg.reply('You do not have that much '+type+': '+ inventory[actor][type])
      }
      return
  }
  if (command === 'list'){
    if (bits.length == 1){
    	if (referees.includes(actor)){
    	 	big_message = ''
			for (var target in inventory){
				message = target +' has'
	    		for (var type in inventory[target]) {
    				if (Object.prototype.hasOwnProperty.call( inventory[target], type)) {
     				   message+= ' '+type+' '+inventory[target][type]
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
	    if (inventory[target]) {
    		for (var type in inventory[target]) {
    			if (Object.prototype.hasOwnProperty.call( inventory[target], type)) {
     			   message+= ' '+type+' '+inventory[target][type]
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
});

bot.once('ready', ()=>{
  console.log('bot is alive')
}) 
bot.login('NzM1MTU2ODQ3ODk5ODM2NTg3.XxcKTQ.nUY0YXE99FztsbqPvSyo9X8I-Uk')