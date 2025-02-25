const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const huntlib = require("../../libs/hunt.js")
const text = require("../../libs/textprocess.js")
const dice = require("../../libs/dice.js")
const locations = require("../../libs/locations.json")

module.exports = {
	data: new SlashCommandBuilder()
		.setName('scout')
		.setDescription('Show the resources of an environment, defaulting to the current one.')
        .addStringOption(option => 
            option
            .setName('location')
            .setDescription('one of (veldt,forest,marsh,hills)')
            .addChoices(
                { name: 'veldt', value: 'veldt' },
                { name: 'forest', value: 'forest' },
                { name: 'marsh', value: 'marsh' },
                { name: 'hills', value: 'hills' },
            )
            .setRequired(false))
        .addStringOption(option => 
            option
            .setName('nerd')
            .setDescription('precise avg results, of all possible rolls, or many actual rolls')
            .addChoices(
                { name: 'all', value: 'all' },
                { name: 'actual', value: 'actual' },
            )
            .setRequired(false)
        ),
    async execute(interaction, gameState) {
        onCommand(interaction, gameState)
	},
};

function onCommand(interaction, gameState){
    targetLocation = gameState.locationName;
    var displayName = interaction.user.displayName;
    var nerdOption = interaction.options.getString('nerd');
    var selectedLocation = interaction.options.getString('location');
    if (selectedLocation){
        targetLocation = selectedLocation;
        if (targetLocation.toLowerCase().startsWith('v')){
            targetLocation = 'veldt'
        } else if (targetLocation.toLowerCase().startsWith('f')){
            targetLocation = 'forest'
        } else if (targetLocation.toLowerCase().startsWith('m')){
            targetLocation = 'marsh'
        } else if (targetLocation.toLowerCase().startsWith('h')){
            targetLocation = 'hills'
        } else {
            text.addMessage(gameState, displayName,"No such location as "+targetLocation+" Legal locations: veldt,forest,marsh,hills" )
            return
        }
    }
    console.log("scouting.  location:"+targetLocation+" nerdOption:"+nerdOption)

    response = huntlib.getScoutMessage(targetLocation, gameState)
    if (nerdOption){
        gameTrackValue = gameState.gameTrack[targetLocation];
        response += getNerdData(gameTrackValue, nerdOption)
    }
    text.addMessage(gameState, displayName, response )
    return 
}



function getNerdData(gameTrackValue, nerdOption){
    var gameTrack=0
    if (gameTrackValue){
        gameTrack= Number(gameTrackValue)
    }
    GATHER = 0
    GATHER_STRONG = 1
    GRAIN = 2
    GRAIN_STRONG = 3
    HUNT = 4
    SPEAR = 5
    var totals = {
        'veldt':[0,0,0,0,0,0,0],
        'hills':[0,0,0,0,0,0,0],
        'marsh':[0,0,0,0,0,0,0],
        'forest':[0,0,0,0,0,0,0]
    }
    for (var i =1; i <= 6; i++){
        for (var j =1; j <= 6; j++){
            for (var k =1; k <= 6; k++){
                droll = i+j+k
                if (droll > huntlib.locationDecay[gameTrack]){
                    droll = huntlib.locationDecay[gameTrack]						
                }
                for (locationName in totals){
                    locationData = locations[locationName]
                    data = gatherDataFor(locationName, droll)
                    totals[locationName][GATHER]+= data[1]
                    totals[locationName][GRAIN]+= data[2]
                    totals[locationName][HUNT]+= huntlib.huntDataFor(locationData['hunt'], droll)[1]
                    sval = droll
                    if (droll >= 9){	sval = droll+3 }
                    totals[locationName][SPEAR]+= huntlib.huntDataFor(locationData['hunt'], sval)[1]
                    dataStrong = gatherDataFor(locationName, droll+1)
                    totals[locationName][GATHER_STRONG]+= dataStrong[1]
                    totals[locationName][GRAIN_STRONG]+= dataStrong[2]
                }
            }
        }
    }
    response = "";
    if (nerdOption === 'all'){
        response = '216 totals:'
        for (locationName in totals){
            response += '\n'+locationName+' food:'+totals[locationName][GATHER]
                + '\tgrain:'+totals[locationName][GRAIN]
                + '\tstrongfoof:'+totals[locationName][GATHER_STRONG] 
                + '\tstrongg:'+totals[locationName][GRAIN_STRONG] 
                + '\thunt:'+totals[locationName][HUNT]
                + '\tspear:'+totals[locationName][SPEAR]
        }
    } else {
        MAX = 6000
        for (var i = 0; i < MAX; i++){
            val = dice.roll(3)
            if (val > huntlib.locationDecay[gameTrack]){
                val = huntlib.locationDecay[gameTrack]						
            }
            for (locationName in totals){
                locationData = locations[locationName]
                data = gatherDataFor(locationName, val)
                totals[locationName][GATHER]+= data[1]
                totals[locationName][GRAIN]+= data[2]
                totals[locationName][HUNT]+= huntlib.huntDataFor(locationData['hunt'], val)[1]
                sval = val
                if (val >= 9){	sval = val+3 }
                foo = huntlib.huntDataFor(locationData['hunt'], sval)
                totals[locationName][SPEAR]+= foo[1]
                dataStrong = gatherDataFor(locationName, val+1)
                totals[locationName][GATHER_STRONG]+= dataStrong[1]
                totals[locationName][GRAIN_STRONG]+= dataStrong[2]
            }
        }
        response = MAX+'x Random avg:'
        for (locationName in totals){
            response += '\n'+locationName+'food:'+Math.round(10*totals[locationName][GATHER]/MAX)
                                        +'\tgrain:'+Math.round(10*totals[locationName][GRAIN]/MAX)
                                        +'\tsf:'  +Math.round(10*totals[locationName][GATHER_STRONG]/MAX)
                                        +'\tsg:'  +Math.round(10*totals[locationName][GRAIN_STRONG]/MAX)
                                        +'\thunt:'+Math.round(10* totals[locationName][HUNT]/MAX)
                                        +'\tspear:'+Math.round(10* totals[locationName][SPEAR]/MAX)
        }
    }
    return response
}
// helper function for the nerdOption function
function gatherDataFor(locationName, roll){
    resourceData = locations[locationName]['gather']
    maxRoll = resourceData[resourceData.length-1][0]
    minRoll = resourceData[0][0]
    if (roll > maxRoll){
        roll = maxRoll
    }
    if (roll < minRoll){
        roll = minRoll
    }
    for (var i=0; i < resourceData.length; i++){
        if (resourceData[i][0] == roll){
            return resourceData[i]
        }
    }
    console.log('error looking up resourceData for '+locationName+' '+type+' '+roll)
}