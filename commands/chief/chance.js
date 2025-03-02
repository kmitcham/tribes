const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const guardlib = require("../../libs/guardCode.js")
const dice = require("../../libs/dice.js")
const chief = require("../../libs/chief.js")
const referees = require("../../libs/referees.json")
const text = require("../../libs/textprocess")
const pop = require("../../libs/population")

module.exports = {
	data: new SlashCommandBuilder()
		.setName('chance')
		.setDescription('Do the chance roll to end the season. (Chief only)')
        .addIntegerOption(option =>
            option.setName('force')
            .setDescription('referee can force a die roll value 3-18')
            .setRequired(false)
            )

        ,
    async execute(interaction, gameState, bot) {
        var roll = dice.roll(3)
        var sourceName = interaction.user.displayName;
        var forceRoll = interaction.options.getInteger('force');
        if (chief.isChanceLegal(gameState, sourceName)){
            chief.doChance(roll, gameState);
        }
    }
};

