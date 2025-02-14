const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");
const savelib = require("../../save.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('specialize')
		.setDescription('Choose a profession: Hunt, Gather, Craft')
        .addStringOption(option => 
            option
            .setName('profession')
            .setDescription('one of (hunt, gather, craft)')
            .addChoices(
                { name: 'hunter', value: 'hunt' },
                { name: 'crafter', value: 'craft' },
                { name: 'gatherer', value: 'gather' },
            )
            .setRequired(true)),
    async execute(interaction, gameState, bot) {
        const actor = interaction.member;
        playerName = actor.displayName?actor.displayName:actor.username
        const profession = interaction.options.getString('profession')
        message = filterspecialize(playerName, profession, gameState, bot);
        util.messageChannel(message, gameState, bot)
        interaction.reply(playerName+" knows how to "+profession)
	},
};

function filterspecialize(playername, profession, gameState, bot){
    player = util.personByName(playername, gameState);
    if (! player){
        console.log("no player found for "+playername)
        return "You must join the tribe to specialize"
    }
    if (player.profession){
        return "You already have a profession"
    }
    message = util.specialize(playerName, profession, gameState, bot)
    savelib.saveTribe(gameState);
    
}