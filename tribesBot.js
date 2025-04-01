const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, MessageFlags} = require('discord.js');
const { token } = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

// Not sure what this is; it probably came with my example?
var logger = require('winston');
const { ExceptionHandler, child } = require('winston');
// Not sure what this is; it probably came with my example?
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
	alertChannel =  client.channels.cache.find(channel => channel.name === 'server-restarted')
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
        if (!gameState ){
            gameState = savelib.loadTribe(channel.name);
        }
		if (!gameState){
			gameState = savelib.initGame(channel.name);
		}
		if ( gameState.ended && interaction.commandName == "join"){
			console.log("Join on an ended game; starting fresh game");
			gameState = savelib.initGame(channel.name);
		}
		allGames[channel.name] = gameState;
    } else {
		interaction.reply("Tribes commands need to be in a tribe channel");
		return;
	}
	nickName = interaction.member.displayName;
	// if no errors, and we are sure we have a gameState
	try {
		interaction.nickName = nickName?nickName:interaction.user.displayName;
		await command.execute(interaction, gameState, client);
		// send responses to the messages
		await sendMessages(client, gameState, interaction);
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
		channel.send("TribesBot had a problem with the last command.")
	}
});

async function sendMessages(bot, gameState, interaction){
	messagesDict = gameState['messages'];
	if (! messagesDict){
		console.log("sendMessages on empty");
		return;
	}
	actorName = interaction.nickName;
	MAX_LENGTH = 1900; //docs say 2000 is max; better safe than sorry
	// regext [\S\s] is any chacter that is either a space or not a space; eg, any character
	needsReply = interaction.isRepliable();
	if ("tribe" in messagesDict ){
		console.log("in send messages tribe >>"+messagesDict["tribe"]+"<<");
		message = messagesDict["tribe"];
		const chunks = message.match(/[\S\s]{1,1900}/g);
		chunksSent = 0;
		const channel = await bot.channels.cache.find(channel => channel.name === gameState.name);
		if (message){
			if (needsReply ){
				await interaction.reply({ content: chunks[0] });
				chunksSent = 1;
			} else {
				channel.send({content: chunks[chunksSent++] });
			}
			needsReply = false;
		}
		while (chunks && chunksSent < chunks.length){
			console.log("sending bonus chunks to tribe");
			channel.send({content: chunks[chunksSent++] });
		}
		delete messagesDict["tribe"];
	}
	if (actorName in messagesDict && needsReply){
		// only reply here if reply is still needed; otherwise handle with other messages below
		const message = messagesDict[actorName];
		const chunks = message.match(/[\S\s]{1,1900}/g);
		console.log("message was split in chunks:"+chunks.length);
		if (message && interaction.isRepliable() ){
			needsReply = false;
			user = interaction.user;
			response = chunks[0];
			chunksSent = 0;
			if (chunks.length > 1){
				response += " \n(check DMS for more info)"
			}
			await interaction.reply({ content: response, flags: MessageFlags.Ephemeral })
			// double tap user so they have a DM of content as well.  TODO: confirm this is correct?
			await user.send(chunks[chunksSent++]);
			if (chunksSent < chunks.length){
				sendRemainingMessageChunksToUser(user, chunks, chunksSent);
			}
			delete messagesDict[actorName];
			//console.log("in send messages finish send to actor >>>>>>>>>"+message+"<<<<<<");
		} else {
			console.log("null message for "+actorName+ " seasonCounter:"+gameState.seasonCounter)
		}
	}
    for (const [address, message] of Object.entries(messagesDict)){
		channel = interaction.channel;
		member = pop.memberByName(address, gameState);
		const chunks = message.match(/[\S\s]{1,1900}/g);
		console.log("message was split in chunks:"+chunks.length);
		console.log("in send messages 4 "+address);
		if (!member){
			console.log("No member for name "+address);
			continue;
		}
		if (!message){
			console.log("Not sending empty message to "+address);
			continue;
		}
		userHandle = member["handle"]
		if (userHandle){
			var userId = "";
			// different clients call it different things
			if ("id" in userHandle){
				userId = userHandle["id"];
			} else if ( "userId" in userHandle){
				userId = userHandle["userId"];
			} else {
				console.log("Could not get an ID for "+address);
				continue;
			}
			const user = bot.users.cache.get(userId);
			if (! user){
				console.log("not finding user for "+address+" userId="+userId)
			} else {
				console.log("user object was found for "+user.displayName);
				chunksSent = 0;
				sendRemainingMessageChunksToUser(user, chunks, chunksSent);
			}
			console.log("messages complete  for "+address);
		} else {
			console.log("no handle for "+address);
		}
        delete messagesDict[address]
    }
	if (needsReply){
		console.log(" no reply to "+interaction.commandName);
		needsReply = false
	}
	return 0;
}

function sendRemainingMessageChunksToUser(user, messageArray, chunksSent){
	if (! user || !messageArray || (chunksSent > messageArray.length)){
		console.error("bad call to send remaining messages ");
		return;
	}
	while (chunksSent < messageArray.length){
		if (messageArray[chunksSent]){
			user.send({content: messageArray[chunksSent++] });
		} else {
			console.log("empty chunk?  chunkSent:"+chunksSent);
			chunksSent++; //increment to avoid infinite loops
		}
	}
	console.log("messages sent.  chunksSent = "+chunksSent);
	return;
}


// Assuming you have a Discord.js client set up and authenticated
// and you have a user object and guild ID
async function getUserNickname(client, userId, guildId) {
	try {
	  // Get the guild object
	  const guild = await client.guilds.fetch(guildId);
	  
	  // Get the GuildMember object for the user in this specific guild
	  const guildMember = await guild.members.fetch(userId);
	  
	  // Get the nickname (or username if no nickname is set)
	  const nickname = guildMember.nickname || guildMember.user.username;
	  
	  return nickname;
	} catch (error) {
	  console.error('Error fetching nickname:', error);
	  return null;
	}
  }
client.login(token);

