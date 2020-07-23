var Discord = require('discord.js');
var bot = new Discord.Client()
var logger = require('winston');
var auth = require('./auth.json');

var referees = ['kevinmitcham']

var types = ['food', 'grain', 'basket', 'spearpoint']

var inventory = {
}

bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
});

bot.on('message', msg => {
  if (!msg.content){
	return
  }
  author = msg.author
  actor = author.username

  if (msg.content.toLowerCase().substring(0,5) === '!give'){
      bits = msg.content.split(' ')
      target = bits.slice(3).join(' ')
      amount = bits[1]
      type = bits[2]
      
      if (isNaN(amount) || ! types.includes(type)){
      	msg.reply('Give syntax is give  <amount> <food|grain|spearpoint|basket> <recipient>')
      	return
      }
      
      if (amount < 0 &&  actor != referee){
      	msg.reply('Only the referee can reduce amounts')
      	return
      }
	  if (!inventory[actor]){
	  	inventory[actor] = {'food':0, 'grain':0}
	  }	
		      
      if ( referees.includes(actor) || inventory[actor][type] >= amount){
         if (!inventory[target]){
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
  if (msg.content.toLowerCase().substring(0,5) === '!list'){
  	bits = msg.content.split(' ')
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