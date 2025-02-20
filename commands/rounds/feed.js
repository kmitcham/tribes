const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const worklib = require("../../libs/work.js")
const feedlib = require("../../libs/feed.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('feed')
		.setDescription('feed food (or grain, if that is all you have) to a child. ')
        .addStringOption(option => 
            option
            .setName('child')
            .setDescription('name of the child to feed, or space seperated list of names. or use !all ')
            .setRequired(true))
        .addIntegerOption(option => 
            option.setName('amount')
            .setDescription('amount to feed (default is until the child is no longer hungery)')
            .setRequired(false))
        ,
    async execute(interaction, gameState) {
        await feed(interaction, gameState)
	},
};

function feed(interaction, gameState){
    var sourceName = interaction.user.displayName;
    var amount = interaction.options.getInteger('amount') || 2;
    var rawList = interaction.options.getString('child');    
    var population = gameState.population;
    player = population[sourceName]

    if (amount < 0 &&  !util.referees.includes(sourceName) ){
        msg.author.send('Only the referee can reduce amounts')
        cleanUpMessage(msg);; 
        return
    }
    if (!player ){
        // this makes sure the author is in the tribe
        console.log("Children do not take food from strangers")
        return
    }
    if (gameState.reproductionRound  && gameState.needChanceRoll){
        util.ephemeralResponse(interaction, "Must wait until after chance to feed the children.")
        return
    }
    childList = rawList.split(' ');
    //module.exports.feed = ( msg, player, amount, childList,  gameState) =>{
    message = feedlib.feed(interaction, player, amount, childList, gameState);
    console.log('return '+message);
    interaction.reply(message);
    gameState.saveRequired=true
    return
}
function onError(interaction, response){
    interaction.user.send(response);
        const embed = new EmbedBuilder().setDescription(response);
		interaction.reply({ embeds: [embed], ephemeral: true })
			.catch(console.error);
        return
}