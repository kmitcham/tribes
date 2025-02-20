const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
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
		sendMessages(client, gameState, channel);
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

function sendMessages(bot, gameState, channel){
    messagesDict = gameState['messages'];
   for (const [address, message] of Object.entries(messagesDict)){
        if (address == 'tribe'){
            messageTribe(channel, gameState, messagesDict[address])
        } else {
            messageMember(bot, gameState, address, messagesDict[address] )
        }
        delete messagesDict[address]
    }
}
async function  messageMember(bot, gameState, memberName, message) {
    member = pop.memberByName(memberName, gameState);
    if ( !member){
        console.log("No member for name "+memberName)
        return -1
    }
    if (!message){
        console.log("Not sending empty message to "+memberName)
        return -2
    }
    userHandle = member.handle
    if (userHandle && userHandle.id){
        user = await bot.users.fetch(userHandle.id);
        user.send(message)
        return 0
    }
    console.log(memberName+" has no handle or id- maybe a drone? ")
    return -3
}
async function messageTribe(channel, gameState, message){
	if (!message || message.length == 0 ){
		console.log("Not sending empty message to channel:"+message)
		return -2
	}
	if (channel){
		channel.send(message)
        return 0
	} else {
		console.log('no channel found for '+gameState.name)
        return -3
	}
}


client.login(token);

