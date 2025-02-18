const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const worklib = require("../../libs/work.js")
const gatherlib = require("../../libs/gather.js")
const referees = require("../../libs/referees.json")
const text = require("../../libs/textprocess.js")
const pop = require("../../libs/population.js")
const dice = require("../../libs/dice.js")

module.exports = {
	data: new SlashCommandBuilder()
		.setName('gather')
		.setDescription('gather food')
        .addIntegerOption(option =>
            option.setName('force')
            .setDescription('referee can force a die roll value 3-18')
            .setRequired(false)
            )
        ,
    async execute(interaction, gameState) {
        await gather(interaction, gameState)
	},
};

function gather(interaction, gameState){
    var sourceName = interaction.user.displayName;
    var forceRoll = interaction.options.getInteger('force');
    var population = gameState.population;
    player = population[sourceName]
    msg = worklib.canWork(gameState, player);

    if (msg) {
        text.addMessage(gameState, sourceName, msg)
        return
    }
    if (player.guarding && player.guarding.length >= 5){
        text.addMessage(gameState, sourceName, 'You can not gather while guarding more than 4 children.  You are guarding '+player.guarding )
        return
    }
    var gatherRoll = dice.roll(3)
    if (referees.includes(sourceName) && forceRoll){
        gatherRoll = forceRoll;
        if (gatherRoll < 3 || 18 < gatherRoll){
            text.addMessage(gameState, sourceName,'Roll must be 3-18' )
            return
        }
    }
    message = gatherlib.gather( sourceName, player, gatherRoll, gameState)
    player.activity = 'gather'    
    player.worked = true;
	pop.history(sourceName, message, gameState);
    gameState.saveRequired = true;
    text.addMessage(gameState, "tribe", message)

}

function onError(interaction, response){
    interaction.user.send(response);
        const embed = new EmbedBuilder().setDescription(response);
		interaction.reply({ embeds: [embed], ephemeral: true })
			.catch(console.error);
        return
}