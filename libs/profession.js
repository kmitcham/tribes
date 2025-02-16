function specialize( msg, playerName, profession, gameState){
	playerName = msg.author.username
	profession = bits[1]
	helpMessage = "Welcome new hunter.  \n"
	helpMessage+= "To hunt, do !hunt and the bot rolls 3d6.  Higher numbers are bigger animals, and very low numbers are bad - you could get injured. \n"
	helpMessage+= "You cannot guard children while hunting. \n"
	helpMessage+= "Before you set out, you might consider waiting for a crafter to make you a spearhead which gives you a bonus to your roll. \n"
	helpMessage+= "You can also `!gather`, but at a penalty. If your tribe has someone who knows how to craft, you can try to learn that skill with `!train`";

	if (profession.startsWith('h')){
		profession = 'hunter'
		// use default helpMessage
	}
	if (profession.startsWith('c')){
		profession = 'crafter';
		helpMessage = "Welcome new crafter.  To craft, do `!craft basket` or `!craft spearhead`.  There is a 1/6 (basket) or 1/3 (spearhead) chance of failing.. \n"
		helpMessage+= "You can guard up to two children while crafting. \n"
		helpMessage+= "You can also `!gather`  or `!hunt`, but at a penalty. \n"
		helpMessage+= "By default, you will train others in crafting if they take a season to train.  To toggle this setting, use `!secrets`.";
	}
	if (profession.startsWith('g')){
		profession = 'gatherer';
		helpMessage = "Welcome new gatherer.  To gather, do `!gather`, and the bot rolls 3d6.  Higher numbers generally produce more food. \n"
		helpMessage+= "You can guard 2 children without penalty; watching 3 or 4 gives an increasing penalty; 5 is too many to gather with. \n"
		helpMessage+= "Before you set out, you might consider waiting for a crafter to make you a basket which gives you an additional gather attempt. \n"
		helpMessage+= "You can also `!hunt`, but at a penalty. If your tribe has someone who knows how to craft, you can try to learn that skill with `!train`";
	}
	if ( !profession || !professions.includes(profession)){
		msg.author.send('usage:!'+bits[0]+' [hunter|gatherer|crafter] ')
		return
	}
	var person = util.personByName(playerName, gameState)
	if (!person){
		msg.author.send(playerName +', you are not in this tribe.')
		return
	}
	person.profession = profession
	util.messageChannel(playerName+ ' is a skilled '+profession, gameState, bot)
	if (person.profession == 'crafter'){
		person.canCraft = true
	}
	msg.author.send(helpMessage);
	return
}