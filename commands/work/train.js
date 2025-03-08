const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const worklib = require("../../libs/work.js")
const text = require("../../libs/textprocess.js")
const pop = require("../../libs/population.js")
const dice = require("../../libs/dice.js")
const referees = require("../../libs/referees.json")

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
        var sourceName = interaction.member.displayName;
        var forceRoll = interaction.options.getInteger('force');
        await train(gameState, sourceName, forceRoll);
	},
};

function train(gameState, sourceName, forceRoll){
    var population = gameState.population;
    player = pop.memberByName(sourceName, gameState);
    msg = worklib.canWork(gameState, player);

    if (msg) {
        text.addMessage(gameState, sourceName,msg )
        return
    }
    if (player.canCraft){
        text.addMessage(gameState, sourceName,'You already know how to craft' )
        return
    }
    if (player.guarding && player.guarding.length > 2){
        text.addMessage(gameState, sourceName,'You can not learn crafting while guarding more than 2 children.  You are guarding '+player.guarding )
        return
    }
    var crafters = pop.countByType(population, 'canCraft', true)
    var noTeachers = pop.countByType(population, 'noTeach', true)
    if (crafters <= noTeachers){
        text.addMessage(gameState, sourceName,'No on in the tribe is able and willing to teach you crafting' )
        return
    }
    learnRoll = dice.roll(2)
    if (referees.includes(sourceName) && forceRoll){
        learnRoll = forceRoll;
        if (learnRoll < 2 || 12 < learnRoll){
            text.addMessage(gameState, sourceName,'Roll must be 2-12' )
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
	pop.history(sourceName, message, gameState);
    gameState.required = true;
    text.addMessage(gameState, "tribe", message );
    return;
}

function onError(interaction, response){
    interaction.user.send(response);
        const embed = new EmbedBuilder().setDescription(response);
		interaction.reply({ embeds: [embed], ephemeral: true }) // error message
			.catch(console.error);
        return
}