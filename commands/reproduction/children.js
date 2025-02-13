const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");
const childlib = require("../../children.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('children')
		.setDescription('Show the children of the tribe')
        .addUserOption(option => 
            option
                .setName('parent')
                .setDescription('Only show children with a given parent.')
                .setRequired(false))
        .addStringOption( option => 
            option
            .setName('hungry')
            .setDescription('only show hungry children; any value will trigger the filter')
            .setRequired(false))
        ,
    async execute(interaction, gameState) {
        children(interaction, gameState)
	},
};

function children(interaction, gameState){
    var parentMember = interaction.options.getString('parent');
    var onlyHungry = interaction.options.getString('hungry');
    var population = gameState.population;
    var children = gameState.children;

    if (onlyHungry){
       response = ['These children need food:\n']
        response.push(childlib.showChildren(children, population, '!hungry', gameState.secretMating))
    } else if (parentMember){
            var parentName = interaction.options.getMember('parent').displayName;
            var parentPerson = population[parentName];
            if (!parentPerson ){
                util.ephemeralResponse('Could not find '+parentName)
            } else {
                response = ['The descendants of '+parentName+' are:\n']
                response.push.apply(response, childlib.showChildren(children, population, parentName, gameState.secretMating))
            }
    } else {
        response = childlib.showChildren(children, population, "", gameState.secretMating)
    }
    var compiledResponse = " "
    for (part of response){
        compiledResponse = compiledResponse+"\n"+part;
    }
    
    return util.ephemeralResponse(interaction, compiledResponse)
}