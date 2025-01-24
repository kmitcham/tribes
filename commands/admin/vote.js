const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require("../../util.js");
const savelib = require("../../save.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('vote')
		.setDescription('Select someone to be chief.  A majority wins.')
		.addUserOption(option => 
            option
                .setName('candidate')
                .setDescription('Which tribe member to vote for')
                .setRequired(true))
	,
    async execute(interaction, gameState, bot) {
		var actorName = util.getNameFromUser(interaction.user);
		var candidateName = util.getNameFromUser(interaction.options.getMember('candidate'));
        vote(interaction, gameState, bot, actorName, candidateName)
		interaction.reply("You support "+candidateName+" as chief of the tribe")
	},
};

// TODO: voting should be more public
function vote(interaction, gameState, bot, actorName, candidateName){
    var player = util.personByName(actorName, gameState)
	var candidate = util.personByName(candidateName, gameState)

    var population = gameState.population;

	if (!candidate){
		util.ephemeralResponse(interaction, candidateName+' not found in the tribe')
		return
	}
	if (!player){
		util.ephemeralResponse(interaction,'You are not a member of the tribe yet.')
		return
	}
	player.vote = candidateName
	totalVotes = util.countByType(gameState.population, 'vote', candidateName)
	tribeSize = Object.keys(gameState.population).length
	droneCount = 0;
	for (memberName in gameState.population){
		temp = population[memberName]
		if (temp.golem) {
			droneCount = droneCount+1
		}
	}
	console.log("Drone count is "+droneCount);
	util.messageChannel(actorName+" supports "+candidateName+" as chief", gameState, bot);
	// count all existing votes
	if (totalVotes >= (2/3 * (tribeSize-droneCount))){
		// clear the previous chief
		for (personName in gameState.population){
			person = util.personByName(personName, gameState)
			if (person.chief){
				delete person.chief
			}
		}
		candidate.chief = true
		util.history(candidateName, "became chief", gameState);
		util.messageChannel(candidateName+' is the new chief', gameState, bot)
	}
	savelib.saveTribe(gameState);

	return true

}