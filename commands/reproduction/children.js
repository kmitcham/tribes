const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const text = require("../../libs/textprocess");
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
        var parentMember = interaction.options.getMember('parent');
        var onlyHungry = interaction.options.getBoolean('hungry');
        var displayName = interaction.member.displayName;
        children( gameState, displayName, onlyHungry, parentMember);
	},
};

function children(gameState, displayName, onlyHungry, parentMember ){
    var population = gameState.population;
    var children = gameState.children;

    if (onlyHungry){
       response = ['These children need food:\n']
        response.push(childlib.showChildren(children, gameState, 'hungry', gameState.secretMating))
    } else if (parentMember){
            var parentName = parentMember.displayName;
            var parentPerson = pop.memberByName( parentName, gameState);
            if (!parentPerson ){
                text.addMessage(gameState, displayName, 'Could not find '+parentName )
            } else {
                response = ['The descendants of '+parentName+' are:\n']
                response.push.apply(response, childlib.showChildren(children, gameState, parentName, gameState.secretMating))
            }
    } else {
        response = childlib.showChildren(children, gameState, "", gameState.secretMating)
    }
    var compiledResponse = " "
    for (part of response){
        compiledResponse = compiledResponse+"\n"+part;
    }
    text.addMessage(gameState, displayName, compiledResponse);
    return 
}