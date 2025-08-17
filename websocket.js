const WebSocket = require('ws');
const logger = require('./libs/logger.js');
const PORT = 9090;
const fs = require('fs');
const util = require('./libs/util.js');
const bcrypt = require('bcrypt');

var wss;
logger.errorLog.info('Test error log');
logger.accessLog.info('Test access log');
logger.accessLog.info('Server started on port '+PORT);
try {
    wss = new WebSocket.Server({ port: PORT });
} catch (error) {
    logger.errorLog.error('Error setting up webserver:', error);
    exit;
}


let tribe = "bear";
let tribePath = '../tribesAgent/'+tribe+'-tribe/'+tribe+'-tribe.json';
let tribeData = loadJson(tribePath);
let population = tribeData['population'];
let children = tribeData['children'];
let usersDict = loadJson("./users.json");


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
            // info is all the data you can get without being logged in
            if (data.type === 'infoRequest') {
                const selection = data.selection;
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
                        type: 'infoRequest',
                        label: 'error',
                        content: 'Invalid infoRequest:'+selection
                    }
                }
                var asString = JSON.stringify(messageData);
                ws.send(asString);       
            } else if (data.type === 'registerRequest'){
                // needs to handle promise since decrypt can be slow
                var response = {};
                registerUser(data).then(result => 
                    {
                        console.log("sending response:"+result);
                        for (var [key, value] of Object.entries(result)){
                            console.log(key+" "+value);
                        }
                        var asString = JSON.stringify(result);
                        ws.send(asString);          
                        sendSecrets(ws, data);
                    }).catch(error => {
                        console.error("Failed to get user data:", error);
                    });
                console.log("register complete")   
            } else if (data.type === 'romanceRequest'){
                if (validateUser(data)){
                    romanceUpdate = processRomance(data, tribeData);
                    var asString = JSON.stringify(romanceUpdate);
                    ws.send(asString);
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

function sendSecrets(ws, data){
    var romanceUpdate = processRomance(data, tribeData);
    var asString = JSON.stringify(romanceUpdate);
    console.log("sending romance secret "+asString);
    ws.send(asString);
}

function _array_match(array1, array2){
    if (! array1 && ! array2){
        return true;
    }
    if (!array1 || !array2){
        return false;
    }
    if(array1.sort().join(',')=== array2.sort().join(',')){
        return true;
    }
    return false;
}

function processRomance(data, tribeData){
    var name = data.name;
    var tribe = data.tribe;
    var inviteList = data.inviteList;
    var declineList = data.declineList;
    var consentList = data.consentList;
    var responseData = {}
    // if the user is in the tribe
    var userData = tribeData['population'][name];
    if (userData){
        if ( inviteList && ! _array_match(inviteList, userData['inviteList'])){
            console.log("updating inviteList for "+name+" in "+tribe)
            userData['inviteList'] = inviteList;
            console.log("inviteList:"+tribeData['population'][name]['inviteList'].join())
        }
        if ( declineList && ! _array_match(declineList, userData['declineList'])){
            console.log("updating declineList for "+name+" in "+tribe)
            userData['declineList'] = declineList;
        }
        if ( consentList && ! _array_match(consentList, userData['consentList'])){
            console.log("updating consentList for "+name+" in "+tribe)
            userData['consentList'] = consentList;
        }
        var romanceContent = {}
        romanceContent['inviteList'] = userData['inviteList'];
        romanceContent['consentList'] = userData['consentList'];
        romanceContent['declineList'] = userData['declineList'];
        
        responseData = {
            type: 'infoRequest',
            label: 'romance',
            content: romanceContent
        };
        // should do some stuff to update if the incoming data doesn't exist or something
    } else {
        console.error("Did not find "+name+" in tribe "+tribeData['name']);
        responseData = {
            type: 'error',
            label: 'romance',
            content: 'No such user in tribe'
        };
    }
    return responseData;
}

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

function validateUser(userData){
    var name = userData.name;
    var email = userData.email;
    var password = hashPassword(userData.password);
    var clientId = userData.clientId;
    for (const [existingEmail, userRecord] of Object.entries(usersDict)){
        if (existingEmail == email && !verifyPassword(password, userRecord.password) ){
            console.log("Invalid password for existing record "+email);
            return false;
        }
    }
    return true;
}

async function registerUser(userData){
    var name = userData.name;
    var email = userData.email;
    var password = "";
    hashPassword(userData.password).then(hashedValue => { password = hashedValue});
    userData.password = password
    var errors = "";
    var existed = false;
    for (const [existingName, userRecord] of Object.entries(usersDict)){
        if (existingName == name){
            var validPassword = verifyPassword(password ,userData.password);
            if (password && !validPassword ){
                console.log("Invalid password for existing player "+name);
                errors= "Invalid Password";
                break;
            } else {
                existed = true;
            }
        }
    }
    if (errors.length > 0){
        messageData = {
            type: 'registration',
            label: 'error',
            content: errors
        }
    } else {
        if (existed){
            console.log("returning user "+name);
        } else {
            console.log("Adding "+name+" "+email+" to list of users")
            usersDict[name] = userData;
            actuallyWriteToDisk("users.json",usersDict);
        }
        messageData = {
            type: 'registration',
            label: 'success',
            content: "success"
        };    
    }
    return messageData;
}

async function hashPassword(password) {
    const saltRounds = 3; // Higher rounds = slower, more secure
    const hash = await bcrypt.hash(password, saltRounds);
    return hash;
}
async function verifyPassword(input, matchValue) {
    const match = await bcrypt.compare(input, matchValue);
    console.log(input+" "+matchValue+ " "+match)
    return match;
}
// cloned from save lib; when save lib is loaded I get port violations 
function actuallyWriteToDisk(fileName, jsonData){
    jsonString = JSON.stringify(jsonData,null,2), err => { 
        // Checking for errors 
        if (err) {
            console.log('error with jsonification of '+fileName+' '+err)
            throw err;
        }  
    }
    try {
        fs.writeFileSync(fileName, jsonString, (err) => {
            if (err) throw err;
        });
        checkedData = loadJson(fileName);
        checkedString = JSON.stringify(checkedData,null,2), err => { 
            // Checking for errors 
            if (err) {
                console.log('error 2 with jsonification of '+fileName+' '+err)
                throw err;
            }  
        }
        if ( checkedString === jsonString ){
            console.log('checked data match')
        } else {
            console.log('checked data did not match')
        }
    } catch (err){
        console.log('save failed. '+err)
    }
    console.log(fileName+" saved!");
}