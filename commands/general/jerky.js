const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");

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
        var sourceName = interaction.user.displayName;
        message = jerky(sourceName, amount, gameState, bot)
        interaction.reply(message)
	},
};

function jerky(sourceName, amount, gameState, bot){
    if (! gameState.canJerky){
        return "Conditions are not right for making jerky now."
    }
    player = util.personByName(sourceName, gameState);
    actualFood = player.food
    if (amount > actualFood){
        amount = actualFood;
    }
    jerky = amount/3;
    leftover = amount - (jerky * 3);
    player.food = actualFood - amount + leftover
    message = sourceName+" converts "+(jerky * 3)+" food into "+jerky+" jerky";
    return message;
}
