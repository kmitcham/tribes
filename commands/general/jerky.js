const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pop = require("../../libs/population.js")
const text = require("../../libs/textprocess.js")

module.exports = {
	data: new SlashCommandBuilder()
		.setName('jerky')
		.setDescription('When conditions allow, convert 3 food to 1 grain')
        .addIntegerOption(option => 
            option.setName('amount')
            .setDescription('amount of food to convert to grain')
            .setRequired(true))
            ,
    async execute(interaction, gameState, bot) {
        const amount = interaction.options.getInteger('amount');
        var sourceName = interaction.member.displayName;
        message = makeJerky(sourceName, amount, gameState, bot)
	},
};

function makeJerky(sourceName, amount, gameState, bot){
    if (! gameState.canJerky){
        return "Conditions are not right for making jerky now."
    }
    player = pop.memberByName(sourceName, gameState);
    actualFood = player.food
    if (amount > actualFood){
        amount = actualFood;
    }
    extra = amount%3
    jerky = (amount-extra)/3;
    leftover = amount - (jerky * 3);
    player.food = actualFood - amount + leftover
    player.grain += jerky
    message = sourceName+" converts "+(jerky * 3)+" food into "+jerky+" jerky";
    text.addMessage(gameState, "tribe", message);
    return;
}
