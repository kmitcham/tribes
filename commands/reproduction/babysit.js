const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const text = require("../../libs/textprocess.js")


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
            var babysitterName = interaction.options.getString('babysitter');
            var childName = interaction.options.getString('child');
            var actorName = interaction.member.displayName;
            babysit(gameState, actorName, babysitterName, childName)
	},
};

function babysit(gameState, actorName, babysitterName, childName){
    babysitterName = babysitterName.charAt(0).toUpperCase()+ babysitterName.slice(1)
    childName = childName.charAt(0).toUpperCase()+ childName.slice(1)

    var children = gameState.children;
    var babysitter, child;

    if (babysitterName in children ){
        babysitter = children[babysitterName];
    } else {
        text.addMessage(gameState, actorName, "Did not recognize babysitter "+babysitterName);
        return
    }
    if ((childName in children ) && (childName in children)){
        child = children[childName];
    } else {
        text.addMessage(gameState, actorName,  "Did not recognize child "+childName );
        return
    }
    if (babysitter.mother != actorName){
        text.addMessage(gameState, actorName,  'You are not the mother of '+babysitterName );
        return
    }
    
    console.log(" babysitter age:"+babysitter.age+" reproductionRound:"+gameState.reproductionRound)
    if (babysitter.newAdult || ( babysitter.age == 23 && !gameState.reproductionRound )){
        if (child.newAdult){
            text.addMessage(gameState, actorName,  targetChildName+' does not need watching' );
            return
        }
        var response = "";
        if (babysitter.babysitting){
            response += babysitterName+" stops watching "+babysitter.babysitting+".  \n";
        }
        babysitter.babysitting = childName;
        response += babysitterName + " starts watching "+childName;
        text.addMessage(gameState, "tribe", response );
    } else {
        text.addMessage(gameState, actorName,  babysitterName+' is not old enough to watch children' );
        return
    }
    gameState.saveRequired = true;
    return;

}
