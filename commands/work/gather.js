const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");
const savelib = require("../../save.js");
const worklib = require("../../work.js")
const gatherlib = require("../../gather.js")

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
        util.ephemeralResponse(interaction, msg);
        return
    }
    if (player.guarding && player.guarding.length >= 5){
        util.ephemeralResponse(interaction, 'You can not gather while guarding more than 4 children.  You are guarding '+player.guarding)
        cleanUpMessage(msg);
        return
    }
    var gatherRoll = util.roll(3)
    if (util.referees.includes(sourceName) && forceRoll){
        gatherRoll = forceRoll;
        if (gatherRoll < 3 || 18 < gatherRoll){
            util.ephemeralResponse(interaction,'Roll must be 3-18')
            return
        }
    }
    message = gatherlib.gather( sourceName, player, gatherRoll, gameState)
    player.activity = 'gather'    
    player.worked = true;
	util.history(sourceName, message, gameState);
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