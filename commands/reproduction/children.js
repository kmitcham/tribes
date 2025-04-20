const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const childlib = require("../../libs/children.js");
const pop = require("../../libs/population.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('children')
		.setDescription('Show the children of the tribe')
        .addUserOption(option => 
            option
                .setName('parent')
                .setDescription('Only show children with a given parent. (parent and hungry are exclusive)')
                .setRequired(false))
        .addBooleanOption( option => 
            option
            .setName('hungry')
            .setDescription('only show hungry children; any value will trigger the filter')
            .setRequired(false))
        ,
    async execute(interaction, gameState) {
        var filterParentUser = interaction.options.getMember('parent')
        filterParentName = null;
        if (filterParentUser){
            filterParentName = filterParentUser.displayName;
        }
        var onlyHungry = interaction.options.getBoolean('hungry');
        var displayName = interaction.member.displayName;
        childlib.showChildrenPrep( gameState, displayName, onlyHungry, filterParentName);
	},
};
