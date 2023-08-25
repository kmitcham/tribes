const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");
const savelib = require("../../save.js");
const guardlib = require("../../guardCode.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('guard')
		.setDescription('Add a child to the list of children you are guarding.  Use name "none" to stop guarding')
		.addStringOption(option => 
            option
            .setName('child')
            .setDescription('one of children of the tribe')
            .setRequired(true))
            .addStringOption(option => 
            option
            .setName('child2')
            .setDescription('another of child of the tribe')
            .setRequired(false))
            .addStringOption(option => 
            option
            .setName('child3')
            .setDescription('another of child of the tribe')
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

    response = ""
    response += guardChild(interaction, gameState, cName)+"\n";
    cName  = interaction.options.getString('child1');
    if (cName){
        response += guardChild(interaction, gameState, cName)+"\n";
    }
    cName  = interaction.options.getString('child2');
    if (cName){
        response += guardChild(interaction, gameState, cName)+"\n";
    }
    if (response.includes("FAIL")){
        util.ephemeralResponse(interaction, response);
    } else {
        if (person.guarding){
            interaction.reply(actorName+' starts guarding '+person.guarding);
        } else {
            interaction.reply(actorName+ ' is not guarding any children');
        }
        console.log("Saving gameState");
        savelib.saveTribe(gameState);
    }
}

function guardChild(interaction, gameState, cName){
    var actorName = interaction.user.displayName;
    var person = gameState.population[actorName];
    children = gameState.children;
    var response = "";
    console.log("inside guard cName "+util.capitalizeFirstLetter(cName)+" actorName "+actorName);
    if (!person){
        return 'FAIL: you are not a person'
    }
    if (person.worked == true|| gameState.workRound == false){
        return 'FAIL You can not change guard status after having worked, or outside the work round';
    }
    if (util.capitalizeFirstLetter(cName) == "None"){
        if (person.guarding){
            response += actorName+" stops watching "+person.guarding
        }
        delete person.guarding;
        return response;
    }
    if (person.guarding && person.guarding.length > 4){
        return 'FAIL You are already guarding enough children: '+person.guarding;
    }
    if (person.isSick && person.isSick > 0 ){
        return 'FAIL You are too sick to watch children';
    }
    childName = util.capitalizeFirstLetter(cName)
    console.log("checking "+childName );
    child = children[childName]
    if (!child ){
        return 'FAIL Could not find child: '+childName
    } else if (person.guarding && person.guarding.indexOf(childName) != -1 ){
        console.log(person.guarding);
        return 'FAIL You are already guarding '+childName;
    } else {
        console.log("valid guard "+childName);
        if (person.guarding){
            person.guarding.push(childName)
        } else {
            person.guarding = [childName]
        }
        return "You start guarding "+childName;
    }
}