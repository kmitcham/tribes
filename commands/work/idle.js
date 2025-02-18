const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const worklib = require("../../libs/work.js")
const text = require("../../libs/textprocess.js")
const pop = require("../../libs/population.js")
const dice = require("../../libs/dice.js")
const referees = require("../../libs/referees.json")

module.exports = {
	data: new SlashCommandBuilder()
		.setName('idle')
		.setDescription('do nothing this season')
        ,
    async execute(interaction, gameState) {
        await idle(interaction, gameState)
	},
};

function idle(interaction, gameState){
    var sourceName = interaction.user.displayName;
    var population = gameState.population;
    player = population[sourceName]
    msg = worklib.canWork(gameState, player);

    if (msg) {
        text.addMessage(gameState, sourceName,msg )
        return
    }
    player.activity = 'idle'
	message = player.playerName +' does nothing for a whole season.'
	pop.history(player.name, " does nothing for a season.", gameState)
    player.worked = true;
    gameState.saveRequired = true;
    text.addMessage(gameState, "tribe",message )
}

function onError(interaction, response){
    interaction.user.send(response);
        const embed = new EmbedBuilder().setDescription(response);
		interaction.reply({ embeds: [embed], ephemeral: true })
			.catch(console.error);
        return
}