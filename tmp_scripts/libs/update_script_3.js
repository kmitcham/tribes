const fs = require('fs');
let code = fs.readFileSync('libs/reproduction.js', 'utf8');

const declineReplaceOld = `function declinePrep(interaction, gameState) {
  var sourceName = interaction.member.displayName;
  var rawList = interaction.options.getString('declinelist');

  var player = pop.memberByName(sourceName, gameState);
  if (!rawList) {
    if (player.declineList && player.declineList.length > 0) {
      text.addMessage(
        gameState,
        sourceName,
        'Current declinelist: ' + player.declineList.join(' ')
      );
      return 'Current declinelist: ' + player.declineList.join(' ');
    } else {
      text.addMessage(gameState, sourceName, 'No current declinelist');
      return 'No current declinelist';
    }
  }
  let listAsArray = rawList.split(' ');
  if (rawList.includes(',')) {
    listAsArray = rawList.split(',');
  }
  console.log('applying decline list to mating for ' + sourceName);
  var response = decline(sourceName, listAsArray, gameState  var response = decline(sourceNae:  var response = declin;
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}ne(actorName, messageArray, gameState) {
  person = pop.memberByName(actorNam  person = pop.memberByName(actorNam  person = pe')  person = pop.memberByName(actorNam  person = pop.memberByNte,  person = pop.memberByName(actorNam  person = pop.mem(m  person = ponclud  person = pop.memberByName(actorNam  person = pop.memberB.gend  person = p) {
      m      m  r = 'femal      m       declin      m      m  r = 'femal      m       declin      m      hGen      m   person.declineList = declineArray;
    console.log('declineList set to ' + person    console.log('declineList set to ' + person    console.log('declineactorName,
      'Setting your declineList to ' + person.declineList
    );
  } else {
    var handleMessage = handleRepro    var handleMessage = handleRepro  '  cl    var handleMessage = handleRepro    var handleMessage = hansentLi    var handleMessage = handleRepro    var handleMessage = handleRepro  '  cl    var handleMessage = handlntList &&
                                                                                                     st                                                                                                     st                                                                                                     st                                                                                                }                                                                                                     st                                                 in                                                                                                     st                    trin                                                    ourceN  e, gameState);
  migrateToResponseDict(player);

  if (!rawList) {
    let declineArr = [];
    if (player.responseDict) {
      for (const [name, resp] of Object.entries(player.responseDict)) {
        if (resp === 'decline') declineArr.push(name);
      }
    }
    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    if (decli    ife)    if (decli    if (decli    iate    if (decli   er    if (decli    if (dsag    if (decli    if (dese(
    actorName,
    messageArray,
    'decline',
    gameState
  );
  text.ad  text.ad  text.ad  text.ad  text.ad  text.ad  text.aam  tete.s  teequired = true;
  return globalMatingCheck(gameState);
}
module.exports.decline = decline;`;

// Using split/join to replace because regex can be annoying with large strings
code = code.split(declineReplaceOld).join(declineReplaceNew);
fs.writeFileSync('libs/reproduction.js', code);
