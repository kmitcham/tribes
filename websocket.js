const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });
const fs = require('fs');
const util = require('./libs/util.js');
const bcrypt = require('bcrypt');

//let initialData = loadJson("./simpledata.json");
//let initialData = loadJson("./data.json");
let tribe = "bug";
let tribePath = '../tribesAgent/'+tribe+'-tribe/'+tribe+'-tribe.json';
let tribeData = loadJson(tribePath);
let population = tribeData['population'];
let children = tribeData['children'];
let usersDict = loadJson("./users.json");
console.log("kmitcham "+usersDict["kmitcham@gmail.com"].name);

wss.on('connection', ws => {
    // setInterval(() => {
    //     // Send a dictionary every 5 seconds
    //     ws.send(JSON.stringify(population));
    // }, 5000);

    ws.on('message', (message) => {
        try {
            // Parse incoming message
            const data = JSON.parse(message.toString());
            clientId = data.clientId;
            console.log('Received:', data);
            var messageData = null;
            if ('tribe' in data){
                tribe = data.tribe;
                tribePath = '../tribesAgent/'+tribe+'-tribe/'+tribe+'-tribe.json';
            }
            tribeData = loadJson(tribePath);
            population = tribeData['population'];
            children = tribeData['children'];
            // Handle command requests
            if (data.type === 'infoRequest') {
                const { selection } = data;
                if (selection === 'population'){
                    const cleanPop = removeClunkyKeys(population);
                    messageData = {
                        type: 'infoRequest',
                        label: 'population',
                        content: cleanPop
                    };
                } else if (selection === 'children'){
                    messageData = {
                        type: 'infoRequest',
                        label: 'children',
                        content: children
                    };
                } else if (selection === 'status'){
                    statusMessage = util.gameStateMessage(tribeData);
                    messageData = {
                        type: 'infoRequest',
                        label: 'status',
                        content: statusMessage
                    };
                } else {
                    messageData = {
                        type: 'error',
                        message: 'Invalid infoRequest',
                        content: message
                    }
                }
                ws.send(JSON.stringify({
                    messageData
                }));
            } else if (data.type === 'registerRequest'){
                result = registerUser(data);
                if (result){
                    ws.send(JSON.stringify(result));
                }
            } else if (data.type === 'command'){
                // Process the "give" command
                var command = data.command;
                if (command === 'give' && args.length === 4) {
                    const [sourceName, targetName, amount, item] = args;
                    // Capture messages from the give function
                    gameState.messages = []; // Reset messages
                    give(gameState, sourceName, targetName, parseInt(amount), item);

                    // Send the result back to the client
                    const lastMessage = gameState.messages.length > 0 ? gameState.messages[gameState.messages.length - 1] : { message: 'No response' };
                    ws.send(JSON.stringify({
                        type: 'response',
                        command: 'give',
                        success: !lastMessage.message.includes('not found') && !lastMessage.message.includes('does not have'),
                        message: lastMessage.message,
                        clientId
                    }));
                } else {
                    // Invalid command or arguments
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Invalid command or arguments. Expected: give <source> <target> <amount> <item>',
                        clientId
                    }));
                }
            }
        } catch (error) {
            console.error('Error processing message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Error processing command: ' + error.message,
                clientId
            }));
        }
    });

});


function loadJson(fileName) {
	let rawdata = fs.readFileSync(fileName);
	if (!rawdata || rawdata.byteLength == 0 ){
		return {}
	}
	var parsedData = {}
	try {
		parsedData = JSON.parse(rawdata, {});	
	} catch (err){
		console.log('error parsing gamefile:'+err)
		throw err
	}
	return parsedData;
}
console.log('Server started on port 8080');

function removeClunkyKeys(population){
    const cleanedPop = {}
    const clunkyKeys = [
        'handle', 'history', 'inviteIndex', 'inviteList', 'consentList', 'declineList','father'
    ]
    for (const [name, personData] of Object.entries(population)) {
        var cleaned = {}
        for (const [key, value] of Object.entries(personData)) {
            if (clunkyKeys.indexOf(key) != -1){
                // skip it
            } else {
                cleaned[key] = value;
            }
        }
        cleanedPop[name] = cleaned;
    }
    return cleanedPop;
}

function registerUser(userData){
    var name = userData.name;
    var email = userData.email;
    var password = hashPassword(userData.password);
    var clientId = userData.clientId;
    console.log("usersDict "+usersDict);

    for (const [existingEmail, userRecord] of Object.entries(usersDict)){
        if (existingEmail == email && !verifyPassword(password, userRecord.password) ){
            console.log("Invalid password for existing record "+email);
            throw ("Invalid Password");
        }
    }
    for ([existingEmail, existingEntry] of usersDict){
        var existingEntry = usersDict[email];
        console.log("checking existing "+existingEmail);
        if (existingEmail == email && !verifyPassword(password, existingEntry.password)){
            console.log("Invalid password for "+email);
            throw ("Invalid Password");
        }
        if (existingEmail == email && ! (existingEntry.name == name)){
            console.log("No changing of names.  Maybe eventually  "+email);
            throw ("Invalid Name Change");
        }
        if (existingEntry && existingEntry.name == name){
            console.log("Duplicate name "+email);
            throw ("Invalid Duplicate tribe name");
        }
    }
    
    usersDict[email] = userData;
    messageData = {
        type: 'registration',
        label: 'success',
        content: "success"
    };
    return messageData;
}

async function hashPassword(password) {
    const saltRounds = 3; // Higher rounds = slower, more secure
    const hash = await bcrypt.hash(password, saltRounds);
    return hash;
}
async function verifyPassword(password, matchValue) {
    const match = await bcrypt.compare(password, matchValue);
    return match;
}