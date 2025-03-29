const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const worklib = require("../../libs/work.js")
const text = require("../../libs/textprocess.js")
const pop = require("../../libs/population.js")
const dice = require("../../libs/dice.js")
const referees = require("../../libs/referees.json")
const huntlib = require("../../libs/hunt.js")

module.exports = {
	data: new SlashCommandBuilder()
		.setName('hunt')
		.setDescription('hunt food')
        .addIntegerOption(option =>
            option.setName('force')
            .setDescription('referee can force a die roll value 3-18')
            .setRequired(false)
            )
        ,
    async execute(interaction, gameState) {
        var sourceName = interaction.member.displayName;
        var forceRoll = interaction.options.getInteger('force');
        await hunt(gameState, sourceName, forceRoll)
	},
};

function hunt(gameState, sourceName, forceRoll){
    if ( gameState.ended ){
        text.addMessage(gameState, sourceName,  'The game is over.  Maybe you want to /join to start a new game?');
        return
    }
    player = pop.memberByName(sourceName, gameState);
    // if this is null, the player can NOT work
    msg = worklib.canWork(gameState, player);

    if (msg) {
        text.addMessage(gameState, sourceName,msg )
        return
    }
    if (player.guarding && player.guarding.length > 0){
        text.addMessage(gameState, sourceName, 'You can not go hunting while guarding '+player.guarding )
        return
    }
    if (player.isPregnant && player.isPregnant != 'false'){
        text.addMessage(gameState, sourceName,'You can not hunt while pregnant' )
        return
    }
    var huntRoll = dice.roll(3)
    if (referees.includes(sourceName) && forceRoll){
        huntRoll = forceRoll;
        if (huntRoll < 3 || 18 < huntRoll){
            text.addMessage(gameState, sourceName,'Roll must be 3-18' )
            return
        }
    }
    //message = hunt(actor, player, huntRoll, gameState)
    message = huntlib.hunt(sourceName, player, huntRoll, gameState);
    return;
}
function onError(interaction, response){
    interaction.user.send(response);
        const embed = new EmbedBuilder().setDescription(response);
		interaction.reply({ embeds: [embed], ephemeral: true }) // error message
			.catch(console.error);
        return
}