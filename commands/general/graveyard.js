const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const text = require('../../libs/textprocess');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('graveyard')
		.setDescription('Show the dead of the tribe')
        ,
    async execute(interaction, gameState) {
        var displayName = interaction.user.displayName;
        graveyard(displayName, gameState)
	},
};

function graveyard(displayName, gameState){
    
    var response = "Graveyard:";
    if ( Object.keys(gameState.graveyard ).length == 0){
        response += ' is empty'
    } else {
        for (var name in gameState.graveyard){
            // TODO flesh this out
            person = gameState.graveyard[name]
            response += '\n '+name+' died of '+person.deathMessage
            if (person.mother){
                response += ' parents:'+person.mother 
                if (gameState.secretMating){
                    response += '-???'
                } else {
                    response += '-'+person.father
                }
                response += ' age:'+person.age/2
            } else {
                response += ' profession:'+person.profession
            }
            response += ' gender:'+person.gender
        }
    }
    text.addMessage(gameState, displayName, response);
    return;
}