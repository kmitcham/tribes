const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, MessageFlags} = require('discord.js');
const { token } = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

var logger = require('winston');
const { ExceptionHandler, child } = require('winston');
const { ConsoleTransportOptions } = require('winston/lib/winston/transports');
// Not sure what this is; it probably came with my example?
const { spawn } = require('child_process');

const savelib = require("./libs/save.js");
const pop = require("./libs/population.js")

client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

var allGames = {}
var alertChannel = {};

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			console.log("setting command "+filePath)
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

client.once(Events.ClientReady, () => {
	console.log('Tribes Ready!');
    var d = new Date();
	var n = d.toISOString();
	alertChannel =  client.channels.cache.find(channel => channel.name === 'bug-reports')
	alertChannel.send('TribesBot is alive again. '+n)
});
client.once('reconnecting', () => {
    console.log('Reconnecting Tribes!');
});
client.once('disconnect', () => {
    console.log('Disconnect Tribes!');
});

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = client.commands.get(interaction.commandName);
    if (!command) return;
    let channel = await client.channels.fetch(interaction.channelId);
	console.log("command "+interaction.commandName+ " by "+interaction.member.displayName+" of "+channel.name);
    if (channel.name.endsWith('tribe')){
        gameState = allGames[channel.name];
        if (!gameState || gameState.ended ){
            gameState = savelib.loadTribe(channel.name);
            if (!gameState || gameState.ended ){
                console.log('creating game '+channel.name);
				gameState = savelib.initGame(channel.name, client )
            }
        }
		allGames[channel.name] = gameState;
    } else {
		interaction.reply("Commands need to be in tribe channels");
		return;
	}
	// if no errors, and we are sure we have a gameState
	try {
		await command.execute(interaction, gameState, client);
		sendMessages(client, gameState, interaction);
		if (gameState.saveRequired){
			savelib.saveTribe(gameState);
			gameState.saveRequired = false;
		}
		if (gameState.archiveRequired){
			savelib.archiveTribe(gameState);
			gameState.archiveRequired = false;
		}
	} catch (error) {
        console.log("there was an error in that command:");
		console.error(error);
		if (interaction){
			console.log("Command was "+interaction.commandName)
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({ content: 'Followup: There was an error while executing this command!', ephemeral: true });
			} else {
				await interaction.reply({ content: 'Reply: There was an error while executing this command!', ephemeral: true });
			}
 		} else {
			console.log("interaction is not responded to, since it seems to be gone.")
		}
	}
});

async function sendMessages(bot, gameState, interaction){
	messagesDict = gameState['messages'];
	if (! messagesDict){
		console.log("sendMessages on empty");
		return;
	}
	actorName = interaction.user.displayName;
	//console.log("in send messages  1 "+actorName+ " "+Object.keys(messagesDict));
	needsReply = true;
	// if exists message for the tribe, use interaction.reply
	// else if exists message for interaction actor, use interaction.reply({ephermal:true})
	// else {
	//		interaction.reply("acknowledged")
	//		for each message{
	//			sendMessage using channel  TODO: resolve this magic
	//		}
	//}
	if ("tribe" in messagesDict ){
		console.log("in send messages tribe:"+messagesDict["tribe"]);
		message = messagesDict["tribe"];
		needsReply = false;
		if (message){
			if (interaction ){
				await interaction.reply({ content: message });
			} else {
				const channel = await bot.channels.cache.find(channel => channel.name === gameState.name);
				channel.send({content: message});
			}
		}
		delete messagesDict["tribe"];
	}
	if (actorName in messagesDict && needsReply){
		// only reply here if reply is still needed; otherwise handle with other messages below
		const message = messagesDict[actorName];
		if (message){
			console.log("in send messages send to actor: "+message);
			needsReply = false;
			user = interaction.user;
			await interaction.reply({ content: message, flags: MessageFlags.Ephemeral })
			// double tap user so they have a DM of content as well.  TODO: confirm this is correct?
			await user.send(message);
			delete messagesDict[actorName];
			//console.log("in send messages finish send to actor >>>>>>>>>"+message+"<<<<<<");
		} else {
			console.log("null message for "+actorName+ " seasonCounter:"+gameState.seasonCounter)
		}
	}
    for (const [address, message] of Object.entries(messagesDict)){
		channel = interaction.channel;
		member = pop.memberByName(address, gameState);
		console.log("in send messages 4 "+address);
		if ( !member){
			console.log("No member for name "+address);
			continue;
		}
		if (!message){
			console.log("Not sending empty message to "+address);
			continue;
		}
		userHandle = member.handle
		if (userHandle && userHandle.id){
			console.log("in send messages 4.5 "+message);
			const user = bot.users.cache.get(userHandle.id);
			if (! user){
				console.log("not finding user for "+address)
			} else {
				console.log("in send messages 4.9 "+user.displayName+" "+message);
				await user.send(message)
			}
			console.log("in send messages 5");
		}
        delete messagesDict[address]
    }
	if (needsReply){
		console.log(" no reply to "+interaction.commandName);
		interaction.reply({ content: "Not sure I understand that.", flags: MessageFlags.Ephemeral });
		needsReply = false
	}
	return 0;
}
async function  messageMember(bot, gameState, memberName, message) {
    console.log(memberName+" has no handle or id- maybe a drone? ")
    return -3
}

function getChannelForTribe(bot, gameState){
	const tribeName = gameState.name;
	const channels = bot.channels;
	for (channel in channels){
		if (channel.name = tribeName){
			return channel;
		}
	}
	console.log("Could not find channel for "+tribeName);
	return null;
}

client.login(token);

