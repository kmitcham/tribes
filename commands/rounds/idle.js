const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");
const savelib = require("../../save.js");
const worklib = require("../../work.js")
const huntlib = require("../../hunt.js")

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
        util.ephemeralResponse(interaction, msg);
        return
    }
    player.activity = 'idle'
	message = player.playerName +' does nothing for a whole season.'
	util.history(player.name, " does nothing for a season.", gameState)
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