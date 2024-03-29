const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");
const savelib = require("../../save.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('babysit')
		.setDescription('Command an adult child to watch a young child')
        .addStringOption(option => 
            option
            .setName('babysitter')
            .setDescription('name of the child being assigned to babysit')
            .setRequired(true))
        .addStringOption(option => 
            option
            .setName('child')
            .setDescription('name of the child to be watched')
            .setRequired(true)),
        async execute(interaction, gameState) {
        await babysit(interaction, gameState)
	},
};

function babysit(interaction, gameState){
    var babysitterName = interaction.options.getString('babysitter');
    babysitterName = babysitterName.charAt(0).toUpperCase()+ babysitterName.slice(1)
    var childName = interaction.options.getString('child');
    childName = childName.charAt(0).toUpperCase()+ childName.slice(1)
    var actorName = interaction.user.displayName;

    var children = gameState.children;
    var babysitter, child;

    if ((babysitterName in children ) && (babysitterName in children)){
        babysitter = children[babysitterName];
    } else {
        util.ephemeralResponse(interaction, "Did not recognize babysitter "+babysitterName);
        return
    }
    if ((childName in children ) && (childName in children)){
        child = children[childName];
    } else {
        util.ephemeralResponse(interaction, "Did not recognize child "+childName);
        return
    }

    if (babysitter.mother != actorName){
        util.ephemeralResponse(interaction,'You are not the mother of '+babysitterName)
        return
    }
    var response = "";
    console.log(" babysitter age:"+babysitter.age+" reproductionRound:"+gameState.reproductionRound)
    if (babysitter.newAdult || ( babysitter.age == 23 && !gameState.reproductionRound )){
        if (targetChild.newAdult){
            util.ephemeralResponse(interaction,targetChildName+' does not need watching');
            return
        }
        if (babysitter.babysitting){
            response += babysitterName+" stops watching "+babysitter.babysitting+".  \n";
        }
        babysitter.babysitting = targetChildName;
        response += babysitterName + " starts watching "+targetChildName;
    } else {
        util.ephemeralResponse(interaction,babysitterName+' is not old enough to watch children'); 
        return
    }
    interaction.reply(response);
    return;

}
