const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const reproLib = require("../../libs/reproduction.js");
const pop = require("../../libs/population.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('invite')
		.setDescription('(<partner> [second choice partner] [!save] [!pass] Comma seperated list of who to mate with.')
        .addStringOption(option => 
            option
            .setName('invitelist')
            .setDescription('!save retains it.  If it ENDS with !pass, give up if the players decline.')
        )
        ,
    async execute(interaction, gameState, bot) {
        try {
            var displayName = interaction.member.displayName;
            var rawList = interaction.options.getString('invitelist');
            response = reproLib.invite(gameState, displayName, rawList);
            console.log('invite response was '+response)
        } catch (error) {
                // And of course, make sure you catch and log any errors!
                console.error('invite error'+error);
        }
    },
};
