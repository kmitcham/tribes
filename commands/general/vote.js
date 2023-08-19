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
    async execute(interaction, gameState) {
        onCommand(interaction, gameState)
	},
};

// TODO: voting should be more public
function onCommand(interaction, gameState){
    var actorName = interaction.user.displayName
    var player = gameState.population[actorName]
	var candidateName = interaction.options.getMember('candidate').displayName;
	var candidate = gameState.population[candidateName]

    var population = gameState.population;

	if (!candidate){
		msg.author.send(candidateName+' not found in the tribe')
		return
	}
	if (!player){
		msg.author.send('You are not a member of the tribe yet.')
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
	if (totalVotes >= (2/3 * (tribeSize-droneCount))){
		for (personName in gameState.population){
			person = util.personByName(personName, gameState)
			if (person.chief && actorName != targetName){
				delete person.chief
			}
		}
		if (!targetPerson.chief){
			targetPerson.chief =true
			interaction.reply(targetName+' is the new chief', gameState, bot)
		}
	}
	savelib.saveTribe(gameState);

	util.ephemeralResponse(interaction, targetName+' is your choice for Chief')
	return

}