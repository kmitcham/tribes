const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");
const savelib = require("../../save.js");
const guardlib = require("../../guardCode.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ignore')
		.setDescription('Remove a child from the list of children you are guarding.  Use name "all" to stop guarding')
		.addStringOption(option => 
            option
            .setName('child')
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
	var cName = interaction.options.getString('child');
    var actorName = interaction.user.displayName;
    var person = gameState.population[actorName];

	if (person.worked == true){
        util.ephemeralResponse(interaction,'You can not change guard status after having worked.')
		return
	}
	if (gameState.workRound == false){
        util.ephemeralResponse(interaction,'You can not change guard status outside the work round')
		return
	}
    response = ""
    response += ignoreChild(interaction, gameState, cName)+"\n";
    cName  = interaction.options.getString('child1');
    if (cName){
        response += ignoreChild(interaction, gameState, cName)+"\n";
    }
    cName  = interaction.options.getString('child2');
    if (cName){
        response += ignoreChild(interaction, gameState, cName)+"\n";
    }
    if (response.includes("FAIL")){
        util.ephemeralResponse(interaction, response);
    } else {
        interaction.reply(response);
        console.log("Saving gameState");
        savelib.saveTribe(gameState);
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
    childName = util.capitalizeFirstLetter(cName)
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