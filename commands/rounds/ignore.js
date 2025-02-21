const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const guardlib = require("../../libs/guardCode.js");
const text = require("../../libs/textprocess.js")
const pop = require("../../libs/population.js")

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
        var actorName = interaction.user.displayName;
        var cName = interaction.options.getString('child1');
        var cName2  = interaction.options.getString('child2');
        var cName3  = interaction.options.getString('child3');
        ignoreChildren(gameState, actorName, cName, cName2, cName3);
	},
};

function ignoreChildren(gameState, actorName, cName, cName2, cName3 ){

    var person = pop.memberByName(actorName, gameState);

	if (person.worked == true){
        text.addMessage(gameState, actorName, 'You can not change guard status after having worked.');
		return
	}
	if (gameState.workRound == false){
        text.addMessage(gameState, actorName, 'You can not change guard status outside the work round.');
		return
	}
    response = ""
    response += ignoreChild(gameState, actorName, cName)+"\n";
    if (cName2){
        response += ignoreChild(gameState, actorName, cName2)+"\n";
    }
    if (cName3){
        response += ignoreChild(gameState, actorName, cName3)+"\n";
    }
    if (response.includes("FAIL")){
        text.addMessage(gameState, actorName, response);
    } else {
        text.addMessage(gameState, actorName, response);
        gameState.saveRequired = true
    }
}

function ignoreChild( gameState, actorName, cName){
    var person = pop.memberByName(actorName, gameState);
    children = gameState.children;
    var response = "";
    console.log("inside ignore cName "+text.capitalizeFirstLetter(cName)+" actorName "+actorName);
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