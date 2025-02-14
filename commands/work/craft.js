const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");
const savelib = require("../../save.js");
const worklib = require("../../work.js")

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
    var sourceName = interaction.user.displayName;
    var item = interaction.options.getString('item');
    var forceRoll = interaction.options.getInteger('force');
    var population = gameState.population;
    player = population[sourceName]
    msg = worklib.canWork(gameState, player);

    if (msg) {
        util.ephemeralResponse(interaction, msg);
        return
    }
    if (player.canCraft == false){
        util.ephemeralResponse(interaction, 'You do not know how to craft');
        return
    }
    if (player.guarding && player.guarding.length > 2){
        util.ephemeralResponse(interaction, 'You can not craft while guarding more than 2 children.  You are guarding '+player.guarding);
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
    
    var craftRoll = util.roll(1)
	if (util.referees.includes(sourceName) && forceRoll){
		craftRoll = forceRoll
        if (craftRoll < 1 || 6 < craftRoll){
            util.ephemeralResponse(interaction, "forceRoll must be 1-6");
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
	util.history(sourceName,message, gameState)
	player.activity = 'craft'    
    player.worked = true;
    savelib.saveTribe(gameState);

    interaction.reply(message);
}
function onError(interaction, response){
    interaction.user.send(response);
        const embed = new EmbedBuilder().setDescription(response);
		interaction.reply({ embeds: [embed], ephemeral: true })
			.catch(console.error);
        return
}