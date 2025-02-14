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
        .addStringOption(option => 
            option
            .setName('child4')
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
    var c1Name  = interaction.options.getString('child1');
    response = ""
    response += guardChild(interaction, gameState, c1Name)+"\n";

    var c2Name  = interaction.options.getString('child2');
    if (c2Name){
        response += guardChild(interaction, gameState, c2Name)+"\n";
    }
    var c3Name  = interaction.options.getString('child3');
    if (c3Name){
        response += guardChild(interaction, gameState, c3Name)+"\n";
    }
    var c4Name  = interaction.options.getString('child4');
    if (c4Name){
        response += guardChild(interaction, gameState, c4Name)+"\n";
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