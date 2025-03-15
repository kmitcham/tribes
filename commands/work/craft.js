const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const worklib = require("../../libs/work.js")
const text = require("../../libs/textprocess.js")
const pop = require("../../libs/population.js")
const dice = require("../../libs/dice.js")
const referees = require("../../libs/referees.json")

module.exports = {
	data: new SlashCommandBuilder()
		.setName('craft')
		.setDescription('craft a basket or spearhead')
        .addStringOption(option => 
            option
            .setName('item')
            .setDescription('one of (basket,spearhead)')
            .addChoices(
                { name: 'basket', value: 'basket' },
                { name: 'spearhead', value: 'spearhead'},
            )
            .setRequired(true))
        .addIntegerOption(option =>
            option.setName('force')
            .setDescription('referee can force a die roll value 1-6')
            .setRequired(false)
            ),
        
    async execute(interaction, gameState) {
        await craft(interaction, gameState)
	},
};

function craft(interaction, gameState){
    var sourceName = interaction.member.displayName;
    var item = interaction.options.getString('item');
    var forceRoll = interaction.options.getInteger('force');
    player = pop.memberByName(sourceName, gameState);
    msg = worklib.canWork(gameState, player);

    if (msg) {
        text.addMessage(gameState, sourceName, msg)
        return
    }
    if (player.canCraft == false){
        text.addMessage(gameState, sourceName, 'You do not know how to craft')
        return
    }
    if (player.guarding && player.guarding.length > 2){
        text.addMessage(gameState, sourceName,  'You can not craft while guarding more than 2 children.  You are guarding '+player.guarding)
        return
    }

    if (item.startsWith('b') ) {
        item = 'basket'
    } else if ( item.startsWith('s')){
        item = 'spearhead'
    } else {
        response = "Unrecognized item "+item;
        return onError(interaction, response);
    }
    
    var craftRoll = dice.roll(1)
	if (referees.includes(sourceName) && forceRoll){
		craftRoll = forceRoll
        if (craftRoll < 1 || 6 < craftRoll){
            text.addMessage(gameState, sourceName, "forceRoll must be 1-6")
		    return
		}
	}
    var rollValue = craftRoll;
	console.log('craft type '+item+' roll '+craftRoll)
	player.worked = true
	var message = sourceName+' crafts['+craftRoll+'] a '+item
	if (player.profession != 'crafter'){
		rollValue -= 1
	}
	if (rollValue > 1 && item == 'basket'){
			player.basket += 1
	} else if (rollValue > 2 && item == 'spearhead') {		
			player.spearhead += 1
	} else {
		message =  sourceName+ ' creates something['+craftRoll+'], but it is not a '+item
	}
	pop.history(sourceName,message, gameState)
	player.activity = 'craft'    
    player.worked = true;
    gameState.saveRequired=true;

    text.addMessage(gameState, "tribe", message)

}
function onError(interaction, response){
    interaction.user.send(response);
        const embed = new EmbedBuilder().setDescription(response);
		interaction.reply({ embeds: [embed], ephemeral: true }) // error message
			.catch(console.error);
        return
}