const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const text = require("../../libs/textprocess")
const prof = require("../../libs/profession")
const pop = require("../../libs/population")
const dice = require("../../libs/dice")

module.exports = {
	data: new SlashCommandBuilder()
		.setName('induct')
		.setDescription('add a person to the tribe. (Chief only')
        .addUserOption(option => 
            option
                .setName('target')
                .setDescription('Discord user to add to the tribe')
                .setRequired(true))
        .addStringOption(option => 
            option
                .setName('gender')
                .setDescription('one of (male, female)')
                .addChoices(
                    { name: 'male', value: 'male' },
                    { name: 'female', value: 'female' },
                )
                .setRequired(true))
        .addStringOption(option => 
            option
                .setName('profession')
                .setDescription('one of (hunter, gatherer, crafter)')
                .addChoices(
                    { name: 'hunter', value: 'hunter' },
                    { name: 'crafter', value: 'crafter' },
                    { name: 'gatherer', value: 'gatherer' },
                )
                .setRequired(false))
        ,
    async execute(interaction, gameState) {
        targetObject = interaction.options.getMember('target')
        var targetName = targetObject.displayName;
        var gender = interaction.options.getString('gender')
        var profession = interaction.options.getString('profession')
        var sourceName = interaction.member.displayName;        
        await induct(gameState, sourceName, targetName, gender, profession);
	},
};

function induct(gameState, sourceName, targetName, gender, profession){
    var chief = pop.memberByName(sourceName, gameState)
	
    if (!chief ){
        response = "You must be in the tribe to do that";
        text.addMessage(gameState, "tribe", response);
        return
    }
    if (!chief.chief){
        response = "You must be chief to induct a member";
        text.addMessage(gameState, "tribe", response);
        return
    }
    if ( gameState.ended ){
        text.addMessage(gameState, sourceName,  'The game is over.  Maybe you want to /join to start a new game?');
        return
    }

	console.log("message b")

    pop.addToPopulation(gameState, targetName, gender, profession, targetObject)    
}