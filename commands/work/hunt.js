const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");
const savelib = require("../../save.js");
const worklib = require("../../work.js")
const huntlib = require("../../hunt.js")

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
        await hunt(interaction, gameState)
	},
};

function hunt(interaction, gameState){
    var sourceName = interaction.user.displayName;
    var forceRoll = interaction.options.getInteger('force');
    var population = gameState.population;
    player = population[sourceName]
    // if this is null, the player can NOT work
    msg = worklib.canWork(gameState, player);

    if (msg) {
        util.ephemeralResponse(interaction, msg);
        return
    }
    if (player.guarding && player.guarding.length > 0){
        util.ephemeralResponse(interaction,'You can not go hunting while guarding '+player.guarding)
        return
    }
    if (player.isPregnant && player.isPregnant != 'false'){
        util.ephemeralResponse(interaction,'You can not hunt while pregnant')
        return
    }
    var huntRoll = util.roll(3)
    if (util.referees.includes(sourceName) && forceRoll){
        huntRoll = forceRoll;
        if (huntRoll < 3 || 18 < huntRoll){
            util.ephemeralResponse(interaction,'Roll must be 3-18')
            return
        }
    }
    //message = hunt(actor, player, huntRoll, gameState)
    message = huntlib.hunt(sourceName, player, huntRoll, gameState);
    player.activity = 'hunt'

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