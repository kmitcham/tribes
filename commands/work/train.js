const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");
const savelib = require("../../save.js");
const worklib = require("../../work.js")
const huntlib = require("../../hunt.js")

module.exports = {
	data: new SlashCommandBuilder()
		.setName('train')
		.setDescription('attempt to learn how to craft')
        .addIntegerOption(option =>
            option.setName('force')
            .setDescription('referee can force a die roll value 2-12')
            .setRequired(false)
            )
        ,
    async execute(interaction, gameState) {
        await train(interaction, gameState)
	},
};

function train(interaction, gameState){
    var sourceName = interaction.user.displayName;
    var forceRoll = interaction.options.getInteger('force');
    var population = gameState.population;
    player = population[sourceName]
    msg = worklib.canWork(gameState, player);

    if (msg) {
        util.ephemeralResponse(interaction, msg);
        return
    }
    if (player.canCraft){
        util.ephemeralResponse(interaction, 'You already know how to craft')
        return
    }
    if (player.guarding && player.guarding.length > 2){
        util.ephemeralResponse(interaction, 'You can not learn crafting while guarding more than 2 children.  You are guarding '+player.guarding)
        return
    }
    var crafters = util.countByType(population, 'canCraft', true)
    var noTeachers = util.countByType(population, 'noTeach', true)
    if (crafters <= noTeachers){
        util.ephemeralResponse(interaction, 'No on in the tribe is able and willing to teach you crafting')
        return
    }
    learnRoll = util.roll(2)
    if (util.referees.includes(sourceName) && forceRoll){
        learnRoll = forceRoll;
        if (learnRoll < 2 || 12 < learnRoll){
            util.ephemeralResponse(interaction,'Roll must be 2-12')
            return
        }
    }
    if ( learnRoll >= 10 ){
        player.canCraft = true
        message = actor+' learns to craft. ['+learnRoll+']'
    } else {
        message = actor+' tries to learn to craft, but does not understand it yet. ['+learnRoll+']'
    }
    player.activity = 'training'
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