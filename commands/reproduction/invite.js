const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const reproLib = require("../../libs/reproduction.js");
const pop = require("../../libs/population.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('invite')
		.setDescription('(<partner> [other choice(s) partner] [!pass] Comma separated list of who to mate with.')
        .addStringOption(option => 
            option
            .setName('invitelist')
            .setDescription('If the list ENDS with !pass, give up if the listed players decline.')
        )
        ,
    async execute(interaction, gameState, bot) {
        try {
            var displayName = interaction.member.displayName;
            var rawList = interaction.options.getString('invitelist');
            var cleanArray = pop.convertStringToArray(rawList);
            if (true){
                var processedList = []
                for (value of cleanArray){
                    processedList.push(pop.nameFromAtNumber(value, bot));
                }
                response = reproLib.invite(gameState, displayName, processedList);
            } else {
                response = reproLib.invite(gameState, displayName, rawList);
            }
            console.log('invite response was '+response);
        } catch (error) {
                console.error('invite error '+error);
        }
    },
};
