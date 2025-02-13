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

const savelib = require("./save.js");


client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);
var referees = ["kevinmitcham", "@kevinmitcham"]

var testDictionary = {"start": "value", "number": 10};
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
            allGames[channel.name] = gameState;
        }
    } else {
		interaction.reply("Commands need to be in tribe channels");
		return;
	}

	try {
		await command.execute(interaction, gameState, client);
	} catch (error) {
        console.log("there was an error in that command:",interaction.commandName);
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'Followup: There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'Reply: There was an error while executing this command!', ephemeral: true });
		}
	}
	// I don't think I need to save after EVERY command.
	//savelib.saveTribe(gameState);
	//console.log("saved game state after "+interaction.commandName+ " by "+interaction.member.displayName+" of "+channel.name)
});

client.login(token);
