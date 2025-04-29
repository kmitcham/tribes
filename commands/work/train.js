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
        worklib.train(gameState, sourceName, forceRoll);
	},
};


function onError(interaction, response){
    interaction.user.send(response);
        const embed = new EmbedBuilder().setDescription(response);
		interaction.reply({ embeds: [embed], ephemeral: true }) // error message
			.catch(console.error);
        return
}