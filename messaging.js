const util= require( './util.js')

function sendMessages(bot, gameState){
    messagesDict = gameState.messages;
   for (const [address, message] of Object.entries(messagesDict)){
        if (address == 'tribe'){
            messageTribe(bot, gameState, messagesDict[address])
        } else {
            messageMember(bot, gameState, address, messagesDict[address] )
        }
        delete messagesDict[address]
    }
}
module.exports.sendMessages = sendMessages;

async function messageTribe(bot, gameState, message){
	if (!bot || !bot.channels || !bot.channels.cache ){
		console.log('no bot, channel does not see '+message)
		return -1
	}
	if (!message || message.length == 0 ){
		console.log("Not sending empty message to channel:"+message)
		return -2
	}
	channel = argBot.channels.cache.find(channel => channel.name === gameState.name)
	if (channel){
		channel.send(message)
        return 0
	} else {
		console.log('no channel found for '+gameState.name)
        return -3
	}
}
module.exports.messageTribe = messageTribe;

async function  messageMember(bot, gameState, memberName, message) {
    member = util.memberByName(memberName, gameState);
    if ( !member){
        console.log("No member for name "+memberName)
        return -1
    }
    if (!message){
        console.log("Not sending empty message to "+memberName)
        return -2
    }
    userHandle = member.handle
    if (userHandle && userHandle.userId){
        user = await bot.users.fetch(userHandle.userId);
        user.send(message)
        return 0
    }
    console.log(memberName+" has no handle or id- maybe a drone? ")
    return -3
}
module.exports.messageMember = messageMember;

function addMessage(gameState, address, message){
    if (! gameState['messages'] ){
        gameState['messages'] = {}
    }
    messages = gameState['messages']
    if (messages[address]){
        messages[address] += '\n'+message
    } else {
        messages[address] = message
    }
}
module.exports.addMessage = addMessage;

