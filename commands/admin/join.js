const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");
const savelib = require("../../save.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('join')
		.setDescription('join a tribe with open enrollment')
        .addStringOption(option => 
            option
                .setName('gender')
                .setDescription('one of (male, female)')
                .addChoices(
                    { name: 'male', value: 'm' },
                    { name: 'female', value: 'f' },
                )
                .setRequired(true))
        .addStringOption(option => 
            option
                .setName('profession')
                .setDescription('one of (hunter, gatherer, crafter)')
                .addChoices(
                    { name: 'hunter', value: 'h' },
                    { name: 'crafter', value: 'c' },
                    { name: 'gatherer', value: 'g' },
                )
                .setRequired(false))
        ,
    async execute(interaction, gameState, bot) {
        join(interaction, gameState, bot)
	},
};

function join(interaction, gameState, bot){
    if (gameState.population[interaction.user.username]){
        interaction.reply('You are already a memeber of this tribe')
        return
    }
    if (! gameState.open){
        interaction.reply('You need to be inducted by the chief to join this tribe')
        return
    }
    actor = interaction.user
    console.log("joining name is "+interaction.user.username +" actor:"+actor.username)
    addToPopulation(gameState, bot, 
        interaction.user,
        interaction.options.getString('gender'), 
        interaction.options.getString('profession'));
    return
}
function addToPopulation(gameState, bot, actor, gender, profession){
    var sourceName = actor.username;
    console.log("actor is "+actor+" actor.username:"+actor.username)
    target = util.removeSpecialChars(sourceName)
    if (gameState.population[target]){
        actor.send('You are already in the tribe');
        return
    }
    genders = ['make','female']
    if (gender === 'm'){gender = 'male'}
    if (gender === 'f'){gender = 'female'}
    if ( !target || !gender || !genders.includes(gender) ){
        actor.send('usage: jointribe [female|male] [hunter|gatherer|crafter]')
        return
    }
    var person = {};
    person.gender = gender;
    person.food = 10;
    person.grain = 4;
    person.basket = 0;
    person.spearhead = 0;
    person.handle = actor;
    person.name = sourceName;
    if (profession){
        person.profession = profession;
    }
    var strRoll = util.roll(1);
    response = 'added '+target+' '+gender+' to the tribe. ';
    if (strRoll == 1){
        person.strength = 'weak'
        response+= target +' is weak.'
    } else if (strRoll == 6){
        person.strength = 'strong';
        response+= target +' is strong.';
    } 
    gameState.population[target] = person;
    util.messageChannel(response, gameState, bot);
    if (!person.strength){
        util.messagePlayerName(person.name, "You are of average strength", gameState, bot);
    }
    util.history(person.name, "Joined the tribe", gameState);
    savelib.archiveTribe(gameState);
    return
}

function onError(interaction, response){
    interaction.user.send(response);
        const embed = new EmbedBuilder().setDescription(response);
		interaction.reply({ embeds: [embed], ephemeral: true })
			.catch(console.error);
        return
}