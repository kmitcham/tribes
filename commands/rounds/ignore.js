const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const guardlib = require("../../libs/guardCode.js");
const text = require("../../libs/textprocess.js")

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ignore')
		.setDescription('Remove a child from the list of children you are guarding.  Use name "all" to stop guarding')
		.addStringOption(option => 
            option
            .setName('child1')
            .setDescription('one of children of the tribe')
            .setRequired(true))
            .addStringOption(option => 
            option
            .setName('child2')
            .setDescription('another child of the tribe')
            .setRequired(false))
            .addStringOption(option => 
            option
            .setName('child3')
            .setDescription('another child of the tribe')
            .setRequired(false))
        ,
    async execute(interaction, gameState) {
        onCommand(interaction, gameState)
	},
};

function onCommand(interaction, gameState){
	var cName = interaction.options.getString('child1');
    var actorName = interaction.user.displayName;
    var person = gameState.population[actorName];

	if (person.worked == true){
        text.addMessage(gameState, actorName, 'You can not change guard status after having worked.');
		return
	}
	if (gameState.workRound == false){
        text.addMessage(gameState, actorName, 'You can not change guard status outside the work round.');
		return
	}
    response = ""
    response += ignoreChild(interaction, gameState, cName)+"\n";
    var cName2  = interaction.options.getString('child2');
    if (cName2){
        response += ignoreChild(interaction, gameState, cName2)+"\n";
    }
    var cName3  = interaction.options.getString('child3');
    if (cName){
        response += ignoreChild(interaction, gameState, cName3)+"\n";
    }
    if (response.includes("FAIL")){
        text.addMessage(gameState, actorName, response);
    } else {
        interaction.reply(response);
        gameState.saveRequired = true
    }
}

function ignoreChild(interaction, gameState, cName){
    var actorName = interaction.user.displayName;
    var person = gameState.population[actorName];
    children = gameState.children;
    var response = "";
    console.log("inside ignore cName "+util.capitalizeFirstLetter(cName)+" actorName "+actorName);
    if ("all" == cName.toLowerCase() && person.guarding && person.guarding.length > 0){
        response = actorName+' stops guarding '+person.guarding +"\n";
        delete person.guarding;
        return response;
    }
    childName = text.capitalizeFirstLetter(cName)
    child = children[childName];
    if (!child ){
        return 'FAIL: Could not find child: '+childName;
    } else if (!person.guarding || person.guarding.indexOf(childName) == -1 ){
       return  'FAIL: You are not guarding '+childName;
    } else {
        childIndex = person.guarding.indexOf(childName)
        if (childIndex > -1) {
            person.guarding.splice(childIndex, 1);
        }
        return actorName+' stops guarding '+childName +"\n";
    }


}