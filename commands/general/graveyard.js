const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('graveyard')
		.setDescription('Show the dead of the tribe')
        ,
    async execute(interaction, gameState) {
        graveyard(interaction, gameState)
	},
};

function graveyard(interaction, gameState){
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
    return util.ephemeralResponse(interaction, response)
}